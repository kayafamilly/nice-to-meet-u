import { createHash } from "node:crypto";
import { createRequire } from "node:module";

// The integration harness lives outside the web workspace. Resolve the SDK
// from that workspace explicitly so the test keeps working with pnpm's strict
// dependency isolation instead of relying on a hoisted package.
const webRequire = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { AccessToken, RoomServiceClient } = webRequire("livekit-server-sdk");

const baseUrl = process.env.POCKETBASE_BASE_URL ?? "http://127.0.0.1:8090";
const nextWebhookBaseUrl = process.env.NEXT_WEBHOOK_BASE_URL;
const suffix = `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;
const password = "integration-password-123";
let adminToken = "";

function sessionStart(hoursFromNow) {
  const value = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  value.setUTCMinutes(Math.ceil(value.getUTCMinutes() / 15) * 15, 0, 0);
  return value.toISOString();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, options = {}, token) {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(new URL(path, baseUrl), { ...options, headers });
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { body, status: response.status };
}

async function expectStatus(path, expectedStatus, options = {}, token) {
  const result = await request(path, options, token);
  assert(result.status === expectedStatus, `${options.method ?? "GET"} ${path} returned ${result.status}, expected ${expectedStatus}: ${JSON.stringify(result.body)}`);
  return result.body;
}

async function listRecords(collection, query, token) {
  const search = new URLSearchParams(query);
  return expectStatus(`/api/collections/${collection}/records?${search}`, 200, { method: "GET" }, token);
}

async function verifyUser(email) {
  assert(adminToken, "PocketBase superuser authentication is required to verify test users");
  const page = await listRecords("users", { filter: `email = "${email}"`, perPage: "1" }, adminToken);
  const user = page.items[0];
  assert(user, `The test user ${email} was not created`);
  await expectStatus(`/api/collections/users/records/${user.id}`, 200, {
    method: "PATCH",
    body: JSON.stringify({ verified: true })
  }, adminToken);
}

async function createUser(label, nativeLanguageId, targetLanguageId) {
  const email = `${label}-${suffix}@example.test`;
  await expectStatus("/api/ntmy/auth/register", 201, {
    method: "POST",
    body: JSON.stringify({
      displayName: `Integration ${label}`,
      email,
      password,
      passwordConfirm: password,
      isAdultConfirmed: true
    })
  });
  await verifyUser(email);

  const auth = await expectStatus("/api/collections/users/auth-with-password", 200, {
    method: "POST",
    body: JSON.stringify({ identity: email, password })
  });
  assert(typeof auth?.token === "string" && auth.token.length > 20, `Authentication did not return a token for ${label}`);

  await expectStatus("/api/ntmy/onboarding", 200, {
    method: "POST",
    body: JSON.stringify({
      nativeLanguageId,
      targetLanguageId,
      targetLevel: "intermediate",
      timeZone: "Europe/Paris",
      communityRulesAccepted: true
    })
  }, auth.token);

  return auth.token;
}

async function deliverSignedLiveKitWebhook(payload) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  assert(nextWebhookBaseUrl && apiKey && apiSecret, "Integration webhook checks require a running Next BFF and the local LiveKit signing pair");

  const rawBody = JSON.stringify(payload);
  const token = new AccessToken(apiKey, apiSecret, { ttl: 60 });
  token.sha256 = createHash("sha256").update(rawBody).digest("base64");
  const response = await fetch(new URL("/api/livekit/webhook", nextWebhookBaseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: await token.toJwt() },
    body: rawBody
  });
  const responseBody = await response.text();
  assert(response.status === 200, `Signed LiveKit webhook through Next returned ${response.status}: ${responseBody}`);
}

async function expectUnsignedLiveKitWebhookRejected(payload) {
  assert(nextWebhookBaseUrl, "Integration webhook checks require a running Next BFF");
  const response = await fetch(new URL("/api/livekit/webhook", nextWebhookBaseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  assert(response.status === 401, `Unsigned LiveKit webhook through Next returned ${response.status}, expected 401`);
}

async function expectLiveKitHealthThroughBff() {
  assert(nextWebhookBaseUrl, "Integration checks require a running Next BFF");
  const response = await fetch(new URL("/api/health/livekit", nextWebhookBaseUrl));
  const body = await response.json();
  assert(response.status === 200 && body?.services?.livekit === "ok", `LiveKit health through Next returned ${response.status}: ${JSON.stringify(body)}`);
}

async function expectNotificationDispatchThroughBff() {
  const workerSecret = process.env.NOTIFICATION_WORKER_SECRET;
  assert(nextWebhookBaseUrl && workerSecret, "Notification dispatch checks require a running Next BFF and worker secret");
  const response = await fetch(new URL("/api/internal/notifications/dispatch", nextWebhookBaseUrl), {
    method: "POST",
    headers: { Authorization: `Bearer ${workerSecret}` }
  });
  const body = await response.text();
  assert(response.status === 200, `Notification dispatch through Next returned ${response.status}: ${body}`);
}

async function expectLiveKitLifecycleThroughBff() {
  const workerSecret = process.env.LIVEKIT_LIFECYCLE_WORKER_SECRET;
  const liveKitUrl = process.env.LIVEKIT_HTTP_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  assert(nextWebhookBaseUrl && workerSecret && liveKitUrl && apiKey && apiSecret, "LiveKit lifecycle checks require the BFF, worker secret and LiveKit credentials");
  const roomName = `integration-expired-${suffix}`;
  const roomService = new RoomServiceClient(liveKitUrl, apiKey, apiSecret);
  await roomService.createRoom({
    name: roomName,
    maxParticipants: 4,
    metadata: JSON.stringify({ sessionId: `integration-${suffix}`, endsAt: new Date(Date.now() - 1_000).toISOString() })
  });

  const unauthorized = await fetch(new URL("/api/internal/livekit/rooms/close-expired", nextWebhookBaseUrl), {
    method: "POST",
    headers: { Authorization: "Bearer invalid-worker-secret" }
  });
  assert(unauthorized.status === 401, `LiveKit lifecycle route accepted an invalid worker secret: ${unauthorized.status}`);

  const response = await fetch(new URL("/api/internal/livekit/rooms/close-expired", nextWebhookBaseUrl), {
    method: "POST",
    headers: { Authorization: `Bearer ${workerSecret}` }
  });
  const body = await response.json();
  assert(response.status === 200 && body.closed >= 1 && body.failed === 0, `LiveKit lifecycle cleanup failed: ${response.status} ${JSON.stringify(body)}`);
  const remaining = await roomService.listRooms();
  assert(!remaining.some((room) => room.name === roomName), "The expired LiveKit room still exists after lifecycle cleanup");
}

async function createBffClient() {
  assert(nextWebhookBaseUrl, "BFF checks require a running Next.js server");
  const cookies = new Map();
  async function requestBff(path, options = {}) {
    const headers = new Headers(options.headers);
    headers.set("Origin", nextWebhookBaseUrl);
    const cookieHeader = [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
    if (cookieHeader) headers.set("Cookie", cookieHeader);
    const response = await fetch(new URL(path, nextWebhookBaseUrl), { ...options, headers });
    const setCookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [response.headers.get("set-cookie")].filter(Boolean);
    setCookies.forEach((setCookie) => {
      const match = /^([^=;]+)=([^;]*)/.exec(setCookie);
      if (match) cookies.set(match[1], match[2]);
    });
    const text = await response.text();
    const body = response.headers.get("content-type")?.includes("application/json") && text ? JSON.parse(text) : text || null;
    return { status: response.status, body };
  }
  await requestBff("/");
  return { requestBff, csrf: () => cookies.get("ntmy-csrf") };
}

async function main() {
  const adminEmail = process.env.POCKETBASE_SUPERUSER_EMAIL;
  const adminPassword = process.env.POCKETBASE_SUPERUSER_PASSWORD;
  assert(adminEmail && adminPassword, "Integration checks require PocketBase superuser credentials");
  const adminAuth = await expectStatus("/api/collections/_superusers/auth-with-password", 200, {
    method: "POST",
    body: JSON.stringify({ identity: adminEmail, password: adminPassword })
  });
  adminToken = adminAuth.token;

  await expectStatus("/api/health", 200);
  await expectLiveKitHealthThroughBff();
  await expectNotificationDispatchThroughBff();
  await expectLiveKitLifecycleThroughBff();

  const bootstrapEmail = `bootstrap-${suffix}@example.test`;
  const bootstrap = await expectStatus("/api/ntmy/auth/register", 201, {
    method: "POST",
    body: JSON.stringify({
      displayName: "Integration bootstrap",
      email: bootstrapEmail,
      password,
      passwordConfirm: password,
      isAdultConfirmed: true
    })
  });
  assert(bootstrap?.created === true, "Registration route did not return its DTO");
  await expectStatus("/api/collections/users/auth-with-password", 403, {
    method: "POST",
    body: JSON.stringify({ identity: bootstrapEmail, password })
  });
  await verifyUser(bootstrapEmail);

  const bootstrapAuth = await expectStatus("/api/collections/users/auth-with-password", 200, {
    method: "POST",
    body: JSON.stringify({ identity: bootstrapEmail, password })
  });
  const languages = await expectStatus("/api/ntmy/languages", 200, { method: "GET" }, bootstrapAuth.token);
  const english = languages.find((language) => language.code === "en");
  const french = languages.find((language) => language.code === "fr");
  const german = languages.find((language) => language.code === "de");
  const italian = languages.find((language) => language.code === "it");
  const mandarin = languages.find((language) => language.code === "cmn" && language.name === "Mandarin Chinese");
  const cantonese = languages.find((language) => language.code === "yue" && language.name === "Cantonese");
  const bhojpuri = languages.find((language) => language.code === "bho" && language.name === "Bhojpuri");
  const javanese = languages.find((language) => language.code === "jv" && language.name === "Javanese");
  assert(languages.length >= 250 && english && french && german && italian && mandarin && cantonese && bhojpuri && javanese, "The active language catalogue must provide broad modern international coverage");
  assert(!languages.some((language) => /^(ancient|old|middle) |^chinese$|\(regional\)|\(tagalog\)/i.test(language.name)), "The global catalogue must not expose historical, duplicated or ambiguous language names");
  assert(languages.filter((language) => language.name === "French").length === 1, "French must be exposed as one clear modern language");

  // Exercise the browser-facing BFF contract without ever allowing direct
  // browser access to PocketBase records.
  const bff = await createBffClient();
  const bffEmail = `bff-${suffix}@example.test`;
  const bffRegister = await bff.requestBff("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": bff.csrf() }, body: JSON.stringify({ displayName: "BFF contract", email: bffEmail, password, isAdultConfirmed: true }) });
  assert(bffRegister.status === 201 && bffRegister.body?.verificationRequired === true && typeof bffRegister.body?.emailSent === "boolean", `BFF registration must require email verification: ${JSON.stringify(bffRegister.body)}`);
  const bffSessionBeforeVerification = await bff.requestBff("/api/auth/session");
  assert(bffSessionBeforeVerification.status === 401, "BFF registration must not create a browser session before email verification");
  const bffUnverifiedLogin = await bff.requestBff("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": bff.csrf() }, body: JSON.stringify({ email: bffEmail, password }) });
  assert(bffUnverifiedLogin.status === 403 && bffUnverifiedLogin.body?.error === "EMAIL_VERIFICATION_REQUIRED", `Unverified BFF login returned an unexpected response: ${JSON.stringify(bffUnverifiedLogin.body)}`);
  await verifyUser(bffEmail);
  const bffLogin = await bff.requestBff("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": bff.csrf() }, body: JSON.stringify({ email: bffEmail, password }) });
  assert(bffLogin.status === 200 && bffLogin.body?.authenticated === true, `Verified BFF login failed: ${JSON.stringify(bffLogin.body)}`);
  const bffOnboarding = await bff.requestBff("/api/app/onboarding", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": bff.csrf() }, body: JSON.stringify({ nativeLanguageIds: [english.id], practiceLanguages: [{ languageId: french.id, level: "beginner" }, { languageId: italian.id, level: "advanced" }], timeZone: "Europe/Paris", communityRulesAccepted: true }) });
  assert(bffOnboarding.status === 200, `BFF onboarding failed: ${JSON.stringify(bffOnboarding.body)}`);
  const invalidSlot = new Date(Date.now() + 3 * 60 * 60 * 1000);
  invalidSlot.setUTCMinutes(7, 0, 0);
  const bffInvalidSlot = await bff.requestBff("/api/app/sessions", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": bff.csrf() }, body: JSON.stringify({ languageId: german.id, startsAt: invalidSlot.toISOString(), note: "German introductions" }) });
  assert(bffInvalidSlot.status === 400, "Create must reject times outside 15-minute slots");
  const nextYear = new Date(Date.UTC(new Date().getUTCFullYear() + 1, 0, 2, 12, 0, 0));
  const bffNextYear = await bff.requestBff("/api/app/sessions", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": bff.csrf() }, body: JSON.stringify({ languageId: german.id, startsAt: nextYear.toISOString(), note: "German introductions" }) });
  assert(bffNextYear.status === 400, "Create must reject a date outside the current calendar year");
  const bffCreated = await bff.requestBff("/api/app/sessions", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": bff.csrf() }, body: JSON.stringify({ languageId: german.id, startsAt: sessionStart(8), note: "Meet and practise simple greetings." }) });
  assert(bffCreated.status === 201 && bffCreated.body?.languageId === german.id && bffCreated.body?.note === "Meet and practise simple greetings.", "BFF Create must return a safe session DTO with its optional note");
  assert(bffCreated.body?.viewerReservationStatus === "reserved" && bffCreated.body?.viewerRole === "practice", "Created sessions must identify the creator's reservation safely");
  const bffLanguages = await bff.requestBff("/api/app/languages");
  const activeGerman = bffLanguages.body.find((language) => language.id === german.id);
  assert(bffLanguages.status === 200 && activeGerman.upcomingSessionCount > 0 && !Number.isNaN(Date.parse(activeGerman.nextSessionStartsAt)), "Languages with upcoming sessions must expose activity metadata");
  const bffJoin = await bff.requestBff(`/api/app/sessions?languageId=${german.id}`);
  assert(bffJoin.status === 200 && bffJoin.body.some((entry) => entry.id === bffCreated.body.id), "Join BFF language filter did not return the newly created session");
  const bffJoinPrimaryLanguage = await bff.requestBff(`/api/app/sessions?languageId=${french.id}`);
  assert(bffJoinPrimaryLanguage.status === 200 && bffJoinPrimaryLanguage.body.some((entry) => entry.id === bffCreated.body.id && entry.viewerReservationStatus === "reserved"), "Join must keep the viewer's reserved session visible when filtering another language");
  const bffDetail = await bff.requestBff(`/api/app/sessions/${bffCreated.body.id}`);
  assert(bffDetail.status === 200 && bffDetail.body.viewerReservationStatus === "reserved", "Session detail BFF must expose only the viewer's reservation state");
  const bffProfile = await bff.requestBff("/api/app/profile");
  assert(bffProfile.status === 200 && bffProfile.body.nativeLanguages[0].id === english.id, "BFF profile must expose safe native-language DTOs");
  assert(bffProfile.body.reservationUsage.active === 1 && bffProfile.body.reservationUsage.limit === 3, "BFF profile must expose the three-reservation usage");
  assert(bffProfile.body.practiceLanguages.map((language) => language.id).join(",") === `${french.id},${italian.id}`, "Practice-language order must match onboarding");
  const bffProfileUpdate = await bff.requestBff("/api/app/profile", { method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": bff.csrf() }, body: JSON.stringify({ practiceLanguages: [{ languageId: italian.id, level: "advanced" }, { languageId: french.id, level: "beginner" }], timeZone: "Europe/Paris" }) });
  assert(bffProfileUpdate.status === 200, "BFF profile update failed");
  const bffUpdatedProfile = await bff.requestBff("/api/app/profile");
  assert(bffUpdatedProfile.body.practiceLanguages.map((language) => language.id).join(",") === `${italian.id},${french.id}`, "Practice-language order must remain stable after an update");
  const bffHistory = await bff.requestBff("/api/app/profile/sessions");
  assert(bffHistory.status === 200 && bffHistory.body.upcoming.find((entry) => entry.id === bffCreated.body.id)?.role === "practice", "BFF history must preserve an existing reservation role");
  const bffVapid = await bff.requestBff("/api/app/push-subscriptions/public-key");
  assert(bffVapid.status === 200 && typeof bffVapid.body.publicKey === "string", "VAPID public key must be provided only through the authenticated BFF");
  const bffPush = await bff.requestBff("/api/app/push-subscriptions", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": bff.csrf() }, body: JSON.stringify({ endpoint: `https://push.example.test/${suffix}`, keys: { p256dh: "test-p256dh", auth: "test-auth" } }) });
  assert(bffPush.status === 201, "BFF push subscription failed");
  const bffNotifications = await bff.requestBff("/api/app/notifications");
  assert(bffNotifications.status === 200 && bffNotifications.body.notifications.some((notification) => notification.kind === "reservation_confirmation"), "BFF notification centre did not return the confirmation event");
  const bffConfirmation = bffNotifications.body.notifications.find((notification) => notification.kind === "reservation_confirmation");
  assert(!Number.isNaN(Date.parse(bffConfirmation.createdAt)), "Notification DTOs must always expose a valid creation date");
  const bffNotificationRead = await bff.requestBff(`/api/app/notifications/${bffConfirmation.id}/read`, { method: "POST", headers: { "X-CSRF-Token": bff.csrf() } });
  assert(bffNotificationRead.status === 200, `BFF notification read failed: ${JSON.stringify(bffNotificationRead.body)}`);
  const passwordReset = await bff.requestBff("/api/auth/password-reset/request", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": bff.csrf() }, body: JSON.stringify({ email: `unknown-${suffix}@example.test` }) });
  assert(passwordReset.status === 200 && passwordReset.body?.accepted === true, "Password reset requests must return a non-enumerating success response");
  const bffDelete = await bff.requestBff("/api/app/profile", { method: "DELETE", headers: { "X-CSRF-Token": bff.csrf() } });
  assert(bffDelete.status === 200, "BFF anonymized deletion failed");
  const bffSession = await bff.requestBff("/api/auth/session");
  assert(bffSession.status === 401, "BFF deletion must revoke the browser session");

  // Direct collection access must remain forbidden even for a regular PB token.
  await expectStatus("/api/collections/sessions/records", 403, { method: "GET" }, bootstrapAuth.token);

  const host = await createUser("host", english.id, french.id);
  const secondNative = await createUser("native", english.id, french.id);
  const independentHost = await createUser("independent-host", english.id, french.id);
  const practiceOne = await createUser("practice-one", french.id, english.id);
  const practiceTwo = await createUser("practice-two", french.id, english.id);
  const practiceOverflow = await createUser("practice-overflow", french.id, english.id);

  await expectStatus("/api/ntmy/onboarding", 409, {
    method: "POST",
    body: JSON.stringify({
      nativeLanguageId: english.id,
      targetLanguageId: french.id,
      targetLevel: "intermediate",
      timeZone: "Europe/Paris",
      communityRulesAccepted: true
    })
  }, host);
  await expectStatus("/api/ntmy/sessions", 400, {
    method: "POST",
    body: JSON.stringify({ languageId: english.id, startsAt: sessionStart(2), note: "x".repeat(501) })
  }, host);

  const created = await expectStatus("/api/ntmy/sessions", 201, {
    method: "POST",
    body: JSON.stringify({
      languageId: english.id,
      startsAt: sessionStart(3),
      note: "A relaxed English practice group."
    })
  }, host);
  assert(typeof created?.id === "string", "Session creation did not return a safe session DTO");
  await expectStatus(`/api/ntmy/sessions/${created.id}/cancel-reservation`, 400, { method: "POST" }, host);

  // The room name remains private, so a second successful creation through a
  // distinct host is the observable contract that proves it is unique.
  const independentlyCreated = await expectStatus("/api/ntmy/sessions", 201, {
    method: "POST",
    body: JSON.stringify({
      languageId: english.id,
      startsAt: sessionStart(4),
      note: "A second relaxed English practice group."
    })
  }, independentHost);
  assert(independentlyCreated?.id !== created.id, "Distinct sessions must receive distinct identifiers");

  const concurrentReservations = await Promise.all([
    request(`/api/ntmy/sessions/${created.id}/reserve`, { method: "POST" }, practiceOne),
    request(`/api/ntmy/sessions/${created.id}/reserve`, { method: "POST" }, practiceTwo),
    request(`/api/ntmy/sessions/${created.id}/reserve`, { method: "POST" }, practiceOverflow)
  ]);
  const statuses = concurrentReservations.map((result) => result.status).sort((left, right) => left - right);
  assert(statuses.join(",") === "200,200,200", `Three practice members must be allowed to join the same group: ${statuses.join(",")}`);
  await expectStatus(`/api/ntmy/sessions/${created.id}/reserve`, 409, { method: "POST" }, secondNative);
  await expectStatus(`/api/ntmy/sessions/${created.id}/cancel`, 409, { method: "POST" }, host);

  const sessions = await expectStatus("/api/ntmy/sessions", 200, { method: "GET" }, host);
  const session = sessions.find((candidate) => candidate.id === created.id);
  assert(session?.participantCount === 4 && session.nativeCount === 1 && session.practiceCount === 3 && session.hostCanCancel === false, `Reservation DTO does not reflect the open 2-to-4-person composition: ${JSON.stringify(session)}`);
  await expectStatus(`/api/ntmy/sessions/${created.id}/cancel-reservation`, 200, { method: "POST" }, practiceOne);
  await expectStatus(`/api/ntmy/sessions/${created.id}/reserve`, 200, { method: "POST" }, secondNative);

  const lockHostOne = await createUser("lock-host-one", english.id, french.id);
  const lockHostTwo = await createUser("lock-host-two", english.id, french.id);
  const lockCandidate = await createUser("lock-candidate", english.id, french.id);
  const lockSessionOne = await expectStatus("/api/ntmy/sessions", 201, { method: "POST", body: JSON.stringify({ languageId: english.id, startsAt: sessionStart(9), note: "Morning exchange" }) }, lockHostOne);
  const lockSessionTwo = await expectStatus("/api/ntmy/sessions", 201, { method: "POST", body: JSON.stringify({ languageId: english.id, startsAt: sessionStart(10), note: "Lunch exchange" }) }, lockHostTwo);
  const lockSessionThree = await expectStatus("/api/ntmy/sessions", 201, { method: "POST", body: JSON.stringify({ languageId: english.id, startsAt: sessionStart(11), note: "Afternoon exchange" }) }, lockHostOne);
  const lockSessionFour = await expectStatus("/api/ntmy/sessions", 201, { method: "POST", body: JSON.stringify({ languageId: english.id, startsAt: sessionStart(12), note: "Evening exchange" }) }, lockHostTwo);
  const firstThreeReservations = await Promise.all([
    request(`/api/ntmy/sessions/${lockSessionOne.id}/reserve`, { method: "POST" }, lockCandidate),
    request(`/api/ntmy/sessions/${lockSessionTwo.id}/reserve`, { method: "POST" }, lockCandidate),
    request(`/api/ntmy/sessions/${lockSessionThree.id}/reserve`, { method: "POST" }, lockCandidate)
  ]);
  assert(firstThreeReservations.every((result) => result.status === 200), "A user must be able to hold three non-overlapping reservations");
  await expectStatus(`/api/ntmy/sessions/${lockSessionFour.id}/reserve`, 409, { method: "POST" }, lockCandidate);
  await expectStatus(`/api/ntmy/sessions/${lockSessionOne.id}/cancel-reservation`, 200, { method: "POST" }, lockCandidate);
  const releasedReservation = await expectStatus(`/api/ntmy/sessions/${lockSessionFour.id}/reserve`, 200, { method: "POST" }, lockCandidate);
  assert(releasedReservation.viewerReservationStatus === "reserved", "Cancelling must release one of the three reservation slots");

  const openAccessCandidate = await createUser("open-access-candidate", french.id, english.id);
  await expectStatus(`/api/ntmy/sessions/${lockSessionOne.id}/reserve`, 200, { method: "POST" }, openAccessCandidate);
  await expectStatus(`/api/ntmy/sessions/${lockSessionTwo.id}/reserve`, 200, { method: "POST" }, openAccessCandidate);

  const overlapCandidate = await createUser("overlap-candidate", english.id, french.id);
  const overlappingOne = await expectStatus("/api/ntmy/sessions", 201, {
    method: "POST",
    body: JSON.stringify({ languageId: english.id, startsAt: sessionStart(13), note: "Overlapping morning exchange" })
  }, lockHostOne);
  const overlappingTwo = await expectStatus("/api/ntmy/sessions", 201, {
    method: "POST",
    body: JSON.stringify({ languageId: english.id, startsAt: sessionStart(13), note: "Overlapping culture exchange" })
  }, lockHostTwo);
  await expectStatus(`/api/ntmy/sessions/${overlappingOne.id}/reserve`, 200, { method: "POST" }, overlapCandidate);
  await expectStatus(`/api/ntmy/sessions/${overlappingTwo.id}/reserve`, 409, { method: "POST" }, overlapCandidate);
  const ongoingStart = new Date(Date.now() - 60_000);
  const ongoingEnd = new Date(Date.now() + 29 * 60_000);
  const nextStart = new Date(Date.now() + 10 * 60_000);
  const nextEnd = new Date(Date.now() + 40 * 60_000);
  await expectStatus(`/api/collections/sessions/records/${overlappingOne.id}`, 200, {
    method: "PATCH",
    body: JSON.stringify({ starts_at: ongoingStart.toISOString(), ends_at: ongoingEnd.toISOString() })
  }, adminAuth.token);
  await expectStatus(`/api/collections/sessions/records/${overlappingTwo.id}`, 200, {
    method: "PATCH",
    body: JSON.stringify({ starts_at: nextStart.toISOString(), ends_at: nextEnd.toISOString() })
  }, adminAuth.token);
  await expectStatus(`/api/ntmy/sessions/${overlappingTwo.id}/reserve`, 409, { method: "POST" }, overlapCandidate);

  const notifications = await expectStatus("/api/ntmy/notifications", 200, { method: "GET" }, host);
  const confirmation = notifications.notifications.find((notification) => notification.kind === "reservation_confirmation");
  const fullNotifications = notifications.notifications.filter((notification) => notification.kind === "session_full");
  assert(confirmation && !Number.isNaN(Date.parse(confirmation.createdAt)) && notifications.notifications.some((notification) => notification.kind === "session_ready") && fullNotifications.length === 2 && notifications.unreadCount > 0, "Reservation and each distinct group-ready/full transition must be written with valid dates");
  await expectStatus(`/api/ntmy/notifications/${confirmation.id}/read`, 200, { method: "POST" }, host);

  // The primary practice language is only a Join preference. A native English
  // speaker can create a German session as Practice, then change their primary
  // preference without rewriting the recorded reservation role.
  const universalPractice = await createUser("universal-practice", english.id, french.id);
  const germanSession = await expectStatus("/api/ntmy/sessions", 201, {
    method: "POST",
    body: JSON.stringify({ languageId: german.id, startsAt: sessionStart(5), note: "German culture" })
  }, universalPractice);
  await expectStatus("/api/ntmy/profile", 200, {
    method: "PATCH",
    body: JSON.stringify({ targetLanguageId: italian.id, targetLevel: "advanced", timeZone: "Europe/Paris" })
  }, universalPractice);
  const universalHistory = await expectStatus("/api/ntmy/profile/sessions", 200, { method: "GET" }, universalPractice);
  assert(universalHistory.upcoming.find((entry) => entry.id === germanSession.id)?.role === "practice", "Changing the primary practice language must preserve future reservation roles");

  const deletionUser = await createUser("anonymized", english.id, french.id);
  const deletionSession = await expectStatus("/api/ntmy/sessions", 201, {
    method: "POST",
    body: JSON.stringify({ languageId: german.id, startsAt: sessionStart(6), note: "German travel" })
  }, deletionUser);
  const deletionGuest = await createUser("anonymized-guest", german.id, french.id);
  await expectStatus(`/api/ntmy/sessions/${deletionSession.id}/reserve`, 200, { method: "POST" }, deletionGuest);
  await expectStatus(`/api/ntmy/sessions/${deletionSession.id}/cancel`, 409, { method: "POST" }, deletionUser);
  await expectStatus("/api/ntmy/profile", 409, { method: "DELETE" }, deletionUser);
  await expectStatus(`/api/ntmy/sessions/${deletionSession.id}/cancel-reservation`, 200, { method: "POST" }, deletionGuest);
  await expectStatus("/api/ntmy/profile", 200, { method: "DELETE" }, deletionUser);
  await expectStatus("/api/ntmy/me", 401, { method: "GET" }, deletionUser);
  const cancelledHostedSession = await expectStatus(`/api/ntmy/sessions/${deletionSession.id}`, 200, { method: "GET" }, deletionGuest);
  assert(cancelledHostedSession.status === "cancelled" && cancelledHostedSession.viewerReservationStatus === "cancelled", "Deleting a host must cancel the hosted session and every active reservation");
  await expectStatus("/api/ntmy/moderation/reports", 403, {
    method: "POST",
    body: JSON.stringify({ sessionId: deletionSession.id, reason: "other", details: "A cancelled reservation is not attendance." })
  }, deletionGuest);

  const deletedParticipant = (await listRecords("session_participants", { filter: `session = "${deletionSession.id}"`, perPage: "10" }, adminAuth.token)).items[0];
  assert(deletedParticipant?.reservation_status === "cancelled", "Deleting an account must cancel future reservations");
  const rawSession = await expectStatus(`/api/collections/sessions/records/${created.id}`, 200, { method: "GET" }, adminAuth.token);
  const rawParticipants = await listRecords("session_participants", {
    filter: `session = "${created.id}"`,
    perPage: "10"
  }, adminAuth.token);
  const cancelledWebhookParticipant = rawParticipants.items.find((participant) => participant.reservation_status === "cancelled");
  const webhookParticipant = rawParticipants.items.find((participant) => participant.reservation_status === "reserved");
  assert(cancelledWebhookParticipant?.id && webhookParticipant?.id && rawSession?.room_name, "Superuser query did not return the internal LiveKit mapping");

  const lobbyStart = new Date(Date.now() + 5 * 60_000);
  const lobbyEnd = new Date(lobbyStart.getTime() + 30 * 60_000);
  await expectStatus(`/api/collections/sessions/records/${created.id}`, 200, {
    method: "PATCH",
    body: JSON.stringify({ starts_at: lobbyStart.toISOString(), ends_at: lobbyEnd.toISOString() })
  }, adminAuth.token);
  await expectStatus(`/api/ntmy/sessions/${created.id}/join-authorize`, 403, { method: "POST" }, host);

  const liveStart = new Date(Date.now() - 60_000);
  const liveEnd = new Date(Date.now() + 29 * 60_000);
  await expectStatus(`/api/collections/sessions/records/${created.id}`, 200, {
    method: "PATCH",
    body: JSON.stringify({ starts_at: liveStart.toISOString(), ends_at: liveEnd.toISOString() })
  }, adminAuth.token);
  const liveAuthorization = await expectStatus(`/api/ntmy/sessions/${created.id}/join-authorize`, 200, { method: "POST" }, host);
  assert(liveAuthorization.startsAt && liveAuthorization.endsAt && liveAuthorization.roomName === rawSession.room_name, "Live authorization did not return its strict media window");

  await expectStatus(`/api/collections/sessions/records/${created.id}`, 200, {
    method: "PATCH",
    body: JSON.stringify({ starts_at: new Date(Date.now() - 31 * 60_000).toISOString(), ends_at: new Date(Date.now() - 60_000).toISOString() })
  }, adminAuth.token);
  await expectStatus(`/api/ntmy/sessions/${created.id}/join-authorize`, 403, { method: "POST" }, host);

  await expectStatus(`/api/collections/sessions/records/${created.id}`, 200, {
    method: "PATCH",
    body: JSON.stringify({ starts_at: liveStart.toISOString(), ends_at: liveEnd.toISOString() })
  }, adminAuth.token);

  const cancelledWebhookPayload = {
    id: `integration-cancelled-webhook-${suffix}`,
    event: "participant_joined",
    createdAt: Math.floor(Date.now() / 1000),
    room: { name: rawSession.room_name },
    participant: { identity: cancelledWebhookParticipant.id, name: "Cancelled integration participant" }
  };
  await deliverSignedLiveKitWebhook(cancelledWebhookPayload);
  const cancelledWebhookEvents = await listRecords("webhook_events", {
    filter: `event_id = "${cancelledWebhookPayload.id}"`,
    perPage: "1"
  }, adminAuth.token);
  const cancelledEvidence = await listRecords("attendance_evidence", {
    filter: `webhook_event = "${cancelledWebhookEvents.items[0].id}"`,
    perPage: "1"
  }, adminAuth.token);
  assert(cancelledEvidence.totalItems === 0, "A cancelled reservation recreated attendance evidence from a delayed LiveKit event");

  const webhookPayload = {
    id: `integration-webhook-${suffix}`,
    event: "participant_joined",
    createdAt: Math.floor(Date.now() / 1000),
    room: { name: rawSession.room_name },
    participant: { identity: webhookParticipant.id, name: "Integration webhook participant" }
  };
  await expectUnsignedLiveKitWebhookRejected(webhookPayload);
  // This crosses the actual provider boundary: a LiveKit-compatible signed
  // webhook is verified by Next.js, then forwarded with the server-only
  // internal secret to PocketBase.
  await deliverSignedLiveKitWebhook(webhookPayload);

  const webhookEvents = await listRecords("webhook_events", {
    filter: `event_id = "${webhookPayload.id}"`,
    perPage: "1"
  }, adminAuth.token);
  const webhookEvent = webhookEvents.items[0];
  assert(webhookEvent?.id, "The webhook was not persisted");
  await expectStatus(`/api/collections/webhook_events/records/${webhookEvent.id}`, 200, {
    method: "PATCH",
    body: JSON.stringify({
      processing_status: "processing",
      processing_started_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      processing_attempt: "forced-expired-attempt"
    })
  }, adminAuth.token);
  await deliverSignedLiveKitWebhook(webhookPayload);

  const evidence = await listRecords("attendance_evidence", {
    filter: `webhook_event = "${webhookEvent.id}"`,
    perPage: "10"
  }, adminAuth.token);
  assert(evidence.totalItems === 1, "A reclaimed LiveKit event created duplicate attendance evidence");
  const recoveredWebhook = await expectStatus(`/api/collections/webhook_events/records/${webhookEvent.id}`, 200, { method: "GET" }, adminAuth.token);
  assert(recoveredWebhook.processing_status === "processed", "An expired webhook processing lease was not recovered");
  assert(recoveredWebhook.processing_attempt !== "forced-expired-attempt", "A reclaimed webhook did not fence the expired processing attempt");

  process.stdout.write("PocketBase integration checks passed.\n");
}

await main();
