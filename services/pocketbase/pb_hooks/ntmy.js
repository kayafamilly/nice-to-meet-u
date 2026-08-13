var domain = require(__hooks + "/domain.js");
var SESSION_CAPACITY = 4, MIN_PARTICIPANTS = 2, MAX_ACTIVE_RESERVATIONS = 3, SESSION_MINUTES = 30;
var NO_SHOW_LIMIT = 3, NO_SHOW_WINDOW_DAYS = 30, SUSPENSION_DAYS = 7, MIN_VALID_ATTENDANCE_MINUTES = 20, WEBHOOK_PROCESSING_LEASE_SECONDS = 120;
var VERIFIED_SESSION_METRICS_RECORD_ID = "nmtumetric00001";

function parseRequestBody(e, definition) { var data = new DynamicModel(definition); e.bindBody(data); return data; }
function requiredText(value, label, max) { var text = String(value || "").trim(); if (!text || (max && text.length > max)) throw new BadRequestError("Invalid " + label); return text; }
function optionalText(value, max) { var text = String(value || "").trim(); if (text.length > max) throw new BadRequestError("Text is too long"); return text; }
function parseFutureDate(value) { var date = new Date(String(value || "")), now = new Date(); if (isNaN(date.getTime()) || date.getTime() < Date.now() + 7200000) throw new BadRequestError("Sessions must be scheduled at least two hours ahead"); if (date.getUTCFullYear() !== now.getUTCFullYear()) throw new BadRequestError("Sessions must be scheduled in the current calendar year"); if (date.getUTCMinutes() % 15 !== 0 || date.getUTCSeconds() !== 0 || date.getUTCMilliseconds() !== 0) throw new BadRequestError("Sessions must start on a 15-minute boundary"); return date; }
// PocketBase date fields are stored and compared in its canonical UTC form
// (`YYYY-MM-DD HH:mm:ss.SSSZ`), not JavaScript's ISO `T` separator.
function dateValue(date) { return date.toISOString().replace("T", " "); }
function findAllRecordsByFilter(app, collection, filter, sort, params) {
  var records = [], offset = 0, pageSize = 500;
  while (true) {
    var page = app.findRecordsByFilter(collection, filter, sort, pageSize, offset, params || {});
    records = records.concat(page);
    if (page.length < pageSize) return records;
    offset += page.length;
  }
}
function audit(app, actor, action, entityType, entityId, metadata) { var record = new Record(app.findCollectionByNameOrId("audit_logs")); record.set("actor", actor || ""); record.set("action", action); record.set("entity_type", entityType); record.set("entity_id", entityId); record.set("metadata", metadata || {}); app.save(record); }
function profileFor(app, userId) { return app.findFirstRecordByFilter("user_profiles", "user = {:user}", { user: userId }); }
function languageFor(app, languageId) { var language = app.findRecordById("languages", languageId); if (!language.getBool("is_active")) throw new BadRequestError("Language is unavailable"); return language; }
function relationExists(app, userId, languageId, nativeOnly) { var filter = "user = {:user} && language = {:language}"; if (nativeOnly) filter += " && is_native = true"; try { app.findFirstRecordByFilter("user_languages", filter, { user: userId, language: languageId }); return true; } catch (_) { return false; } }
// Participant types are descriptive only. They never reserve capacity or gate access.
function roleFor(app, userId, languageId) { if (relationExists(app, userId, languageId, true)) return "native"; languageFor(app, languageId); return "practice"; }
function activeReservationsFor(app, userId) { var active = []; app.findRecordsByFilter("session_participants", "user = {:user} && reservation_status = 'reserved'", "id", 100, 0, { user: userId }).forEach(function (participant) { var session = app.findRecordById("sessions", participant.getString("session")); if (session.getString("status") === "scheduled" && new Date(session.getString("starts_at")).getTime() > Date.now()) active.push({ participant: participant, session: session }); }); return active; }
function scheduledReservationsFor(app, userId) { var active = []; app.findRecordsByFilter("session_participants", "user = {:user} && reservation_status = 'reserved'", "id", 100, 0, { user: userId }).forEach(function (participant) { var session = app.findRecordById("sessions", participant.getString("session")); if (session.getString("status") === "scheduled") active.push({ participant: participant, session: session }); }); return active; }
function activeReservationCount(app, userId) { return activeReservationsFor(app, userId).length; }
function reservationUsage(app, userId) {
  var active = activeReservationCount(app, userId);
  return { active: active, limit: MAX_ACTIVE_RESERVATIONS, remaining: Math.max(0, MAX_ACTIVE_RESERVATIONS - active) };
}
function assertNoScheduleConflict(app, userId, startsAt, endsAt, excludeSessionId) {
  var start = new Date(startsAt).getTime(), end = new Date(endsAt).getTime();
  scheduledReservationsFor(app, userId).forEach(function (entry) {
    if (excludeSessionId && entry.session.id === excludeSessionId) return;
    var existingStart = new Date(entry.session.getString("starts_at")).getTime(), existingEnd = new Date(entry.session.getString("ends_at")).getTime();
    if (domain.rangesOverlap(start, end, existingStart, existingEnd)) throw new ApiError(409, "This session overlaps another reservation");
  });
}
function assertReservationLimit(app, userId) { if (activeReservationCount(app, userId) >= MAX_ACTIVE_RESERVATIONS) throw new ApiError(409, "You can hold up to three upcoming registrations at the same time"); }
function assertActiveProfile(profile) { if (profile.getString("status") !== "active" || !profile.getBool("onboarding_complete")) throw new ForbiddenError("Complete onboarding before reserving a session"); var suspendedUntil = profile.getString("no_show_suspended_until"); if (suspendedUntil && new Date(suspendedUntil).getTime() > Date.now()) throw new ForbiddenError("Reservations are temporarily suspended"); }
function activeParticipants(app, sessionId) { return app.findRecordsByFilter("session_participants", "session = {:session} && reservation_status = 'reserved'", "id", 10, 0, { session: sessionId }); }
function participantCounts(app, sessionId) { var participants = activeParticipants(app, sessionId), result = { all: participants, native: 0, practice: 0 }; participants.forEach(function (participant) { if (participant.getString("role") === "native") result.native += 1; if (participant.getString("role") === "practice") result.practice += 1; }); return result; }
function assertCapacity(app, sessionId) { var counts = participantCounts(app, sessionId); if (counts.all.length >= SESSION_CAPACITY) throw new ApiError(409, "This session is full"); }
function reservationLocksFor(app, userId) {
  var active = [], now = Date.now();
  app.findRecordsByFilter("active_reservation_locks", "user = {:user}", "slot", 3, 0, { user: userId }).forEach(function (lock) {
    try {
      var participant = app.findRecordById("session_participants", lock.getString("participant"));
      var session = app.findRecordById("sessions", participant.getString("session"));
      if (participant.getString("reservation_status") === "reserved" && session.getString("status") === "scheduled" && new Date(session.getString("starts_at")).getTime() > now) {
        active.push(lock);
        return;
      }
    } catch (_) {}
    app.delete(lock);
  });
  return active;
}
function acquireReservationLock(app, userId, participant) { var locks = reservationLocksFor(app, userId); if (locks.length >= MAX_ACTIVE_RESERVATIONS) throw new ApiError(409, "You can hold up to three upcoming registrations at the same time"); var occupied = {}; locks.forEach(function (lock) { occupied[lock.getInt("slot")] = true; }); for (var slot = 1; slot <= MAX_ACTIVE_RESERVATIONS; slot += 1) { if (occupied[slot]) continue; var lock = new Record(app.findCollectionByNameOrId("active_reservation_locks")); lock.set("user", userId); lock.set("participant", participant.id); lock.set("slot", slot); try { app.save(lock); return; } catch (_) {} } throw new ApiError(409, "You can hold up to three upcoming registrations at the same time"); }
function releaseReservationLock(app, participantId) { try { app.delete(app.findFirstRecordByFilter("active_reservation_locks", "participant = {:participant}", { participant: participantId })); } catch (_) {} }
function viewerReservationFor(app, sessionId, userId) { if (!userId) return null; try { return app.findFirstRecordByFilter("session_participants", "session = {:session} && user = {:user}", { session: sessionId, user: userId }); } catch (_) { return null; } }
function joinState(session, counts) {
  return domain.sessionJoinState({
    status: session.getString("status"),
    participantCount: counts.all.length,
    startsAt: session.getString("starts_at"),
    endsAt: session.getString("ends_at"),
    now: Date.now()
  });
}
function reservationEligibility(app, session, viewerId, reservation, role, activeCount, counts) {
  if (!viewerId) return { canReserve: false, role: role, reason: "closed" };
  if (reservation && reservation.getString("reservation_status") === "reserved") return { canReserve: false, role: reservation.getString("role"), reason: "already_reserved" };
  if (session.getString("status") !== "scheduled" || new Date(session.getString("starts_at")).getTime() <= Date.now()) return { canReserve: false, role: role, reason: "closed" };
  var profile = profileFor(app, viewerId), suspendedUntil = profile.getString("no_show_suspended_until");
  if (suspendedUntil && new Date(suspendedUntil).getTime() > Date.now()) return { canReserve: false, role: role, reason: "suspended" };
  if (counts.all.length >= SESSION_CAPACITY) return { canReserve: false, role: role, reason: "session_full" };
  if (activeCount >= MAX_ACTIVE_RESERVATIONS) return { canReserve: false, role: role, reason: "reservation_limit" };
  try { assertNoScheduleConflict(app, viewerId, session.getString("starts_at"), session.getString("ends_at"), session.id); } catch (_) { return { canReserve: false, role: role, reason: "schedule_conflict" }; }
  return { canReserve: true, role: role, reason: null };
}
function previewParticipants(app, session, viewerReservation) {
  var viewerStatus = viewerReservation ? viewerReservation.getString("reservation_status") : "";
  if (session.getString("status") === "completed" && ["attended", "no_show"].indexOf(viewerStatus) !== -1) {
    return app.findRecordsByFilter("session_participants", "session = {:session} && (reservation_status = 'attended' || reservation_status = 'no_show')", "role,id", 10, 0, { session: session.id });
  }
  return activeParticipants(app, session.id);
}
function countsForParticipants(participants) { var result = { all: participants, native: 0, practice: 0 }; participants.forEach(function (participant) { if (participant.getString("role") === "native") result.native += 1; if (participant.getString("role") === "practice") result.practice += 1; }); return result; }
function participantPreviews(app, session, viewerId, viewerReservation, participants) {
  var roleSlots = { native: 0, practice: 0 }, viewerStatus = viewerReservation ? viewerReservation.getString("reservation_status") : "", canReport = ["reserved", "attended", "no_show"].indexOf(viewerStatus) !== -1;
  return participants.map(function (participant) {
    var role = participant.getString("role"), user = app.findRecordById("users", participant.getString("user")), displayName = user.getString("display_name") || "Member";
    roleSlots[role] += 1;
    return { displayName: displayName, initials: displayName.split(/\s+/).slice(0, 2).map(function (part) { return part.charAt(0).toUpperCase(); }).join(""), role: role, slot: roleSlots[role], isHost: participant.getString("user") === session.getString("host"), isViewer: participant.getString("user") === viewerId, reportParticipantId: canReport && participant.getString("user") !== viewerId ? participant.id : null };
  });
}
function sessionDto(app, session, viewerId, viewerActiveReservationCount) {
  var activeCounts = participantCounts(app, session.id), language = app.findRecordById("languages", session.getString("language")), reservation = viewerReservationFor(app, session.id, viewerId), visibleParticipants = previewParticipants(app, session, reservation), displayCounts = countsForParticipants(visibleParticipants), activeCount = viewerActiveReservationCount === undefined && viewerId ? activeReservationCount(app, viewerId) : viewerActiveReservationCount, role = viewerId ? roleFor(app, viewerId, language.id) : null;
  var isHost = Boolean(viewerId && session.getString("host") === viewerId);
  return { id: session.id, languageId: language.id, languageName: language.getString("name"), startsAt: session.getString("starts_at"), endsAt: session.getString("ends_at"), note: session.getString("description") || session.getString("topic") || "", status: session.getString("status"), isUpcoming: session.getString("status") === "scheduled" && new Date(session.getString("starts_at")).getTime() > Date.now(), participantCount: displayCounts.all.length, nativeCount: displayCounts.native, practiceCount: displayCounts.practice, capacity: SESSION_CAPACITY, minimumParticipants: MIN_PARTICIPANTS, isHost: isHost, hostCanCancel: isHost && activeCounts.all.length === 1, viewerReservationStatus: reservation ? reservation.getString("reservation_status") : null, viewerRole: reservation ? reservation.getString("role") : null, viewerActiveReservationCount: activeCount || 0, viewerEligibility: reservationEligibility(app, session, viewerId, reservation, role, activeCount || 0, activeCounts), joinState: joinState(session, activeCounts), joinOpensAt: new Date(new Date(session.getString("starts_at")).getTime() - 10 * 60000).toISOString(), participants: participantPreviews(app, session, viewerId, reservation, visibleParticipants) };
}
function createParticipant(app, sessionId, userId, role) { assertCapacity(app, sessionId); var participant = new Record(app.findCollectionByNameOrId("session_participants")); participant.set("session", sessionId); participant.set("user", userId); participant.set("role", role); participant.set("reservation_status", "reserved"); app.save(participant); acquireReservationLock(app, userId, participant); return participant; }
function hasViableSessionGroup(app, sessionId) { return domain.hasViableGroup(participantCounts(app, sessionId).all.length); }
function languageDto(language) { return { id: language.id, code: language.getString("code"), name: language.getString("name"), upcomingSessionCount: 0, nextSessionStartsAt: null }; }
function userLanguageFor(app, userId, native) { var records = app.findRecordsByFilter("user_languages", "user = {:user} && is_native = {:native}", "position,id", 1, 0, { user: userId, native: native }); if (!records.length) throw new Error("User language not found"); return records[0]; }
function languageIdsFrom(data, arrayKey, legacyKey, label) { var values = Array.isArray(data[arrayKey]) && data[arrayKey].length ? data[arrayKey] : (data[legacyKey] ? [data[legacyKey]] : []), ids = [], seen = {}; values.forEach(function (value) { var id = requiredText(value, label, 30); if (seen[id]) throw new BadRequestError("Duplicate " + label); seen[id] = true; ids.push(id); }); if (!ids.length || ids.length > 3) throw new BadRequestError("Choose between one and three " + label + "s"); return ids; }
function practiceLanguagesFrom(data) { var values = Array.isArray(data.practiceLanguages) && data.practiceLanguages.length ? data.practiceLanguages : (data.targetLanguageId ? [{ languageId: data.targetLanguageId, level: data.targetLevel }] : []), entries = [], seen = {}; values.forEach(function (value) { var languageId = requiredText(value && value.languageId, "practice language", 30), level = requiredText(value && value.level, "practice level", 20); if (["beginner", "intermediate", "advanced"].indexOf(level) === -1 || seen[languageId]) throw new BadRequestError("Invalid practice languages"); seen[languageId] = true; entries.push({ languageId: languageId, level: level }); }); if (!entries.length || entries.length > 3) throw new BadRequestError("Choose between one and three practice languages"); return entries; }
function assertDistinctLanguageProfile(nativeLanguageIds, practiceLanguages) { var nativeIds = {}; nativeLanguageIds.forEach(function (id) { nativeIds[id] = true; }); practiceLanguages.forEach(function (entry) { if (nativeIds[entry.languageId]) throw new BadRequestError("A language cannot be both native and practice"); }); }
function languageLinksFor(app, userId, native) { return app.findRecordsByFilter("user_languages", "user = {:user} && is_native = {:native}", "position,id", 3, 0, { user: userId, native: native }); }
function replacePracticeLanguages(app, userId, practiceLanguages) { app.findRecordsByFilter("user_languages", "user = {:user} && is_native = false", "id", 10, 0, { user: userId }).forEach(function (record) { app.delete(record); }); practiceLanguages.forEach(function (entry, index) { languageFor(app, entry.languageId); var practiceLanguage = new Record(app.findCollectionByNameOrId("user_languages")); practiceLanguage.set("user", userId); practiceLanguage.set("language", entry.languageId); practiceLanguage.set("level", entry.level); practiceLanguage.set("is_native", false); practiceLanguage.set("position", index + 1); app.save(practiceLanguage); }); }
function notificationFor(app, userId, kind, dedupKey, title, body, url, deliverAfter) {
  try { return app.findFirstRecordByFilter("notifications", "user = {:user} && dedup_key = {:dedupKey}", { user: userId, dedupKey: dedupKey }); } catch (_) {}
  var notification = new Record(app.findCollectionByNameOrId("notifications"));
  notification.set("user", userId); notification.set("kind", kind); notification.set("dedup_key", dedupKey);
  notification.set("title", title); notification.set("body", body); notification.set("url", url || "/app/sessions");
  notification.set("payload", { url: url || "/app/sessions" }); notification.set("created_at", dateValue(new Date())); notification.set("deliver_after", dateValue(deliverAfter || new Date()));
  notification.set("delivery_status", "pending"); notification.set("delivery_attempts", 0); notification.set("last_delivery_error", "");
  app.save(notification); return notification;
}
function confirmedAttendanceCount(app, sessionId) {
  return app.findRecordsByFilter(
    "session_participants",
    "session = {:session} && reservation_status = 'attended'",
    "id",
    MIN_PARTICIPANTS,
    0,
    { session: sessionId }
  ).length;
}
function hasMinimumConfirmedAttendance(app, sessionId) {
  return domain.hasMinimumConfirmedAttendance(confirmedAttendanceCount(app, sessionId));
}
function incrementVerifiedCompletedSessionCount(app) {
  var metrics = app.findRecordById("public_metrics", VERIFIED_SESSION_METRICS_RECORD_ID);
  metrics.set("verified_completed_session_count", metrics.getInt("verified_completed_session_count") + 1);
  app.save(metrics);
}
function notifySessionFull(app, session) {
  var participants = activeParticipants(app, session.id);
  var count = participants.length;
  if (count !== MIN_PARTICIPANTS && count !== SESSION_CAPACITY) return;
  var ready = count === MIN_PARTICIPANTS;
  var compositionKey = participants.map(function (participant) { return participant.id; }).sort().join("-");
  participants.forEach(function (participant) {
    notificationFor(app, participant.getString("user"), ready ? "session_ready" : "session_full", (ready ? "session-ready:" : "session-full:") + session.id + ":" + compositionKey, ready ? "Your group is ready" : "Your session is full", "Your " + app.findRecordById("languages", session.getString("language")).getString("name") + " session now has " + count + " members.", "/app/sessions/" + session.id, new Date());
  });
}
function cancelScheduledSession(app, session, title, body, dedupPrefix, now) {
  var cancelledParticipants = 0, cancelledAt = now || new Date();
  if (session.getString("status") !== "scheduled") return cancelledParticipants;
  session.set("status", "cancelled");
  app.save(session);
  app.findRecordsByFilter("session_participants", "session = {:session} && reservation_status = 'reserved'", "id", 20, 0, { session: session.id }).forEach(function (participant) {
    participant.set("reservation_status", "cancelled");
    participant.set("cancelled_at", dateValue(cancelledAt));
    participant.set("absence_marked_at", "");
    participant.set("absence_reason", "");
    app.save(participant);
    releaseReservationLock(app, participant.id);
    notificationFor(app, participant.getString("user"), "reservation_cancelled", dedupPrefix + ":" + session.id + ":" + participant.getString("user"), title, body, "/app/sessions/" + session.id, cancelledAt);
    cancelledParticipants += 1;
  });
  return cancelledParticipants;
}
function notificationDto(notification) { return { id: notification.id, kind: notification.getString("kind"), title: notification.getString("title"), body: notification.getString("body"), url: notification.getString("url") || "/app/sessions", createdAt: notification.getString("created_at") || notification.getString("deliver_after") || notification.getString("sent_at") || null, readAt: notification.getString("read_at") || null }; }
function hasAttendanceEvidenceForWebhook(app, webhookEventId) { try { app.findFirstRecordByFilter("attendance_evidence", "webhook_event = {:webhookEvent}", { webhookEvent: webhookEventId }); return true; } catch (_) { return false; } }
function addAttendanceEvidence(app, participant, eventType, payload, webhookEventId, observedAt) { var evidence = new Record(app.findCollectionByNameOrId("attendance_evidence")); evidence.set("participant", participant.id); evidence.set("webhook_event", webhookEventId); evidence.set("source", "livekit_webhook"); evidence.set("event_type", eventType); evidence.set("observed_at", dateValue(observedAt)); evidence.set("metadata", payload || {}); app.save(evidence); }
function hasValidatedAttendance(app, session, participant) { var evidence = [], offset = 0, pageSize = 100; while (true) { var page = app.findRecordsByFilter("attendance_evidence", "participant = {:participant} && source = 'livekit_webhook'", "observed_at,id", pageSize, offset, { participant: participant.id }); evidence = evidence.concat(page); if (page.length < pageSize) break; offset += page.length; } return domain.hasValidatedAttendanceFromEvents({ startsAt: session.getString("starts_at"), endsAt: session.getString("ends_at"), minimumMinutes: MIN_VALID_ATTENDANCE_MINUTES, events: evidence.map(function (record) { return { eventType: record.getString("event_type"), observedAt: record.getString("observed_at") }; }) }); }
function suspendForNoShows(app, userId) { var cutoff = new Date(Date.now() - NO_SHOW_WINDOW_DAYS * 86400000), noShows = app.findRecordsByFilter("session_participants", "user = {:user} && reservation_status = 'no_show' && absence_marked_at >= {:cutoff}", "-absence_marked_at", 100, 0, { user: userId, cutoff: dateValue(cutoff) }); if (noShows.length >= NO_SHOW_LIMIT) { var profile = profileFor(app, userId); profile.set("no_show_suspended_until", dateValue(new Date(Date.now() + SUSPENSION_DAYS * 86400000))); app.save(profile); audit(app, userId, "reservation_suspended", "user", userId, { noShows: noShows.length }); } }
function recalculateSuspension(app, userId) { var cutoff = new Date(Date.now() - NO_SHOW_WINDOW_DAYS * 86400000), noShows = app.findRecordsByFilter("session_participants", "user = {:user} && reservation_status = 'no_show' && absence_marked_at >= {:cutoff}", "-absence_marked_at", 100, 0, { user: userId, cutoff: dateValue(cutoff) }); if (noShows.length < NO_SHOW_LIMIT) { var profile = profileFor(app, userId); profile.set("no_show_suspended_until", ""); app.save(profile); } }
function internalWebhookOnly(e) { var expected = $os.getenv("POCKETBASE_INTERNAL_WEBHOOK_SECRET"); if (!expected || e.request.header.get("X-Internal-Webhook-Secret") !== expected) throw new ForbiddenError("Internal endpoint only"); return e.next(); }
function liveKitObservedAt(payload) { var seconds = Number(payload.createdAt || payload.created_at), date = new Date(seconds * 1000); return seconds > 0 && !isNaN(date.getTime()) ? date : new Date(); }
function newWebhookProcessingAttempt() { return $security.randomStringWithAlphabet(24, "abcdefghijklmnopqrstuvwxyz0123456789"); }
function processLiveKitEvent(app, payload, webhookEventId) {
  var eventType = String(payload.event || payload.eventType || ""), participantData = payload.participant || {}, participantId = String(participantData.identity || "");
  if (!participantId || ["participant_joined", "participant_left"].indexOf(eventType) === -1 || hasAttendanceEvidenceForWebhook(app, webhookEventId)) return;
  var observedAt = liveKitObservedAt(payload), participant = app.findRecordById("session_participants", participantId), session = app.findRecordById("sessions", participant.getString("session")), room = payload.room || {};
  if (!room.name || room.name !== session.getString("room_name")) throw new ForbiddenError("LiveKit event does not match the participant session");
  // Delayed events for cancelled access are valid provider traffic, but they
  // must never recreate attendance state after the reservation was revoked.
  if (participant.getString("reservation_status") !== "reserved" || session.getString("status") !== "scheduled") return;
  if (eventType === "participant_joined" && !participant.getString("joined_at")) participant.set("joined_at", dateValue(observedAt));
  if (eventType === "participant_left") participant.set("left_at", dateValue(observedAt));
  app.save(participant);
  addAttendanceEvidence(app, participant, eventType, { room: room, participant: participantData }, webhookEventId, observedAt);
}
function isWebhookProcessingLeaseExpired(webhook) { return domain.isProcessingLeaseExpired(webhook.getString("processing_started_at") || webhook.getString("updated"), Date.now(), WEBHOOK_PROCESSING_LEASE_SECONDS); }

module.exports = { domain: domain, SESSION_CAPACITY: SESSION_CAPACITY, MIN_PARTICIPANTS: MIN_PARTICIPANTS, MAX_ACTIVE_RESERVATIONS: MAX_ACTIVE_RESERVATIONS, SESSION_MINUTES: SESSION_MINUTES, MIN_VALID_ATTENDANCE_MINUTES: MIN_VALID_ATTENDANCE_MINUTES, WEBHOOK_PROCESSING_LEASE_SECONDS: WEBHOOK_PROCESSING_LEASE_SECONDS, VERIFIED_SESSION_METRICS_RECORD_ID: VERIFIED_SESSION_METRICS_RECORD_ID, parseRequestBody: parseRequestBody, requiredText: requiredText, optionalText: optionalText, parseFutureDate: parseFutureDate, dateValue: dateValue, findAllRecordsByFilter: findAllRecordsByFilter, audit: audit, profileFor: profileFor, languageFor: languageFor, roleFor: roleFor, reservationUsage: reservationUsage, activeReservationsFor: activeReservationsFor, assertNoScheduleConflict: assertNoScheduleConflict, activeReservationCount: activeReservationCount, assertReservationLimit: assertReservationLimit, assertActiveProfile: assertActiveProfile, activeParticipants: activeParticipants, assertCapacity: assertCapacity, acquireReservationLock: acquireReservationLock, releaseReservationLock: releaseReservationLock, viewerReservationFor: viewerReservationFor, sessionDto: sessionDto, createParticipant: createParticipant, hasViableSessionGroup: hasViableSessionGroup, languageDto: languageDto, userLanguageFor: userLanguageFor, languageIdsFrom: languageIdsFrom, practiceLanguagesFrom: practiceLanguagesFrom, assertDistinctLanguageProfile: assertDistinctLanguageProfile, languageLinksFor: languageLinksFor, replacePracticeLanguages: replacePracticeLanguages, notificationFor: notificationFor, notifySessionFull: notifySessionFull, cancelScheduledSession: cancelScheduledSession, notificationDto: notificationDto, confirmedAttendanceCount: confirmedAttendanceCount, hasMinimumConfirmedAttendance: hasMinimumConfirmedAttendance, incrementVerifiedCompletedSessionCount: incrementVerifiedCompletedSessionCount, hasValidatedAttendance: hasValidatedAttendance, suspendForNoShows: suspendForNoShows, recalculateSuspension: recalculateSuspension, internalWebhookOnly: internalWebhookOnly, newWebhookProcessingAttempt: newWebhookProcessingAttempt, processLiveKitEvent: processLiveKitEvent, isWebhookProcessingLeaseExpired: isWebhookProcessingLeaseExpired };
