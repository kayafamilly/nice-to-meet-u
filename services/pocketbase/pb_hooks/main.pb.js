// PocketBase JavaScript hooks run in an embedded VM. Keep this file dependency
// free and make every state-changing action transactional.

// `ntmy.js` is the only business-rule implementation. Export its helpers into
// the hook VM once so every route and cron callback uses the same rules.
var canonicalNtmy = require(__hooks + "/ntmy.js");
Object.keys(canonicalNtmy).forEach(function (key) { globalThis[key] = canonicalNtmy[key]; });

// PocketBase executes mailer callbacks in a deferred hook context. Keep the
// transport implementation inside the callback so it doesn't depend on
// module-scoped functions that are unavailable when the hook later runs.
onMailerSend((e) => {
  var apiKey = $os.getenv("BREVO_API_KEY");
  if (!apiKey) {
    e.next();
    return;
  }
  var message = e.message;
  if (!message || !message.from || !message.from.address || !message.to || !message.to.length) {
    throw new Error("Invalid transactional email message");
  }
  if ((message.attachments && Object.keys(message.attachments).length) || (message.inlineAttachments && Object.keys(message.inlineAttachments).length)) {
    throw new Error("Brevo mail transport does not support PocketBase attachments");
  }
  function recipients(values) {
    return (values || []).map(function (recipient) {
      var value = { email: recipient.address };
      if (recipient.name) value.name = recipient.name;
      return value;
    });
  }
  var payload = {
    sender: { email: message.from.address, name: message.from.name || "NiceToMeetU" },
    to: recipients(message.to),
    subject: message.subject,
    tags: ["nicetomeetu", "transactional"]
  };
  if (message.cc && message.cc.length) payload.cc = recipients(message.cc);
  if (message.bcc && message.bcc.length) payload.bcc = recipients(message.bcc);
  if (message.html) payload.htmlContent = message.html;
  else payload.textContent = message.text || "";
  var response = $http.send({
    method: "POST",
    url: "https://api.brevo.com/v3/smtp/email",
    body: JSON.stringify(payload),
    headers: {
      "accept": "application/json",
      "api-key": apiKey,
      "content-type": "application/json"
    },
    timeout: 20
  });
  if (response.statusCode !== 201) {
    throw new Error("Brevo transactional email failed with status " + response.statusCode);
  }
});

onBootstrap((e) => {
  e.next();
  var smtpHost = $os.getenv("SMTP_HOST");
  var smtpPort = Number($os.getenv("SMTP_PORT") || "587");
  var smtpUsername = $os.getenv("SMTP_USERNAME");
  var smtpPassword = $os.getenv("SMTP_PASSWORD");
  var senderAddress = $os.getenv("MAIL_SENDER_ADDRESS");
  var brevoApiKey = $os.getenv("BREVO_API_KEY");
  var publicAppUrl = $os.getenv("NEXT_PUBLIC_APP_URL");
  if ((smtpHost || brevoApiKey) && !senderAddress) {
    throw new Error("Incomplete mail sender configuration");
  }
  if (smtpHost && (!smtpUsername || !smtpPassword || !Number.isFinite(smtpPort))) {
    throw new Error("Incomplete SMTP configuration");
  }
  var settings = e.app.settings();
  settings.meta.appName = "NiceToMeetU";
  if (publicAppUrl) settings.meta.appURL = publicAppUrl.replace(/\/+$/, "");
  settings.meta.senderName = $os.getenv("MAIL_SENDER_NAME") || "NiceToMeetU";
  if (senderAddress) settings.meta.senderAddress = senderAddress;
  if (smtpHost) {
    settings.smtp.enabled = true;
    settings.smtp.host = smtpHost;
    settings.smtp.port = smtpPort;
    settings.smtp.username = smtpUsername;
    settings.smtp.password = smtpPassword;
    settings.smtp.tls = String($os.getenv("SMTP_TLS") || "false").toLowerCase() === "true";
    settings.smtp.authMethod = $os.getenv("SMTP_AUTH_METHOD") || "PLAIN";
  }
  e.app.save(settings);
});

routerAdd("POST", "/api/ntmy/auth/register", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  Object.keys(ntmy).forEach(function (key) { globalThis[key] = ntmy[key]; });
  var data = ntmy.parseRequestBody(e, { displayName: "", email: "", password: "", passwordConfirm: "", isAdultConfirmed: false, visitorHash: "" });
  var displayName = ntmy.requiredText(data.displayName, "display name", 40);
  var email = ntmy.requiredText(data.email, "email", 254).toLowerCase();
  var password = String(data.password || "");
  var visitorHash = /^[a-f0-9]{64}$/.test(String(data.visitorHash || "")) ? String(data.visitorHash) : "";
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
    var source = "Non attribué", medium = "", campaign = "";
    if (visitorHash) {
      var visits = txApp.findRecordsByFilter("analytics_visits", "visitor_hash = {:visitor}", "-started_at", 1, 0, { visitor: visitorHash });
      if (visits.length) {
        source = visits[0].getString("utm_source") || visits[0].getString("referrer_host") || "Direct";
        medium = visits[0].getString("utm_medium");
        campaign = visits[0].getString("utm_campaign");
      }
    }
    var conversion = new Record(txApp.findCollectionByNameOrId("analytics_conversions"));
    conversion.set("user", user.id);
    conversion.set("registered_at", ntmy.dateValue(new Date()));
    conversion.set("source", source);
    conversion.set("medium", medium);
    conversion.set("campaign", campaign);
    txApp.save(conversion);
    ntmy.audit(txApp, user.id, "account_registered", "user", user.id, {});
  });
  return e.json(201, { created: true });
});

routerAdd("POST", "/api/ntmy/auth/login", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  var data = ntmy.parseRequestBody(e, { email: "", password: "" });
  var email = ntmy.requiredText(data.email, "email", 254).toLowerCase();
  var password = String(data.password || "");
  var user;
  try {
    user = e.app.findAuthRecordByEmail("users", email);
  } catch (_) {
    throw new BadRequestError("Invalid email or password");
  }
  if (!user.validatePassword(password)) throw new BadRequestError("Invalid email or password");
  if (!user.verified()) throw new ApiError(403, "Email verification required");
  return $apis.recordAuthResponse(e, user, "password");
}, $apis.requireGuestOnly());

routerAdd("POST", "/api/ntmy/auth/request-verification", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  var data = ntmy.parseRequestBody(e, { email: "" });
  var email = ntmy.requiredText(data.email, "email", 254).toLowerCase();
  var user;
  try {
    user = e.app.findAuthRecordByEmail("users", email);
  } catch (_) {
    return e.json(200, { accepted: true });
  }
  if (user.verified()) return e.json(200, { accepted: true });
  var settings = e.app.settings();
  var publicAppUrl = $os.getenv("NEXT_PUBLIC_APP_URL") || settings.meta.appURL;
  if (!publicAppUrl || !/^https?:\/\//.test(publicAppUrl)) throw new Error("Invalid public application URL");
  var token = user.newVerificationToken();
  var actionUrl = String(publicAppUrl).replace(/\/+$/, "") + "/verify-email#token=" + token;
  var message = new MailerMessage({
    from: { address: settings.meta.senderAddress, name: settings.meta.senderName },
    to: [{ address: user.email() }],
    subject: "Activate your NiceToMeetU account",
    html: "<p>Hello,</p><p>Confirm your email address to activate your NiceToMeetU account and start practising with international language groups.</p><p><a href=\"" + actionUrl + "\" target=\"_blank\" rel=\"noopener\">Activate my account</a></p><p>This secure link opens <strong>nice-to-meet-u.com</strong>. Ignore any older confirmation email that opens a local address.</p><p>If you did not create this account, you can ignore this email.</p>"
  });
  e.app.newMailClient().send(message);
  return e.json(200, { accepted: true });
}, $apis.requireGuestOnly());

routerAdd("POST", "/api/ntmy/auth/confirm-verification", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  var data = ntmy.parseRequestBody(e, { token: "" });
  var token = ntmy.requiredText(data.token, "verification token", 2000);
  var tokenUser;
  try {
    tokenUser = e.app.findAuthRecordByToken(token, "verification");
  } catch (_) {
    throw new BadRequestError("Invalid or expired verification token");
  }
  $app.runInTransaction((txApp) => {
    var user = txApp.findRecordById("users", tokenUser.id);
    if (user.verified()) throw new BadRequestError("Invalid or expired verification token");
    user.setVerified(true);
    user.refreshTokenKey();
    txApp.save(user);
    ntmy.audit(txApp, user.id, "account_email_verified", "user", user.id, {});
  });
  return e.json(200, { verified: true });
}, $apis.requireGuestOnly());

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

routerAdd("GET", "/api/ntmy/internal/public-metrics", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  var metrics = e.app.findRecordById("public_metrics", ntmy.VERIFIED_SESSION_METRICS_RECORD_ID);
  return e.json(200, {
    verifiedCompletedSessionCount: metrics.getInt("verified_completed_session_count")
  });
}, (e) => require(__hooks + "/ntmy.js").internalWebhookOnly(e));

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
    session.set("created_at", dateValue(new Date()));
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
    report.set("created_at", dateValue(new Date()));
    txApp.save(report);
    audit(txApp, e.auth.id, "moderation_reported", "moderation_report", report.id, { reason: reason, sessionId: sessionId });
    result = { id: report.id, status: "open" };
  });
  return e.json(201, result);
}, $apis.requireAuth("users"));

routerAdd("POST", "/api/ntmy/internal/analytics/track", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  var expected = $os.getenv("MANAGEMENT_INTERNAL_SECRET");
  if (!expected || e.request.header.get("X-Management-Internal-Secret") !== expected) throw new ForbiddenError("Internal endpoint only");
  var data = ntmy.parseRequestBody(e, { visitorHash: "", eventId: "", path: "", referrerHost: "", device: "other", utmSource: "", utmMedium: "", utmCampaign: "" });
  var visitorHash = ntmy.requiredText(data.visitorHash, "visitor hash", 64);
  var eventId = ntmy.requiredText(data.eventId, "event id", 80);
  var path = ntmy.requiredText(data.path, "path", 200);
  var device = ["desktop", "mobile", "tablet", "other"].indexOf(String(data.device)) >= 0 ? String(data.device) : "other";
  var now = new Date();
  var duplicate = false;
  $app.runInTransaction((txApp) => {
    try { txApp.findFirstRecordByFilter("analytics_page_views", "event_id = {:eventId}", { eventId: eventId }); duplicate = true; return; } catch (_) {}
    var cutoff = new Date(now.getTime() - 30 * 60 * 1000);
    var visit;
    var isNewVisit = false;
    try { visit = txApp.findFirstRecordByFilter("analytics_visits", "visitor_hash = {:visitor} && last_seen_at >= {:cutoff}", { visitor: visitorHash, cutoff: ntmy.dateValue(cutoff) }); }
    catch (_) {
      isNewVisit = true;
      visit = new Record(txApp.findCollectionByNameOrId("analytics_visits"));
      visit.set("visitor_hash", visitorHash); visit.set("started_at", ntmy.dateValue(now)); visit.set("landing_path", path);
      visit.set("referrer_host", ntmy.optionalText(data.referrerHost, 200)); visit.set("device", device);
      visit.set("utm_source", ntmy.optionalText(data.utmSource, 100)); visit.set("utm_medium", ntmy.optionalText(data.utmMedium, 100)); visit.set("utm_campaign", ntmy.optionalText(data.utmCampaign, 100));
    }
    visit.set("last_seen_at", ntmy.dateValue(now)); txApp.save(visit);
    var view = new Record(txApp.findCollectionByNameOrId("analytics_page_views"));
    view.set("visit", visit.id); view.set("event_id", eventId); view.set("path", path); view.set("occurred_at", ntmy.dateValue(now)); txApp.save(view);
    var day = now.toISOString().slice(0, 10);
    var daily;
    try { daily = txApp.findFirstRecordByFilter("analytics_daily", "day = {:day}", { day: day }); }
    catch (_) { daily = new Record(txApp.findCollectionByNameOrId("analytics_daily")); daily.set("day", day); daily.set("visitors", 0); daily.set("visits", 0); daily.set("page_views", 0); }
    if (isNewVisit) {
      var dayStart = new Date(day + "T00:00:00.000Z");
      var prior = txApp.findRecordsByFilter("analytics_visits", "visitor_hash = {:visitor} && started_at >= {:start} && id != {:visit}", "id", 1, 0, { visitor: visitorHash, start: ntmy.dateValue(dayStart), visit: visit.id });
      daily.set("visits", daily.getInt("visits") + 1);
      if (!prior.length) daily.set("visitors", daily.getInt("visitors") + 1);
    }
    daily.set("page_views", daily.getInt("page_views") + 1); txApp.save(daily);
  });
  return e.json(duplicate ? 200 : 201, { accepted: true, duplicate: duplicate });
});

routerAdd("GET", "/api/ntmy/internal/management/auth-status", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  var expected = $os.getenv("MANAGEMENT_INTERNAL_SECRET");
  if (!expected || e.request.header.get("X-Management-Internal-Secret") !== expected) throw new ForbiddenError("Internal endpoint only");
  var fingerprint = ntmy.requiredText(String((e.requestInfo().query || {}).fingerprint || ""), "fingerprint", 64);
  var cutoff = ntmy.dateValue(new Date(Date.now() - 15 * 60 * 1000));
  var events = e.app.findRecordsByFilter("management_auth_events", "fingerprint = {:fingerprint} && occurred_at >= {:cutoff}", "-occurred_at", 20, 0, { fingerprint: fingerprint, cutoff: cutoff });
  var failures = [];
  for (var index = 0; index < events.length; index += 1) { if (events[index].getString("outcome") === "success") break; if (events[index].getString("outcome") === "failure") failures.push(events[index]); }
  return e.json(200, { locked: failures.length >= 5, attemptsRemaining: Math.max(0, 5 - failures.length) });
});

routerAdd("POST", "/api/ntmy/internal/management/auth-event", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  var expected = $os.getenv("MANAGEMENT_INTERNAL_SECRET");
  if (!expected || e.request.header.get("X-Management-Internal-Secret") !== expected) throw new ForbiddenError("Internal endpoint only");
  var data = ntmy.parseRequestBody(e, { fingerprint: "", outcome: "failure", metadata: {} });
  var outcome = String(data.outcome || "");
  if (["success", "failure", "logout", "export"].indexOf(outcome) < 0) throw new BadRequestError("Invalid management event");
  var record = new Record(e.app.findCollectionByNameOrId("management_auth_events"));
  record.set("fingerprint", ntmy.requiredText(data.fingerprint, "fingerprint", 64)); record.set("outcome", outcome); record.set("occurred_at", ntmy.dateValue(new Date())); record.set("metadata", data.metadata || {}); e.app.save(record);
  return e.json(201, { recorded: true });
});

routerAdd("POST", "/api/ntmy/internal/management/heartbeat", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  var expected = $os.getenv("MANAGEMENT_INTERNAL_SECRET");
  if (!expected || e.request.header.get("X-Management-Internal-Secret") !== expected) throw new ForbiddenError("Internal endpoint only");
  var data = ntmy.parseRequestBody(e, { service: "" });
  var service = String(data.service || "");
  if (["notification_worker", "livekit_worker"].indexOf(service) < 0) throw new BadRequestError("Invalid service");
  $app.runInTransaction((txApp) => {
    var heartbeat;
    try { heartbeat = txApp.findFirstRecordByFilter("management_service_heartbeats", "service = {:service}", { service: service }); }
    catch (_) { heartbeat = new Record(txApp.findCollectionByNameOrId("management_service_heartbeats")); heartbeat.set("service", service); }
    heartbeat.set("last_seen_at", ntmy.dateValue(new Date())); txApp.save(heartbeat);
  });
  return e.json(200, { recorded: true });
});

routerAdd("GET", "/api/ntmy/internal/management/data", (e) => {
  var ntmy = require(__hooks + "/ntmy.js");
  var expected = $os.getenv("MANAGEMENT_INTERNAL_SECRET");
  if (!expected || e.request.header.get("X-Management-Internal-Secret") !== expected) throw new ForbiddenError("Internal endpoint only");
  var query = e.requestInfo().query || {};
  var section = String(query.section || "overview");
  var search = String(query.search || "").trim().toLowerCase().slice(0, 100);
  var page = Math.max(1, Math.floor(Number(query.page || 1)) || 1);
  var perPage = Math.min(50, Math.max(10, Math.floor(Number(query.perPage || 25)) || 25));
  function sqlOne(sql, definition, params) { var result = new DynamicModel(definition); var statement = e.app.db().newQuery(sql); if (params) statement.bind(params); statement.one(result); return result; }
  function sqlAll(sql, definition, params) { var result = arrayOf(new DynamicModel(definition)); var statement = e.app.db().newQuery(sql); if (params) statement.bind(params); statement.all(result); return result; }
  function countSql(sql, params) { return Number(sqlOne(sql, { value: 0 }, params).value || 0); }
  function languageName(id) { try { return e.app.findRecordById("languages", id).getString("name"); } catch (_) { return "Unknown"; } }
  function userName(id) { try { return e.app.findRecordById("users", id).getString("display_name"); } catch (_) { return "Deleted member"; } }
  function paged(items, totalItems) { return { items: items, page: page, perPage: perPage, totalItems: totalItems, totalPages: Math.max(1, Math.ceil(totalItems / perPage)) }; }
  function participantDto(record) { return { id: record.id, userId: record.getString("user"), displayName: userName(record.getString("user")), role: record.getString("role") === "support" ? "native" : "practice", reservationStatus: record.getString("reservation_status"), joinedAt: record.getString("joined_at") || null, leftAt: record.getString("left_at") || null, absenceReason: record.getString("absence_reason") || null }; }
  function sessionDto(record) {
    var participants = e.app.findRecordsByFilter("session_participants", "session = {:session}", "id", 10, 0, { session: record.id }).map(participantDto);
    return { id: record.id, languageName: languageName(record.getString("language")), hostId: record.getString("host"), hostName: userName(record.getString("host")), startsAt: record.getString("starts_at"), endsAt: record.getString("ends_at"), note: record.getString("description") || record.getString("topic") || "", status: record.getString("status"), participantCount: participants.filter((item) => item.reservationStatus !== "cancelled").length, participants: participants, createdAt: record.getString("created_at") || null };
  }
  function userDto(user) {
    var profile; try { profile = e.app.findFirstRecordByFilter("user_profiles", "user = {:user}", { user: user.id }); } catch (_) { profile = null; }
    var languages = e.app.findRecordsByFilter("user_languages", "user = {:user}", "position,id", 20, 0, { user: user.id }).map((entry) => ({ name: languageName(entry.getString("language")), level: entry.getString("level"), native: entry.getBool("is_native") }));
    var reservationStats = sqlOne("SELECT COUNT(*) AS total, COALESCE(SUM(reservation_status = 'attended'), 0) AS attended, COALESCE(SUM(reservation_status = 'no_show'), 0) AS noShow, COALESCE(SUM(reservation_status = 'cancelled'), 0) AS cancelled FROM session_participants WHERE user = {:user}", { total: 0, attended: 0, noShow: 0, cancelled: 0 }, { user: user.id });
    return { id: user.id, email: user.email(), displayName: user.getString("display_name"), verified: user.verified(), createdAt: user.getString("created"), status: profile ? profile.getString("status") : "unknown", onboardingComplete: profile ? profile.getBool("onboarding_complete") : false, timeZone: profile ? profile.getString("time_zone") : "UTC", suspendedUntil: profile ? (profile.getString("no_show_suspended_until") || null) : null, languages: languages, sessionStats: { total: Number(reservationStats.total), attended: Number(reservationStats.attended), noShow: Number(reservationStats.noShow), cancelled: Number(reservationStats.cancelled) } };
  }
  function periodStats(since, until) {
    var traffic = sqlOne("SELECT COUNT(*) AS visits, COUNT(DISTINCT visitor_hash) AS visitors FROM analytics_visits WHERE started_at >= {:since} AND started_at < {:until}", { visits: 0, visitors: 0 }, { since: since, until: until });
    var pageViews = countSql("SELECT COUNT(*) AS value FROM analytics_page_views WHERE occurred_at >= {:since} AND occurred_at < {:until}", { since: since, until: until });
    var registrations = sqlOne("SELECT COUNT(*) AS registrations, COALESCE(SUM(verified = 1), 0) AS verifiedAccounts FROM users WHERE created >= {:since} AND created < {:until}", { registrations: 0, verifiedAccounts: 0 }, { since: since, until: until });
    var activation = sqlOne("SELECT COUNT(DISTINCT CASE WHEN p.onboarding_complete = 1 THEN u.id END) AS onboardedAccounts, COUNT(DISTINCT CASE WHEN sp.reservation_status IN ('reserved','attended','no_show') THEN u.id END) AS activatedAccounts FROM users u LEFT JOIN user_profiles p ON p.user = u.id LEFT JOIN session_participants sp ON sp.user = u.id WHERE u.created >= {:since} AND u.created < {:until}", { onboardedAccounts: 0, activatedAccounts: 0 }, { since: since, until: until });
    var sessions = sqlOne("SELECT COUNT(DISTINCT s.id) AS sessions, COUNT(DISTINCT CASE WHEN s.status = 'scheduled' THEN s.id END) AS scheduledSessions, COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) AS completedSessions, COUNT(DISTINCT CASE WHEN s.status = 'cancelled' THEN s.id END) AS cancelledSessions, COUNT(CASE WHEN sp.reservation_status IN ('reserved','attended','no_show') THEN 1 END) AS reservations, COUNT(CASE WHEN sp.reservation_status = 'attended' THEN 1 END) AS attendances, COUNT(CASE WHEN sp.reservation_status = 'no_show' THEN 1 END) AS noShows, COUNT(CASE WHEN sp.reservation_status = 'cancelled' THEN 1 END) AS cancelledReservations FROM sessions s LEFT JOIN session_participants sp ON sp.session = s.id WHERE s.starts_at >= {:since} AND s.starts_at < {:until}", { sessions: 0, scheduledSessions: 0, completedSessions: 0, cancelledSessions: 0, reservations: 0, attendances: 0, noShows: 0, cancelledReservations: 0 }, { since: since, until: until });
    var viableSessions = countSql("SELECT COUNT(*) AS value FROM (SELECT s.id FROM sessions s LEFT JOIN session_participants sp ON sp.session = s.id AND sp.reservation_status IN ('reserved','attended','no_show') WHERE s.starts_at >= {:since} AND s.starts_at < {:until} GROUP BY s.id HAVING COUNT(sp.id) >= 2)", { since: since, until: until });
    return { visitors: Number(traffic.visitors), visits: Number(traffic.visits), pageViews: pageViews, registrations: Number(registrations.registrations), verifiedAccounts: Number(registrations.verifiedAccounts), onboardedAccounts: Number(activation.onboardedAccounts), activatedAccounts: Number(activation.activatedAccounts), sessions: Number(sessions.sessions), scheduledSessions: Number(sessions.scheduledSessions), completedSessions: Number(sessions.completedSessions), cancelledSessions: Number(sessions.cancelledSessions), reservations: Number(sessions.reservations), attendances: Number(sessions.attendances), noShows: Number(sessions.noShows), cancelledReservations: Number(sessions.cancelledReservations), viableSessions: viableSessions };
  }
  function metric(value, previous) { return { value: value, previous: previous, change: previous ? (value - previous) / previous : (value ? null : 0) }; }
  function ratio(numerator, denominator) { return denominator ? numerator / denominator : 0; }
  function breakdown(sql, definition, params) { return sqlAll(sql, definition, params).map((item) => { var result = {}; Object.keys(definition).forEach((key) => { result[key] = typeof definition[key] === "number" ? Number(item[key]) : String(item[key] || ""); }); return result; }); }
  function mediaLabelSql(source, referrer) {
    var cleanSource = "TRIM(COALESCE(" + source + ", ''))";
    var cleanReferrer = "TRIM(COALESCE(" + referrer + ", ''))";
    var signal = "LOWER(CASE WHEN " + cleanSource + " != '' THEN " + cleanSource + " ELSE " + cleanReferrer + " END)";
    var fallback = "CASE WHEN " + cleanSource + " != '' THEN " + cleanSource + " ELSE " + cleanReferrer + " END";
    return "CASE WHEN " + signal + " = '' THEN 'Direct' " +
      "WHEN " + signal + " LIKE '%tiktok%' THEN 'TikTok' " +
      "WHEN " + signal + " LIKE '%instagram%' THEN 'Instagram' " +
      "WHEN " + signal + " LIKE '%facebook%' OR " + signal + " = 'fb' THEN 'Facebook' " +
      "WHEN " + signal + " LIKE '%reddit%' THEN 'Reddit' " +
      "WHEN " + signal + " LIKE '%google%' OR " + signal + " LIKE '%googleadservices%' THEN 'Google' " +
      "WHEN " + signal + " LIKE '%youtube%' OR " + signal + " = 'youtu.be' THEN 'YouTube' " +
      "WHEN " + signal + " LIKE '%linkedin%' THEN 'LinkedIn' " +
      "WHEN " + signal + " LIKE '%twitter%' OR " + signal + " = 'x' OR " + signal + " LIKE '%x.com%' THEN 'X / Twitter' " +
      "WHEN " + signal + " LIKE '%bing%' THEN 'Bing' " +
      "WHEN " + signal + " LIKE '%newsletter%' OR " + signal + " LIKE '%mailchimp%' OR " + signal + " LIKE '%substack%' THEN 'E-mail / Newsletter' " +
      "ELSE " + fallback + " END";
  }
  if (section === "overview" || section === "analytics") {
    var period = ["day", "week", "month"].indexOf(String(query.period || "month")) >= 0 ? String(query.period || "month") : "month";
    var duration = period === "day" ? 86400000 : (period === "week" ? 7 * 86400000 : 30 * 86400000);
    var untilDate = new Date(), sinceDate = new Date(untilDate.getTime() - duration), previousSinceDate = new Date(sinceDate.getTime() - duration);
    var since = ntmy.dateValue(sinceDate), until = ntmy.dateValue(untilDate), previousSince = ntmy.dateValue(previousSinceDate);
    var current = periodStats(since, until), previous = periodStats(previousSince, since), metrics = {};
    ["visitors", "visits", "pageViews", "registrations", "verifiedAccounts", "onboardedAccounts", "activatedAccounts", "sessions", "scheduledSessions", "completedSessions", "cancelledSessions", "reservations", "attendances", "noShows", "viableSessions"].forEach((key) => { metrics[key] = metric(current[key], previous[key]); });
    var bucketVisit = period === "day" ? "substr(started_at, 1, 13) || ':00'" : "substr(started_at, 1, 10)";
    var bucketView = period === "day" ? "substr(occurred_at, 1, 13) || ':00'" : "substr(occurred_at, 1, 10)";
    var trend = breakdown("SELECT bucket AS label, COUNT(DISTINCT CASE WHEN visits = 1 THEN visitor END) AS visitors, SUM(visits) AS visits, SUM(pageViews) AS pageViews FROM (SELECT " + bucketVisit + " AS bucket, visitor_hash AS visitor, 1 AS visits, 0 AS pageViews FROM analytics_visits WHERE started_at >= {:since} AND started_at < {:until} UNION ALL SELECT " + bucketView + " AS bucket, '' AS visitor, 0 AS visits, 1 AS pageViews FROM analytics_page_views WHERE occurred_at >= {:since} AND occurred_at < {:until}) GROUP BY bucket ORDER BY bucket", { label: "", visitors: 0, visits: 0, pageViews: 0 }, { since: since, until: until });
    var visitMediaLabel = mediaLabelSql("v.utm_source", "v.referrer_host");
    var conversionMediaLabel = mediaLabelSql("c.source", "''");
    var sourceSql = "SELECT " + visitMediaLabel + " AS label, COUNT(*) AS value FROM analytics_visits v WHERE v.started_at >= {:since} AND v.started_at < {:until} GROUP BY label ORDER BY value DESC LIMIT 10";
    var sources = breakdown(sourceSql, { label: "", value: 0 }, { since: since, until: until });
    var media = breakdown("SELECT label, SUM(visits) AS visits, SUM(pageViews) AS pageViews, SUM(registrations) AS registrations FROM (" +
      "SELECT " + visitMediaLabel + " AS label, COUNT(*) AS visits, 0 AS pageViews, 0 AS registrations FROM analytics_visits v WHERE v.started_at >= {:since} AND v.started_at < {:until} GROUP BY label " +
      "UNION ALL SELECT " + visitMediaLabel + " AS label, 0 AS visits, COUNT(*) AS pageViews, 0 AS registrations FROM analytics_page_views pv INNER JOIN analytics_visits v ON v.id = pv.visit WHERE pv.occurred_at >= {:since} AND pv.occurred_at < {:until} GROUP BY label " +
      "UNION ALL SELECT " + conversionMediaLabel + " AS label, 0 AS visits, 0 AS pageViews, COUNT(*) AS registrations FROM analytics_conversions c WHERE c.registered_at >= {:since} AND c.registered_at < {:until} GROUP BY label " +
      "UNION ALL SELECT 'Non attribué' AS label, 0 AS visits, 0 AS pageViews, COUNT(*) AS registrations FROM users u WHERE u.created >= {:since} AND u.created < {:until} AND NOT EXISTS (SELECT 1 FROM analytics_conversions c WHERE c.user = u.id)" +
      ") GROUP BY label HAVING SUM(visits) > 0 OR SUM(pageViews) > 0 OR SUM(registrations) > 0 ORDER BY visits DESC, pageViews DESC, registrations DESC, label", { label: "", visits: 0, pageViews: 0, registrations: 0 }, { since: since, until: until });
    var campaigns = breakdown("SELECT utm_campaign AS label, COUNT(*) AS value FROM analytics_visits WHERE started_at >= {:since} AND started_at < {:until} AND TRIM(utm_campaign) != '' GROUP BY utm_campaign ORDER BY value DESC LIMIT 10", { label: "", value: 0 }, { since: since, until: until });
    var devices = breakdown("SELECT CASE WHEN TRIM(device) != '' THEN device ELSE 'other' END AS label, COUNT(*) AS value FROM analytics_visits WHERE started_at >= {:since} AND started_at < {:until} GROUP BY label ORDER BY value DESC", { label: "", value: 0 }, { since: since, until: until });
    var pages = breakdown("SELECT path AS label, COUNT(*) AS value FROM analytics_page_views WHERE occurred_at >= {:since} AND occurred_at < {:until} GROUP BY path ORDER BY value DESC LIMIT 10", { label: "", value: 0 }, { since: since, until: until });
    var languages = breakdown("SELECT COALESCE(l.name, 'Inconnue') AS label, COUNT(DISTINCT s.id) AS sessions, COUNT(CASE WHEN sp.reservation_status IN ('reserved','attended','no_show') THEN 1 END) AS reservations, COUNT(CASE WHEN sp.reservation_status = 'attended' THEN 1 END) AS attendances FROM sessions s LEFT JOIN languages l ON l.id = s.language LEFT JOIN session_participants sp ON sp.session = s.id WHERE s.starts_at >= {:since} AND s.starts_at < {:until} GROUP BY l.name ORDER BY sessions DESC, reservations DESC LIMIT 10", { label: "", sessions: 0, reservations: 0, attendances: 0 }, { since: since, until: until });
    var timeSlots = breakdown("SELECT CASE WHEN CAST(strftime('%H', starts_at) AS INTEGER) < 6 THEN 'Nuit (UTC)' WHEN CAST(strftime('%H', starts_at) AS INTEGER) < 12 THEN 'Matin (UTC)' WHEN CAST(strftime('%H', starts_at) AS INTEGER) < 18 THEN 'Après-midi (UTC)' ELSE 'Soir (UTC)' END AS label, COUNT(DISTINCT s.id) AS sessions, COUNT(CASE WHEN sp.reservation_status IN ('reserved','attended','no_show') THEN 1 END) AS reservations, COUNT(CASE WHEN sp.reservation_status = 'attended' THEN 1 END) AS attendances FROM sessions s LEFT JOIN session_participants sp ON sp.session = s.id WHERE s.starts_at >= {:since} AND s.starts_at < {:until} GROUP BY label ORDER BY sessions DESC", { label: "", sessions: 0, reservations: 0, attendances: 0 }, { since: since, until: until });
    var openReports = countSql("SELECT COUNT(*) AS value FROM moderation_reports WHERE status IN ('open','reviewing')");
    var alerts = [];
    if (metrics.visits.change !== null && metrics.visits.change <= -0.2) alerts.push({ tone: "warning", title: "Trafic en baisse", copy: "Les visites reculent d'au moins 20 % par rapport à la période précédente.", href: "/management/analytics" });
    if (current.visits >= 10 && current.registrations === 0) alerts.push({ tone: "warning", title: "Aucune inscription", copy: "Le trafic récent ne produit aucune nouvelle inscription.", href: "/management/analytics" });
    if (current.registrations >= 3 && ratio(current.verifiedAccounts, current.registrations) < 0.5) alerts.push({ tone: "warning", title: "Vérification faible", copy: "Moins d'une inscription sur deux a validé son adresse e-mail.", href: "/management/users" });
    if (current.sessions >= 3 && ratio(current.reservations, current.sessions * 4) < 0.5) alerts.push({ tone: "info", title: "Sessions peu remplies", copy: "Le taux de remplissage est inférieur à 50 % sur la période.", href: "/management/sessions" });
    if (openReports > 0) alerts.push({ tone: "danger", title: "Modération à traiter", copy: openReports + " signalement(s) attendent une revue.", href: "/management/moderation" });
    if (!alerts.length) alerts.push({ tone: "success", title: "Aucun signal critique", copy: "Les principaux indicateurs ne demandent pas d'action immédiate.", href: "/management/system" });
    var recentSessions = e.app.findRecordsByFilter("sessions", "id != ''", "-starts_at", 6, 0).map(sessionDto);
    return e.json(200, { period: period, from: sinceDate.toISOString(), to: untilDate.toISOString(), metrics: metrics, current: current, ratios: { pagesPerVisit: ratio(current.pageViews, current.visits), visitToSignup: ratio(current.registrations, current.visits), verificationRate: ratio(current.verifiedAccounts, current.registrations), onboardingRate: ratio(current.onboardedAccounts, current.registrations), activationRate: ratio(current.activatedAccounts, current.registrations), fillRate: ratio(current.reservations, current.sessions * 4), attendanceRate: ratio(current.attendances, current.attendances + current.noShows), noShowRate: ratio(current.noShows, current.attendances + current.noShows) }, trend: trend, media: media, pages: pages, sources: sources, campaigns: campaigns, devices: devices, languages: languages, timeSlots: timeSlots, openReports: openReports, alerts: alerts, recentSessions: recentSessions });
  }
  if (section === "users") {
    var userWhere = search ? " WHERE LOWER(email || ' ' || display_name) LIKE {:search}" : "";
    var userParams = search ? { search: "%" + search + "%", limit: perPage, offset: (page - 1) * perPage } : { limit: perPage, offset: (page - 1) * perPage };
    var userTotal = countSql("SELECT COUNT(*) AS value FROM users" + userWhere, userParams);
    var userRows = sqlAll("SELECT id FROM users" + userWhere + " ORDER BY created DESC LIMIT {:limit} OFFSET {:offset}", { id: "" }, userParams);
    return e.json(200, paged(userRows.map((row) => userDto(e.app.findRecordById("users", row.id))), userTotal));
  }
  if (section === "user") {
    var userId = ntmy.requiredText(String(query.id || ""), "user id", 30);
    var target = e.app.findRecordById("users", userId);
    var targetDto = userDto(target);
    targetDto.sessions = e.app.findRecordsByFilter("session_participants", "user = {:user}", "-id", 100, 0, { user: target.id }).map((participant) => sessionDto(e.app.findRecordById("sessions", participant.getString("session"))));
    return e.json(200, targetDto);
  }
  if (section === "sessions") {
    var sessionWhere = search ? " WHERE LOWER(COALESCE(l.name,'') || ' ' || COALESCE(u.display_name,'') || ' ' || s.status) LIKE {:search}" : "";
    var sessionParams = search ? { search: "%" + search + "%", limit: perPage, offset: (page - 1) * perPage } : { limit: perPage, offset: (page - 1) * perPage };
    var sessionFrom = " FROM sessions s LEFT JOIN languages l ON l.id = s.language LEFT JOIN users u ON u.id = s.host";
    var sessionTotal = countSql("SELECT COUNT(*) AS value" + sessionFrom + sessionWhere, sessionParams);
    var sessionRows = sqlAll("SELECT s.id AS id" + sessionFrom + sessionWhere + " ORDER BY s.starts_at DESC LIMIT {:limit} OFFSET {:offset}", { id: "" }, sessionParams);
    return e.json(200, paged(sessionRows.map((row) => sessionDto(e.app.findRecordById("sessions", row.id))), sessionTotal));
  }
  if (section === "session") return e.json(200, sessionDto(e.app.findRecordById("sessions", ntmy.requiredText(String(query.id || ""), "session id", 30))));
  if (section === "moderation") {
    var reportTotal = countSql("SELECT COUNT(*) AS value FROM moderation_reports");
    var reports = e.app.findRecordsByFilter("moderation_reports", "id != ''", "-created_at,-id", perPage, (page - 1) * perPage);
    var reportItems = reports.map((report) => ({ id: report.id, reporterId: report.getString("reporter"), reporterName: userName(report.getString("reporter")), reportedUserId: report.getString("reported_user") || null, reportedUserName: report.getString("reported_user") ? userName(report.getString("reported_user")) : null, sessionId: report.getString("session") || null, reason: report.getString("reason"), details: report.getString("details"), status: report.getString("status"), createdAt: report.getString("created_at") || null }));
    return e.json(200, paged(reportItems, reportTotal));
  }
  if (section === "system") {
    var failedNotifications = countSql("SELECT COUNT(*) AS value FROM notifications WHERE delivery_status = 'failed'");
    var failedWebhooks = countSql("SELECT COUNT(*) AS value FROM webhook_events WHERE processing_status = 'failed'");
    var lastWebhook = e.app.findRecordsByFilter("webhook_events", "id != ''", "-processed_at", 1, 0)[0] || null;
    var heartbeats = e.app.findRecordsByFilter("management_service_heartbeats", "id != ''", "service", 10, 0);
    var heartbeatMap = {}; heartbeats.forEach((heartbeat) => { heartbeatMap[heartbeat.getString("service")] = heartbeat.getString("last_seen_at"); });
    return e.json(200, { failedNotifications: failedNotifications, failedWebhooks: failedWebhooks, lastWebhookAt: lastWebhook ? lastWebhook.getString("processed_at") : null, notificationWorkerLastSeenAt: heartbeatMap.notification_worker || null, liveKitWorkerLastSeenAt: heartbeatMap.livekit_worker || null });
  }
  throw new BadRequestError("Unknown management section");
});

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
      if (hasMinimumConfirmedAttendance(txApp, current.id)) {
        incrementVerifiedCompletedSessionCount(txApp);
      }
      current.set("status", "completed");
      txApp.save(current);
      audit(txApp, "", "session_completed", "session", current.id, {});
    });
  });
});

// Detailed anonymous analytics are short-lived. Daily aggregates contain no
// visitor identifier and remain available for long-term trends.
cronAdd("ntmy-prune-private-analytics", "17 3 * * *", () => {
  var ntmy = require(__hooks + "/ntmy.js");
  var cutoff = ntmy.dateValue(new Date(Date.now() - 90 * 86400000));
  $app.runInTransaction((txApp) => {
    txApp.findRecordsByFilter("analytics_page_views", "occurred_at < {:cutoff}", "occurred_at", 1000, 0, { cutoff: cutoff }).forEach((record) => txApp.delete(record));
    txApp.findRecordsByFilter("analytics_visits", "last_seen_at < {:cutoff}", "last_seen_at", 1000, 0, { cutoff: cutoff }).forEach((record) => txApp.delete(record));
    txApp.findRecordsByFilter("management_auth_events", "occurred_at < {:cutoff}", "occurred_at", 1000, 0, { cutoff: cutoff }).forEach((record) => txApp.delete(record));
  });
});
