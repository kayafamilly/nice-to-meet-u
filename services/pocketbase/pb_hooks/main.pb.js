// PocketBase JavaScript hooks run in an embedded VM. Keep this file dependency
// free and make every state-changing action transactional.

// `ntmy.js` is the only business-rule implementation. Export its helpers into
// the hook VM once so every route and cron callback uses the same rules.
var canonicalNtmy = require(__hooks + "/ntmy.js");
Object.keys(canonicalNtmy).forEach(function (key) { globalThis[key] = canonicalNtmy[key]; });

routerAdd("POST", "/api/ntmy/auth/register", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  Object.keys(ntmy).forEach(function (key) { globalThis[key] = ntmy[key]; });
  var data = ntmy.parseRequestBody(e, { displayName: "", email: "", password: "", passwordConfirm: "", isAdultConfirmed: false });
  var displayName = ntmy.requiredText(data.displayName, "display name", 40);
  var email = ntmy.requiredText(data.email, "email", 254).toLowerCase();
  var password = String(data.password || "");
  if (!data.isAdultConfirmed || password.length < 12 || password !== String(data.passwordConfirm || "")) {
    throw new BadRequestError("Invalid registration data");
  }
  $app.runInTransaction((txApp) => {
    try {
      txApp.findAuthRecordByEmail("users", email);
      throw new BadRequestError("Unable to create account");
    } catch (error) {
      if (error instanceof BadRequestError) throw error;
    }
    var user = new Record(txApp.findCollectionByNameOrId("users"));
    user.setEmail(email);
    user.setPassword(password);
    user.set("display_name", displayName);
    txApp.save(user);
    var profile = new Record(txApp.findCollectionByNameOrId("user_profiles"));
    profile.set("user", user.id);
    profile.set("time_zone", "UTC");
    profile.set("adult_confirmed", true);
    profile.set("onboarding_complete", false);
    profile.set("status", "active");
    txApp.save(profile);
    ntmy.audit(txApp, user.id, "account_registered", "user", user.id, {});
  });
  return e.json(201, { created: true });
});

routerAdd("GET", "/api/ntmy/me", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  var profile = ntmy.profileFor(e.app, e.auth.id);
  var usage = profile.getBool("onboarding_complete") ? ntmy.reservationUsage(e.app, e.auth.id) : null;
  var practiceLanguageId = null;
  try { practiceLanguageId = ntmy.userLanguageFor(e.app, e.auth.id, false).getString("language"); } catch (_) {}
  return e.json(200, {
    id: e.auth.id,
    displayName: e.auth.getString("display_name"),
    onboardingCompleted: profile.getBool("onboarding_complete"),
    reservationSuspendedUntil: profile.getString("no_show_suspended_until") || null,
    primaryPracticeLanguageId: practiceLanguageId,
    reservationUsage: usage
  });
}, $apis.requireAuth("users"));

routerAdd("GET", "/api/ntmy/languages", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  var languages = ntmy.findAllRecordsByFilter(e.app, "languages", "is_active = true", "name", {});
  var activity = {};
  ntmy.findAllRecordsByFilter(e.app, "sessions", "status = 'scheduled' && starts_at >= {:now}", "starts_at", { now: ntmy.dateValue(new Date()) }).forEach(function (session) {
    var languageId = session.getString("language");
    if (!activity[languageId]) activity[languageId] = { count: 0, next: session.getString("starts_at") };
    activity[languageId].count += 1;
  });
  return e.json(200, languages.map((language) => ({ id: language.id, code: language.getString("code"), name: language.getString("name"), upcomingSessionCount: activity[language.id] ? activity[language.id].count : 0, nextSessionStartsAt: activity[language.id] ? activity[language.id].next : null })));
}, $apis.requireAuth("users"));

routerAdd("POST", "/api/ntmy/onboarding", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  Object.keys(ntmy).forEach(function (key) { globalThis[key] = ntmy[key]; });
  var data = parseRequestBody(e, { nativeLanguageIds: [], practiceLanguages: [], nativeLanguageId: "", targetLanguageId: "", targetLevel: "", timeZone: "", communityRulesAccepted: false });
  var nativeLanguageIds = languageIdsFrom(data, "nativeLanguageIds", "nativeLanguageId", "native language");
  var practiceLanguages = practiceLanguagesFrom(data);
  var timeZone = requiredText(data.timeZone, "time zone", 64);
  if (!data.communityRulesAccepted) throw new BadRequestError("Accept the community rules before continuing");
  assertDistinctLanguageProfile(nativeLanguageIds, practiceLanguages);
  $app.runInTransaction((txApp) => {
    var profile = profileFor(txApp, e.auth.id);
    if (profile.getBool("onboarding_complete")) throw new ApiError(409, "Onboarding is already complete");
    var existing = txApp.findRecordsByFilter("user_languages", "user = {:user}", "id", 10, 0, { user: e.auth.id });
    existing.forEach((record) => txApp.delete(record));
    nativeLanguageIds.forEach(function (languageId, index) {
      languageFor(txApp, languageId);
      var nativeLanguage = new Record(txApp.findCollectionByNameOrId("user_languages"));
      nativeLanguage.set("user", e.auth.id); nativeLanguage.set("language", languageId); nativeLanguage.set("level", "native"); nativeLanguage.set("is_native", true); nativeLanguage.set("position", index + 1);
      txApp.save(nativeLanguage);
    });
    replacePracticeLanguages(txApp, e.auth.id, practiceLanguages);
    profile.set("time_zone", timeZone);
    profile.set("onboarding_complete", true);
    txApp.save(profile);
    audit(txApp, e.auth.id, "onboarding_completed", "user", e.auth.id, { nativeLanguageCount: nativeLanguageIds.length, practiceLanguageCount: practiceLanguages.length });
  });
  return e.json(200, { completed: true });
}, $apis.requireAuth("users"));

routerAdd("GET", "/api/ntmy/profile", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  var profile = ntmy.profileFor(e.app, e.auth.id);
  if (!profile.getBool("onboarding_complete") || profile.getString("status") !== "active") throw new ForbiddenError("Profile is unavailable");
  var nativeLinks = languageLinksFor(e.app, e.auth.id, true);
  var practiceLinks = languageLinksFor(e.app, e.auth.id, false);
  var nativeLanguages = nativeLinks.map(function (link) { return ntmy.languageDto(e.app.findRecordById("languages", link.getString("language"))); });
  var practiceLanguages = practiceLinks.map(function (link) { var language = ntmy.languageDto(e.app.findRecordById("languages", link.getString("language"))); language.level = link.getString("level"); return language; });
  return e.json(200, {
    id: e.auth.id,
    displayName: e.auth.getString("display_name"),
    nativeLanguages: nativeLanguages,
    practiceLanguages: practiceLanguages,
    timeZone: profile.getString("time_zone"),
    reservationSuspendedUntil: profile.getString("no_show_suspended_until") || null,
    reservationUsage: ntmy.reservationUsage(e.app, e.auth.id)
  });
}, $apis.requireAuth("users"));

routerAdd("PATCH", "/api/ntmy/profile", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  Object.keys(ntmy).forEach(function (key) { globalThis[key] = ntmy[key]; });
  var data = parseRequestBody(e, { displayName: "", practiceLanguages: [], targetLanguageId: "", targetLevel: "", timeZone: "" });
  var practiceLanguages = practiceLanguagesFrom(data);
  $app.runInTransaction((txApp) => {
    var profile = profileFor(txApp, e.auth.id);
    assertActiveProfile(profile);
    var nativeLanguageIds = languageLinksFor(txApp, e.auth.id, true).map(function (link) { return link.getString("language"); });
    assertDistinctLanguageProfile(nativeLanguageIds, practiceLanguages);
    replacePracticeLanguages(txApp, e.auth.id, practiceLanguages);
    var displayName = optionalText(data.displayName, 40);
    if (displayName && displayName.length < 2) throw new BadRequestError("Display name must contain at least two characters");
    if (displayName) { var user = txApp.findRecordById("users", e.auth.id); user.set("display_name", displayName); txApp.save(user); }
    var timeZone = optionalText(data.timeZone, 64);
    if (timeZone) { profile.set("time_zone", timeZone); txApp.save(profile); }
    // Participant roles are immutable historical reservation facts: changing a
    // profile preference must never rewrite a future reservation's role.
    audit(txApp, e.auth.id, "profile_practice_languages_updated", "user", e.auth.id, { practiceLanguageCount: practiceLanguages.length });
  });
  return e.json(200, { updated: true });
}, $apis.requireAuth("users"));

routerAdd("GET", "/api/ntmy/profile/sessions", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  Object.keys(ntmy).forEach(function (key) { globalThis[key] = ntmy[key]; });
  var now = Date.now();
  var reservations = ntmy.findAllRecordsByFilter(e.app, "session_participants", "user = {:user}", "-id", { user: e.auth.id });
  var activeCount = activeReservationCount(e.app, e.auth.id);
  var history = { upcoming: [], past: [] };
  reservations.forEach(function (participant) {
    var session = e.app.findRecordById("sessions", participant.getString("session"));
    var entry = sessionDto(e.app, session, e.auth.id, activeCount);
    entry.role = participant.getString("role");
    entry.reservationStatus = participant.getString("reservation_status");
    if (entry.reservationStatus === "reserved" && session.getString("status") === "scheduled" && new Date(session.getString("starts_at")).getTime() >= now) history.upcoming.push(entry); else history.past.push(entry);
  });
  history.upcoming.sort(function (left, right) { return new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(); });
  history.past.sort(function (left, right) { return new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime(); });
  return e.json(200, history);
}, $apis.requireAuth("users"));

routerAdd("DELETE", "/api/ntmy/profile", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  Object.keys(ntmy).forEach(function (key) { globalThis[key] = ntmy[key]; });
  $app.runInTransaction((txApp) => {
    var now = new Date();
    var profile = profileFor(txApp, e.auth.id);
    var reservations = txApp.findRecordsByFilter("session_participants", "user = {:user} && reservation_status = 'reserved'", "id", 200, 0, { user: e.auth.id });
    var hostedSessions = txApp.findRecordsByFilter("sessions", "host = {:host} && status = 'scheduled' && starts_at > {:now}", "starts_at", 100, 0, { host: e.auth.id, now: dateValue(now) });
    hostedSessions.forEach(function (session) {
      if (activeParticipants(txApp, session.id).length > 1) throw new ApiError(409, "A hosted session already has other participants");
    });
    var cancelledHostedSessions = 0, cancelledFutureReservations = 0;
    hostedSessions.forEach(function (session) {
      cancelledFutureReservations += cancelScheduledSession(txApp, session, "Session cancelled", "The host left NiceToMeetU, so this conversation has been cancelled.", "host-account-deleted", now);
      cancelledHostedSessions += 1;
    });
    reservations.forEach(function (participant) {
      var session = txApp.findRecordById("sessions", participant.getString("session"));
      if (session.getString("status") === "scheduled" && new Date(session.getString("starts_at")).getTime() > now.getTime()) {
        participant.set("reservation_status", "cancelled"); participant.set("cancelled_at", dateValue(now)); participant.set("absence_reason", ""); txApp.save(participant);
        releaseReservationLock(txApp, participant.id);
        cancelledFutureReservations += 1;
      }
    });
    txApp.findRecordsByFilter("push_subscriptions", "user = {:user}", "id", 200, 0, { user: e.auth.id }).forEach(function (subscription) { txApp.delete(subscription); });
    txApp.findRecordsByFilter("user_languages", "user = {:user}", "id", 10, 0, { user: e.auth.id }).forEach(function (language) { txApp.delete(language); });
    var user = txApp.findRecordById("users", e.auth.id);
    user.set("display_name", "Deleted member"); user.setEmail("deleted-" + user.id + "-" + Date.now() + "@invalid.local"); user.setRandomPassword(); user.refreshTokenKey(); txApp.save(user);
    profile.set("status", "deleted"); profile.set("onboarding_complete", false); profile.set("time_zone", "UTC"); profile.set("deleted_at", dateValue(now)); txApp.save(profile);
    audit(txApp, "", "account_anonymized", "user", e.auth.id, { cancelledFutureReservations: cancelledFutureReservations, cancelledHostedSessions: cancelledHostedSessions });
  });
  return e.json(200, { deleted: true });
}, $apis.requireAuth("users"));

routerAdd("GET", "/api/ntmy/sessions", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  Object.keys(ntmy).forEach(function (key) { globalThis[key] = ntmy[key]; });
  assertActiveProfile(profileFor(e.app, e.auth.id));
  var query = e.requestInfo().query || {};
  var languageId = String(query.languageId || "");
  var from = String(query.from || "");
  var to = String(query.to || "");
  var now = new Date();
  var fromDate = from ? new Date(from) : now;
  var toDate = to ? new Date(to) : null;
  if (isNaN(fromDate.getTime()) || (toDate && isNaN(toDate.getTime())) || (toDate && fromDate.getTime() > toDate.getTime())) throw new BadRequestError("Invalid session date range");
  if (fromDate.getTime() < now.getTime()) fromDate = now;
  var filter = "status = 'scheduled' && starts_at >= {:from}";
  var params = { from: dateValue(fromDate) };
  if (toDate) { filter += " && starts_at <= {:to}"; params.to = dateValue(toDate); }
  if (languageId) { languageFor(e.app, languageId); filter += " && language = {:language}"; params.language = languageId; }
  var sessions = ntmy.findAllRecordsByFilter(e.app, "sessions", filter, "starts_at", params);
  var seen = {};
  sessions.forEach(function (session) { seen[session.id] = true; });
  ntmy.activeReservationsFor(e.app, e.auth.id).forEach(function (entry) {
    if (!seen[entry.session.id]) { sessions.push(entry.session); seen[entry.session.id] = true; }
  });
  sessions.sort(function (left, right) { return new Date(left.getString("starts_at")).getTime() - new Date(right.getString("starts_at")).getTime(); });
  var activeCount = activeReservationCount(e.app, e.auth.id);
  return e.json(200, sessions.map((session) => sessionDto(e.app, session, e.auth.id, activeCount)));
}, $apis.requireAuth("users"));

routerAdd("GET", "/api/ntmy/sessions/{sessionId}", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  Object.keys(ntmy).forEach(function (key) { globalThis[key] = ntmy[key]; });
  assertActiveProfile(profileFor(e.app, e.auth.id));
  var session = e.app.findRecordById("sessions", e.request.pathValue("sessionId"));
  var reservation = viewerReservationFor(e.app, session.id, e.auth.id);
  var isUpcoming = session.getString("status") === "scheduled" && new Date(session.getString("starts_at")).getTime() > Date.now();
  if (!isUpcoming && !reservation) throw new ForbiddenError("Session not found");
  return e.json(200, sessionDto(e.app, session, e.auth.id));
}, $apis.requireAuth("users"));

routerAdd("POST", "/api/ntmy/sessions", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  Object.keys(ntmy).forEach(function (key) { globalThis[key] = ntmy[key]; });
  var data = parseRequestBody(e, { languageId: "", startsAt: "", note: "" });
  var languageId = requiredText(data.languageId, "language", 30);
  var startsAt = parseFutureDate(data.startsAt);
  var note = optionalText(data.note, 500);
  var created;
  $app.runInTransaction((txApp) => {
    var profile = profileFor(txApp, e.auth.id);
    assertActiveProfile(profile);
    languageFor(txApp, languageId);
    var role = roleFor(txApp, e.auth.id, languageId);
    assertReservationLimit(txApp, e.auth.id);
    var endsAt = new Date(startsAt.getTime() + SESSION_MINUTES * 60 * 1000);
    assertNoScheduleConflict(txApp, e.auth.id, startsAt, endsAt);
    var session = new Record(txApp.findCollectionByNameOrId("sessions"));
    session.set("language", languageId);
    session.set("host", e.auth.id);
    session.set("starts_at", dateValue(startsAt));
    session.set("ends_at", dateValue(endsAt));
    session.set("topic", "");
    session.set("description", note);
    session.set("status", "scheduled");
    // PocketBase assigns record ids on save by default. This room name must be
    // unique before the first save, so assign an ID from the allowed record-id
    // alphabet inside the transaction first.
    session.id = $security.randomStringWithAlphabet(15, "abcdefghijklmnopqrstuvwxyz0123456789");
    session.set("room_name", domain.roomNameFor(session.id));
    txApp.save(session);
    createParticipant(txApp, session.id, e.auth.id, role);
    notificationFor(txApp, e.auth.id, "reservation_confirmation", "reservation:" + session.id + ":" + e.auth.id, "Session created", "Your place is reserved.", "/app/sessions/" + session.id, new Date());
    audit(txApp, e.auth.id, "session_created", "session", session.id, { role: role });
    created = sessionDto(txApp, session, e.auth.id);
  });
  return e.json(201, created);
}, $apis.requireAuth("users"));

routerAdd("POST", "/api/ntmy/sessions/{sessionId}/reserve", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  Object.keys(ntmy).forEach(function (key) { globalThis[key] = ntmy[key]; });
  var sessionId = e.request.pathValue("sessionId");
  var response;
  $app.runInTransaction((txApp) => {
    var profile = profileFor(txApp, e.auth.id);
    assertActiveProfile(profile);
    var session = txApp.findRecordById("sessions", sessionId);
    if (session.getString("status") !== "scheduled" || new Date(session.getString("starts_at")).getTime() <= Date.now()) {
      throw new ApiError(409, "This session can no longer be reserved");
    }
    var existingParticipant = null;
    try { existingParticipant = txApp.findFirstRecordByFilter("session_participants", "session = {:session} && user = {:user}", { session: sessionId, user: e.auth.id }); } catch (_) {}
    if (existingParticipant && existingParticipant.getString("reservation_status") === "reserved") throw new ApiError(409, "You already have a reservation for this session");
    if (existingParticipant && ["cancelled", "no_show"].indexOf(existingParticipant.getString("reservation_status")) === -1) throw new ApiError(409, "This reservation cannot be reactivated");
    var role = roleFor(txApp, e.auth.id, session.getString("language"));
    assertReservationLimit(txApp, e.auth.id);
    assertNoScheduleConflict(txApp, e.auth.id, session.getString("starts_at"), session.getString("ends_at"), sessionId);
    if (existingParticipant) {
      assertCapacity(txApp, sessionId);
      existingParticipant.set("role", role);
      existingParticipant.set("reservation_status", "reserved");
      existingParticipant.set("cancelled_at", "");
      existingParticipant.set("absence_marked_at", "");
      existingParticipant.set("absence_reason", "");
      txApp.save(existingParticipant);
      acquireReservationLock(txApp, e.auth.id, existingParticipant);
      notificationFor(txApp, e.auth.id, "reservation_confirmation", "reservation-rebooked:" + sessionId + ":" + e.auth.id, "Reservation confirmed", "Your place is reserved again.", "/app/sessions/" + sessionId, new Date());
    } else {
      createParticipant(txApp, sessionId, e.auth.id, role);
      notificationFor(txApp, e.auth.id, "reservation_confirmation", "reservation:" + sessionId + ":" + e.auth.id, "Reservation confirmed", "Your place is reserved.", "/app/sessions/" + sessionId, new Date());
    }
    notifySessionFull(txApp, session);
    audit(txApp, e.auth.id, "session_reserved", "session", sessionId, { role: role });
    response = sessionDto(txApp, session, e.auth.id);
  });
  return e.json(200, response);
}, $apis.requireAuth("users"));

routerAdd("POST", "/api/ntmy/sessions/{sessionId}/cancel-reservation", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  Object.keys(ntmy).forEach(function (key) { globalThis[key] = ntmy[key]; });
  var sessionId = e.request.pathValue("sessionId");
  var result;
  $app.runInTransaction((txApp) => {
    var session = txApp.findRecordById("sessions", sessionId);
    var participant = txApp.findFirstRecordByFilter(
      "session_participants",
      "session = {:session} && user = {:user} && reservation_status = 'reserved'",
      { session: sessionId, user: e.auth.id }
    );
    if (session.getString("host") === e.auth.id) throw new BadRequestError("A host must cancel the conversation instead of only their reservation");
    if (session.getString("status") !== "scheduled" || new Date(session.getString("starts_at")).getTime() <= Date.now()) throw new ApiError(409, "This session can no longer be cancelled");
    participant.set("reservation_status", "cancelled");
    participant.set("cancelled_at", dateValue(new Date()));
    participant.set("absence_reason", "");
    result = { status: "cancelled", countedAsNoShow: false };
    txApp.save(participant);
    releaseReservationLock(txApp, participant.id);
    notificationFor(txApp, e.auth.id, "reservation_cancelled", "reservation-cancelled:" + sessionId + ":" + e.auth.id, "Reservation cancelled", "Your place has been released.", "/app/sessions", new Date());
    audit(txApp, e.auth.id, "reservation_cancelled", "session", sessionId, result);
  });
  return e.json(200, result);
}, $apis.requireAuth("users"));

routerAdd("POST", "/api/ntmy/sessions/{sessionId}/cancel", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  Object.keys(ntmy).forEach(function (key) { globalThis[key] = ntmy[key]; });
  var sessionId = e.request.pathValue("sessionId");
  var result;
  $app.runInTransaction((txApp) => {
    var session = txApp.findRecordById("sessions", sessionId);
    if (session.getString("host") !== e.auth.id) throw new ForbiddenError("Only the session host can cancel this session");
    if (session.getString("status") !== "scheduled" || new Date(session.getString("starts_at")).getTime() <= Date.now()) throw new BadRequestError("Only an upcoming scheduled session can be cancelled");
    if (activeParticipants(txApp, sessionId).length > 1) throw new ApiError(409, "A session with other participants cannot be cancelled by its host");
    var now = new Date();
    var cancelledParticipants = cancelScheduledSession(txApp, session, "Session cancelled", "The host cancelled this session.", "session-cancelled", now);
    result = { status: "cancelled", cancelledParticipants: cancelledParticipants };
    audit(txApp, e.auth.id, "session_cancelled_by_host", "session", sessionId, result);
  });
  return e.json(200, result);
}, $apis.requireAuth("users"));

routerAdd("GET", "/api/ntmy/notifications", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  var notifications = e.app.findRecordsByFilter("notifications", "user = {:user}", "-created_at,-id", 100, 0, { user: e.auth.id });
  return e.json(200, { notifications: notifications.map(ntmy.notificationDto), unreadCount: notifications.filter(function (notification) { return !notification.getString("read_at"); }).length });
}, $apis.requireAuth("users"));

routerAdd("POST", "/api/ntmy/notifications/{notificationId}/read", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  $app.runInTransaction((txApp) => {
    var notification = txApp.findRecordById("notifications", e.request.pathValue("notificationId"));
    if (notification.getString("user") !== e.auth.id) throw new ForbiddenError("Notification not found");
    if (!notification.getString("read_at")) { notification.set("read_at", ntmy.dateValue(new Date())); txApp.save(notification); }
  });
  return e.json(200, { read: true });
}, $apis.requireAuth("users"));

routerAdd("POST", "/api/ntmy/push-subscriptions", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  Object.keys(ntmy).forEach(function (key) { globalThis[key] = ntmy[key]; });
  var data = parseRequestBody(e, { endpoint: "", p256dh: "", auth: "" });
  var endpoint = requiredText(data.endpoint, "push endpoint", 2000);
  var p256dh = requiredText(data.p256dh, "push key", 512);
  var auth = requiredText(data.auth, "push auth", 512);
  $app.runInTransaction((txApp) => {
    var subscription;
    try { subscription = txApp.findFirstRecordByFilter("push_subscriptions", "endpoint = {:endpoint}", { endpoint: endpoint }); }
    catch (_) { subscription = new Record(txApp.findCollectionByNameOrId("push_subscriptions")); }
    subscription.set("user", e.auth.id); subscription.set("endpoint", endpoint); subscription.set("p256dh", p256dh); subscription.set("auth", auth); txApp.save(subscription);
  });
  return e.json(201, { subscribed: true });
}, $apis.requireAuth("users"));

routerAdd("DELETE", "/api/ntmy/push-subscriptions", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  var data = ntmy.parseRequestBody(e, { endpoint: "" });
  var endpoint = ntmy.requiredText(data.endpoint, "push endpoint", 2000);
  $app.runInTransaction((txApp) => {
    try {
      var subscription = txApp.findFirstRecordByFilter("push_subscriptions", "user = {:user} && endpoint = {:endpoint}", { user: e.auth.id, endpoint: endpoint });
      txApp.delete(subscription);
    } catch (_) {}
  });
  return e.json(200, { revoked: true });
}, $apis.requireAuth("users"));

// The worker is the only caller of these routes. It atomically claims the
// outbox before attempting network delivery, so duplicate worker processes
// cannot emit the same browser push notification.
routerAdd("POST", "/api/ntmy/internal/notifications/claim", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  var claimed = [];
  $app.runInTransaction((txApp) => {
    var now = new Date();
    var due = txApp.findRecordsByFilter("notifications", "delivery_status = 'pending' && deliver_after <= {:now}", "id", 25, 0, { now: ntmy.dateValue(now) });
    var stale = txApp.findRecordsByFilter("notifications", "delivery_status = 'processing' && deliver_after <= {:now}", "id", 25, 0, { now: ntmy.dateValue(now) });
    var seen = {};
    due = due.concat(stale).filter(function (notification) { if (seen[notification.id]) return false; seen[notification.id] = true; return true; }).slice(0, 25);
    due.forEach(function (notification) {
      if (notification.getInt("delivery_attempts") >= 3) {
        notification.set("delivery_status", "failed");
        notification.set("last_delivery_error", "Delivery worker did not acknowledge the notification");
        txApp.save(notification);
        return;
      }
      notification.set("delivery_status", "processing"); notification.set("delivery_attempts", notification.getInt("delivery_attempts") + 1); notification.set("deliver_after", ntmy.dateValue(new Date(now.getTime() + 5 * 60 * 1000))); notification.set("last_delivery_error", ""); txApp.save(notification);
      var subscriptions = txApp.findRecordsByFilter("push_subscriptions", "user = {:user}", "id", 20, 0, { user: notification.getString("user") });
      claimed.push({ id: notification.id, title: notification.getString("title"), body: notification.getString("body"), url: notification.getString("url") || "/app/sessions", subscriptions: subscriptions.map(function (subscription) { return { endpoint: subscription.getString("endpoint"), keys: { p256dh: subscription.getString("p256dh"), auth: subscription.getString("auth") } }; }) });
    });
  });
  return e.json(200, { notifications: claimed });
}, (e) => require(__hooks + "/ntmy.js").internalWebhookOnly(e));

routerAdd("POST", "/api/ntmy/internal/notifications/{notificationId}/ack", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  var data = ntmy.parseRequestBody(e, { status: "", error: "" });
  var status = ntmy.requiredText(data.status, "delivery status", 20);
  if (["delivered", "failed"].indexOf(status) === -1) throw new BadRequestError("Invalid delivery status");
  $app.runInTransaction((txApp) => {
    var notification = txApp.findRecordById("notifications", e.request.pathValue("notificationId"));
    if (notification.getString("delivery_status") !== "processing") return;
    if (status === "delivered") { notification.set("delivery_status", "delivered"); notification.set("sent_at", ntmy.dateValue(new Date())); }
    else if (notification.getInt("delivery_attempts") >= 3) { notification.set("delivery_status", "failed"); notification.set("last_delivery_error", ntmy.optionalText(data.error, 500)); }
    else { notification.set("delivery_status", "pending"); notification.set("deliver_after", ntmy.dateValue(new Date(Date.now() + 5 * 60 * 1000))); notification.set("last_delivery_error", ntmy.optionalText(data.error, 500)); }
    txApp.save(notification);
  });
  return e.json(200, { acknowledged: true });
}, (e) => require(__hooks + "/ntmy.js").internalWebhookOnly(e));

routerAdd("POST", "/api/ntmy/sessions/{sessionId}/join-authorize", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  Object.keys(ntmy).forEach(function (key) { globalThis[key] = ntmy[key]; });
  var sessionId = e.request.pathValue("sessionId");
  var session = e.app.findRecordById("sessions", sessionId);
  var participant = e.app.findFirstRecordByFilter(
    "session_participants",
    "session = {:session} && user = {:user} && reservation_status = 'reserved'",
    { session: sessionId, user: e.auth.id }
  );
  var startsAt = new Date(session.getString("starts_at")).getTime();
  var endsAt = new Date(session.getString("ends_at")).getTime();
  var now = Date.now();
  if (session.getString("status") !== "scheduled" || now < startsAt || now >= endsAt || !hasViableSessionGroup(e.app, sessionId)) {
    throw new ForbiddenError("This room is not ready to join");
  }
  return e.json(200, {
    allowed: true,
    roomName: session.getString("room_name"),
    participantIdentity: participant.id,
    participantName: e.auth.getString("display_name"),
    role: participant.getString("role"),
    sessionParticipantId: participant.id,
    startsAt: session.getString("starts_at"),
    endsAt: session.getString("ends_at")
  });
}, $apis.requireAuth("users"));

routerAdd("POST", "/api/ntmy/moderation/reports", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  Object.keys(ntmy).forEach(function (key) { globalThis[key] = ntmy[key]; });
  var data = parseRequestBody(e, { reportedParticipantId: "", sessionId: "", reason: "", details: "" });
  var reason = requiredText(data.reason, "reason", 40);
  if (["harassment", "hate", "sexual_content", "spam", "other"].indexOf(reason) === -1) throw new BadRequestError("Invalid report reason");
  var sessionId = requiredText(data.sessionId, "session", 30);
  var reportedParticipantId = optionalText(data.reportedParticipantId, 30);
  var result;
  $app.runInTransaction((txApp) => {
    txApp.findRecordById("sessions", sessionId);
    var reporterParticipant;
    try {
      reporterParticipant = txApp.findFirstRecordByFilter("session_participants", "session = {:session} && user = {:user}", { session: sessionId, user: e.auth.id });
    } catch (_) {
      throw new ForbiddenError("You can only report a session you joined");
    }
    if (["reserved", "attended", "no_show"].indexOf(reporterParticipant.getString("reservation_status")) === -1) throw new ForbiddenError("You can only report a session you joined");
    var reportedUserId = "";
    if (reportedParticipantId) {
      var reportedParticipant = txApp.findRecordById("session_participants", reportedParticipantId);
      if (reportedParticipant.getString("session") !== sessionId || ["reserved", "attended", "no_show"].indexOf(reportedParticipant.getString("reservation_status")) === -1) throw new BadRequestError("Reported participant was not in this session");
      reportedUserId = reportedParticipant.getString("user");
      if (reportedUserId === e.auth.id) throw new BadRequestError("You cannot report yourself");
    }
    var report = new Record(txApp.findCollectionByNameOrId("moderation_reports"));
    report.set("reporter", e.auth.id);
    report.set("reported_user", reportedUserId);
    report.set("session", sessionId);
    report.set("reason", reason);
    report.set("details", optionalText(data.details, 1000));
    report.set("status", "open");
    txApp.save(report);
    audit(txApp, e.auth.id, "moderation_reported", "moderation_report", report.id, { reason: reason, sessionId: sessionId });
    result = { id: report.id, status: "open" };
  });
  return e.json(201, result);
}, $apis.requireAuth("users"));

// These two routes are intentionally not proxied by Next.js. A PocketBase
// superuser can reach them only over the private loopback administration path.
routerAdd("POST", "/api/ntmy/admin/participants/{participantId}/technical-exception", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  Object.keys(ntmy).forEach(function (key) { globalThis[key] = ntmy[key]; });
  $app.runInTransaction((txApp) => {
    var participant = txApp.findRecordById("session_participants", e.request.pathValue("participantId"));
    if (participant.getString("reservation_status") !== "no_show") throw new BadRequestError("Participant is not marked as a no-show");
    participant.set("reservation_status", "cancelled");
    participant.set("absence_reason", "technical_exception");
    participant.set("absence_marked_at", "");
    txApp.save(participant);
    recalculateSuspension(txApp, participant.getString("user"));
    audit(txApp, "", "technical_exception_granted", "session_participant", participant.id, {});
  });
  return e.json(200, { updated: true });
}, $apis.requireSuperuserAuth());

routerAdd("POST", "/api/ntmy/admin/users/{userId}/clear-reservation-suspension", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  Object.keys(ntmy).forEach(function (key) { globalThis[key] = ntmy[key]; });
  $app.runInTransaction((txApp) => {
    var profile = profileFor(txApp, e.request.pathValue("userId"));
    profile.set("no_show_suspended_until", "");
    txApp.save(profile);
    audit(txApp, "", "reservation_suspension_cleared", "user", e.request.pathValue("userId"), {});
  });
  return e.json(200, { cleared: true });
}, $apis.requireSuperuserAuth());

routerAdd("POST", "/api/ntmy/livekit/webhook", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  Object.keys(ntmy).forEach(function (key) { globalThis[key] = ntmy[key]; });
  var payload = e.requestInfo().body || {};
  var eventId = requiredText(payload.id || payload.eventId, "event id", 120);
  var eventType = requiredText(payload.event || payload.eventType, "event type", 100);
  var webhook;
  var action = "process";
  var processingAttempt = "";
  e.app.runInTransaction((txApp) => {
    try {
      webhook = txApp.findFirstRecordByFilter("webhook_events", "provider = 'livekit' && event_id = {:eventId}", { eventId: eventId });
    } catch (_) {
      webhook = new Record(txApp.findCollectionByNameOrId("webhook_events"));
      webhook.set("provider", "livekit");
      webhook.set("event_id", eventId);
      webhook.set("event_type", eventType);
      webhook.set("payload", payload);
    }

    var status = webhook.getString("processing_status");
    if (status === "processed") {
      action = "duplicate";
      return;
    }
    // A duplicate received while the first delivery is still in flight must be
    // retried by LiveKit. If the worker crashed, the lease expires and a retry
    // atomically reclaims the event instead of leaving it blocked forever.
    if (status === "processing" && !isWebhookProcessingLeaseExpired(webhook)) {
      action = "retry";
      return;
    }
    if (status === "processing") {
      audit(txApp, "", "webhook_processing_reclaimed", "webhook_event", webhook.id, { provider: "livekit", eventId: eventId });
    }
    webhook.set("processing_status", "processing");
    webhook.set("processing_started_at", dateValue(new Date()));
    processingAttempt = newWebhookProcessingAttempt();
    webhook.set("processing_attempt", processingAttempt);
    webhook.set("failure_reason", "");
    txApp.save(webhook);
  });

  if (action === "duplicate") return e.json(200, { duplicate: true });
  if (action === "retry") return e.json(409, { retry: true });

  var completion = "processed";
  try {
    e.app.runInTransaction((txApp) => {
      var currentWebhook = txApp.findRecordById("webhook_events", webhook.id);
      if (currentWebhook.getString("processing_status") === "processed") {
        completion = "duplicate";
        return;
      }
      if (currentWebhook.getString("processing_status") !== "processing" || currentWebhook.getString("processing_attempt") !== processingAttempt) {
        completion = "retry";
        return;
      }
      processLiveKitEvent(txApp, payload, currentWebhook.id);
      currentWebhook.set("processing_status", "processed");
      currentWebhook.set("processed_at", dateValue(new Date()));
      currentWebhook.set("failure_reason", "");
      txApp.save(currentWebhook);
    });
  } catch (error) {
    var failureOwned = false;
    e.app.runInTransaction((txApp) => {
      var currentWebhook = txApp.findRecordById("webhook_events", webhook.id);
      if (currentWebhook.getString("processing_status") !== "processing" || currentWebhook.getString("processing_attempt") !== processingAttempt) return;
      currentWebhook.set("processing_status", "failed");
      currentWebhook.set("failure_reason", String(error).slice(0, 500));
      txApp.save(currentWebhook);
      failureOwned = true;
    });
    if (!failureOwned) return e.json(409, { retry: true });
    throw error;
  }
  if (completion === "duplicate") return e.json(200, { duplicate: true });
  if (completion === "retry") return e.json(409, { retry: true });
  return e.json(200, { processed: true });
}, (e) => require(__hooks + "/ntmy.js").internalWebhookOnly(e));

// Reminders are created as idempotent outbox events. Browser push remains
// optional: every reminder is also visible in the in-app notification centre.
cronAdd("ntmy-queue-session-reminders", "* * * * *", () => {
  var ntmy = require(__hooks + "/ntmy.js");
  var now = new Date();
  var sessions = $app.findRecordsByFilter("sessions", "status = 'scheduled' && starts_at >= {:now} && starts_at <= {:soon}", "starts_at", 100, 0, { now: ntmy.dateValue(now), soon: ntmy.dateValue(new Date(now.getTime() + 62 * 60 * 1000)) });
  sessions.forEach((session) => {
    var minutesUntilStart = (new Date(session.getString("starts_at")).getTime() - now.getTime()) / 60000;
    if (minutesUntilStart < 58 || minutesUntilStart > 62) return;
    $app.runInTransaction((txApp) => {
      var current = txApp.findRecordById("sessions", session.id);
      if (current.getString("status") !== "scheduled") return;
      activeParticipants(txApp, current.id).forEach((participant) => {
        notificationFor(txApp, participant.getString("user"), "session_reminder", "session-reminder:" + current.id, "Your session starts in one hour", "Your language exchange is coming up soon.", "/app/sessions/" + current.id, new Date());
      });
    });
  });
});

// Once the start time is reached no additional reservations are accepted.
// A room with fewer than two people is cancelled without charging its members
// a no-show.
cronAdd("ntmy-cancel-incomplete-sessions", "* * * * *", () => {
  var ntmy = require(__hooks + "/ntmy.js");
  Object.keys(ntmy).forEach(function (key) { globalThis[key] = ntmy[key]; });
  var now = new Date();
  var sessions = $app.findRecordsByFilter("sessions", "status = 'scheduled' && starts_at <= {:now} && ends_at > {:now}", "-starts_at", 500, 0, { now: dateValue(now) });
  sessions.forEach(function (session) {
    $app.runInTransaction((txApp) => {
      var current = txApp.findRecordById("sessions", session.id);
      if (current.getString("status") !== "scheduled" || hasViableSessionGroup(txApp, current.id)) return;
      var cancelledParticipants = cancelScheduledSession(txApp, current, "Session cancelled", "The session did not reach the minimum of two participants in time.", "incomplete-session", now);
      audit(txApp, "", "incomplete_session_cancelled", "session", current.id, { cancelledParticipants: cancelledParticipants });
    });
  });
});

// A completed session is evaluated once. Missing participants become no-shows
// and may be suspended.
cronAdd("ntmy-close-expired-sessions", "* * * * *", () => {
  var ntmy = require(__hooks + "/ntmy.js");
  Object.keys(ntmy).forEach(function (key) { globalThis[key] = ntmy[key]; });
  var closeBefore = new Date(Date.now() - 5 * 60 * 1000);
  var sessions = $app.findRecordsByFilter(
    "sessions",
    "status = 'scheduled' && ends_at < {:closeBefore}",
    "ends_at",
    100,
    0,
    { closeBefore: dateValue(closeBefore) }
  );
  sessions.forEach((session) => {
    $app.runInTransaction((txApp) => {
      var current = txApp.findRecordById("sessions", session.id);
      if (current.getString("status") !== "scheduled" || !domain.isSessionClosureDue(current.getString("ends_at"), Date.now(), 5)) return;
      if (!hasViableSessionGroup(txApp, current.id)) {
        var cancelledParticipants = cancelScheduledSession(txApp, current, "Session cancelled", "The session did not reach the minimum of two participants in time.", "incomplete-session", new Date());
        audit(txApp, "", "incomplete_session_cancelled", "session", current.id, { cancelledParticipants: cancelledParticipants });
        return;
      }
      var participants = activeParticipants(txApp, current.id);
      participants.forEach((participant) => {
        if (hasValidatedAttendance(txApp, current, participant)) {
          participant.set("reservation_status", "attended");
          txApp.save(participant);
          releaseReservationLock(txApp, participant.id);
        } else {
          participant.set("reservation_status", "no_show");
          participant.set("absence_reason", "no_show");
          participant.set("absence_marked_at", dateValue(new Date()));
          txApp.save(participant);
          releaseReservationLock(txApp, participant.id);
          suspendForNoShows(txApp, participant.getString("user"));
        }
      });
      current.set("status", "completed");
      txApp.save(current);
      audit(txApp, "", "session_completed", "session", current.id, {});
    });
  });
});
