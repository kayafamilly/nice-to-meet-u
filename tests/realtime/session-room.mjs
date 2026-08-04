import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const webRequire = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { chromium } = webRequire("@playwright/test");
const { AccessToken, RoomServiceClient, TrackSource } = webRequire("livekit-server-sdk");
const liveKitClientUmdPath = join(dirname(webRequire.resolve("livekit-client")), "livekit-client.umd.js");

const pocketBaseUrl = process.env.POCKETBASE_BASE_URL ?? "http://127.0.0.1:8090";
const appUrl = process.env.NEXT_WEBHOOK_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000";
const adminEmail = process.env.POCKETBASE_SUPERUSER_EMAIL;
const adminPassword = process.env.POCKETBASE_SUPERUSER_PASSWORD;
const liveKitHttpUrl = process.env.LIVEKIT_HTTP_URL ?? "http://127.0.0.1:7880";
const liveKitWsUrl = process.env.NEXT_PUBLIC_LIVEKIT_WS_URL ?? liveKitHttpUrl.replace(/^http/, "ws");
const liveKitApiKey = process.env.LIVEKIT_API_KEY ?? "devkey";
const liveKitApiSecret = process.env.LIVEKIT_API_SECRET ?? "local-dev-livekit-secret-0123456789abcdef";
const suffix = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
const password = "realtime-password-123";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function pbRequest(path, options = {}, token) {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(new URL(path, pocketBaseUrl), { ...options, headers });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${options.method ?? "GET"} ${path} returned ${response.status}: ${text}`);
  return body;
}

async function createMember(label, nativeLanguageId, practiceLanguageId) {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const email = `realtime-${slug}-${suffix}@example.test`;
  await pbRequest("/api/ntmy/auth/register", {
    method: "POST",
    body: JSON.stringify({
      displayName: `Realtime ${label}`,
      email,
      password,
      passwordConfirm: password,
      isAdultConfirmed: true
    })
  });
  const auth = await pbRequest("/api/collections/users/auth-with-password", {
    method: "POST",
    body: JSON.stringify({ identity: email, password })
  });
  await pbRequest("/api/ntmy/onboarding", {
    method: "POST",
    body: JSON.stringify({
      nativeLanguageId,
      targetLanguageId: practiceLanguageId,
      targetLevel: "intermediate",
      timeZone: "Europe/Paris",
      communityRulesAccepted: true
    })
  }, auth.token);
  return { email, token: auth.token };
}

async function waitUntil(timestamp) {
  const delay = timestamp - Date.now();
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
}

function decodeJwtPayload(token) {
  const segments = token.split(".");
  assert(segments.length === 3, "LiveKit returned an invalid participant token");
  return JSON.parse(Buffer.from(segments[1], "base64url").toString("utf8"));
}

function percentile95(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)];
}

async function main() {
  assert(adminEmail && adminPassword, "Realtime browser checks require PocketBase superuser credentials");
  const admin = await pbRequest("/api/collections/_superusers/auth-with-password", {
    method: "POST",
    body: JSON.stringify({ identity: adminEmail, password: adminPassword })
  });
  const languagePage = await pbRequest("/api/collections/languages/records?perPage=500&filter=is_active%3Dtrue", { method: "GET" }, admin.token);
  const english = languagePage.items.find((language) => language.code === "en");
  const french = languagePage.items.find((language) => language.code === "fr");
  const german = languagePage.items.find((language) => language.code === "de");
  assert(english && french && german, "Realtime test languages are missing");

  const members = await Promise.all([
    createMember("Host", english.id, french.id),
    createMember("Learner one", french.id, english.id),
    createMember("Native two", english.id, german.id),
    createMember("Learner two", german.id, english.id)
  ]);
  const scheduledStart = new Date(Date.now() + 3 * 60 * 60_000);
  scheduledStart.setUTCMinutes(Math.ceil(scheduledStart.getUTCMinutes() / 15) * 15, 0, 0);
  const session = await pbRequest("/api/ntmy/sessions", {
    method: "POST",
    body: JSON.stringify({ languageId: english.id, startsAt: scheduledStart.toISOString(), note: "Four-person realtime validation" })
  }, members[0].token);
  await Promise.all(members.slice(1).map((member) => pbRequest(`/api/ntmy/sessions/${session.id}/reserve`, { method: "POST" }, member.token)));

  const startsAt = Date.now() + 75_000;
  const endsAt = startsAt + 75_000;
  await pbRequest(`/api/collections/sessions/records/${session.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString()
    })
  }, admin.token);

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
      "--autoplay-policy=no-user-gesture-required"
    ]
  });
  const contexts = [];
  const diagnostics = new Map();
  const tokenLatencies = [];
  const connectionLatencies = [];
  const mediaLatencies = [];
  try {
    const pages = [];
    for (const [index, member] of members.entries()) {
      const context = await browser.newContext({
        baseURL: appUrl,
        permissions: ["camera", "microphone"],
        viewport: index === members.length - 1 ? { width: 390, height: 844 } : { width: 1280, height: 800 }
      });
      contexts.push(context);
      if (index === 0) {
        await context.addInitScript(() => {
          const sockets = [];
          Object.defineProperty(globalThis, "__ntmyLiveKitSockets", { configurable: true, value: sockets });
          const NativeWebSocket = globalThis.WebSocket;
          globalThis.WebSocket = new Proxy(NativeWebSocket, {
            construct(target, args, newTarget) {
              const socket = Reflect.construct(target, args, newTarget);
              if (String(args[0]).includes("/rtc/")) sockets.push(socket);
              return socket;
            }
          });
        });
      }
      const page = await context.newPage();
      const browserMessages = [];
      diagnostics.set(page, browserMessages);
      page.on("console", (message) => {
        if (message.type() === "error") browserMessages.push(`console: ${message.text()}`);
      });
      page.on("pageerror", (error) => browserMessages.push(`pageerror: ${error.message}`));
      await page.goto("/login");
      await page.getByLabel("Email").fill(member.email);
      await page.getByLabel("Password").fill(password);
      const loginResponsePromise = page.waitForResponse((response) =>
        response.url().endsWith("/api/auth/login") && response.request().method() === "POST"
      );
      await page.getByRole("button", { name: "Log in" }).click();
      const loginResponse = await loginResponsePromise;
      if (!loginResponse.ok()) {
        throw new Error(`Browser ${index + 1} login returned ${loginResponse.status()}: ${await loginResponse.text()}`);
      }
      try {
        await page.waitForURL(/\/app(?:\/|$)/);
      } catch {
        throw new Error(`Browser ${index + 1} did not leave ${page.url()}. Visible page: ${(await page.locator("body").innerText()).slice(0, 800)}`);
      }
      await page.goto(`/app/session/${session.id}/room`);
      await page.getByRole("heading", { name: "Look and sound ready to speak." }).waitFor();
      await page.getByRole("button", { name: "Start camera and microphone test" }).click();
      await page.getByText("Camera").first().waitFor();
      await page.getByText("Microphone").first().waitFor();
      pages.push(page);
    }

    const deniedContext = await browser.newContext({ baseURL: appUrl, viewport: { width: 1280, height: 800 } });
    contexts.push(deniedContext);
    await deniedContext.addInitScript(() => {
      Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
        configurable: true,
        value: () => Promise.reject(new DOMException("Permission denied by realtime validation", "NotAllowedError"))
      });
    });
    const deniedPage = await deniedContext.newPage();
    await deniedPage.goto("/login");
    await deniedPage.getByLabel("Email").fill(members[0].email);
    await deniedPage.getByLabel("Password").fill(password);
    const deniedLoginResponse = deniedPage.waitForResponse((response) =>
      response.url().endsWith("/api/auth/login") && response.request().method() === "POST"
    );
    await deniedPage.getByRole("button", { name: "Log in" }).click();
    assert((await deniedLoginResponse).ok(), "The denied-media browser could not authenticate");
    await deniedPage.waitForURL(/\/app(?:\/|$)/);
    await deniedPage.goto(`/app/session/${session.id}/room`);
    assert(await deniedPage.getByRole("alert").count() === 0, "Media permission was requested before the user started the device check");
    await deniedPage.getByRole("button", { name: "Start camera and microphone test" }).click();
    await deniedPage.getByRole("alert").getByText(/access was blocked/i).waitFor();
    assert(await deniedPage.getByRole("button", { name: "Camera and microphone unavailable" }).isDisabled(), "Denied media permissions did not block room entry");

    const failedPublishContext = await browser.newContext({
      baseURL: appUrl,
      permissions: ["camera", "microphone"],
      viewport: { width: 1280, height: 800 }
    });
    contexts.push(failedPublishContext);
    await failedPublishContext.addInitScript(() => {
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
        configurable: true,
        value: (constraints) => globalThis.__ntmyFailRoomMedia
          ? Promise.reject(new DOMException("Device became unavailable after lobby", "NotReadableError"))
          : originalGetUserMedia(constraints)
      });
    });
    const failedPublishPage = await failedPublishContext.newPage();
    await failedPublishPage.goto("/login");
    await failedPublishPage.getByLabel("Email").fill(members[0].email);
    await failedPublishPage.getByLabel("Password").fill(password);
    const failedPublishLoginResponse = failedPublishPage.waitForResponse((response) =>
      response.url().endsWith("/api/auth/login") && response.request().method() === "POST"
    );
    await failedPublishPage.getByRole("button", { name: "Log in" }).click();
    assert((await failedPublishLoginResponse).ok(), "The post-lobby media-failure browser could not authenticate");
    await failedPublishPage.waitForURL(/\/app(?:\/|$)/);
    await failedPublishPage.goto(`/app/session/${session.id}/room`);
    await failedPublishPage.getByRole("heading", { name: "Look and sound ready to speak." }).waitFor();
    await failedPublishPage.getByRole("button", { name: "Start camera and microphone test" }).click();

    await waitUntil(startsAt + 750);

    await failedPublishPage.evaluate(() => {
      globalThis.__ntmyFailRoomMedia = true;
    });
    await failedPublishPage.getByRole("button", { name: "Join speaking session" }).click();
    await failedPublishPage.getByRole("heading", { name: "Look and sound ready to speak." }).waitFor({ timeout: 20_000 });
    await failedPublishPage.getByRole("alert").getByText(/another app/i).waitFor();

    async function joinPages(pagesToJoin) {
      const requestedAt = Date.now();
      const responses = pagesToJoin.map((page) => page.waitForResponse((response) =>
        response.url().endsWith("/api/livekit/token") && response.request().method() === "POST"
      ));
      await Promise.all(pagesToJoin.map(async (page) => {
        const join = page.getByRole("button", { name: "Join speaking session" });
        await join.waitFor({ state: "visible" });
        await join.click();
      }));
      const tokenResponses = await Promise.all(responses.map(async (responsePromise) => {
        const response = await responsePromise;
        tokenLatencies.push(Date.now() - requestedAt);
        return response;
      }));
      for (const response of tokenResponses) {
        assert(response.ok(), `LiveKit token endpoint returned ${response.status()}`);
        const payload = await response.json();
        const claims = decodeJwtPayload(payload.participantToken);
        assert(payload.serverNow && payload.startsAt && payload.endsAt, "LiveKit token response omitted its authoritative clock");
        assert(Math.abs(Date.parse(payload.startsAt) - startsAt) < 2_000, "LiveKit token response changed the scheduled start");
        assert(Math.abs(Date.parse(payload.endsAt) - endsAt) < 2_000, "LiveKit token response changed the scheduled end");
        assert(claims.video?.canPublishData === false, "LiveKit token allows data or chat publication");
        assert(
          [...(claims.video?.canPublishSources ?? [])].sort().join(",") === "camera,microphone",
          `LiveKit token allows an unexpected publication source: ${JSON.stringify(claims.video?.canPublishSources)}`
        );
      }
      await Promise.all(pagesToJoin.map((page) =>
        page.getByRole("heading", { name: /^English conversation/ }).waitFor({ timeout: 20_000 })
      ));
      for (let index = 0; index < pagesToJoin.length; index += 1) connectionLatencies.push(Date.now() - requestedAt);
      return requestedAt;
    }

    async function expectParticipantCount(visiblePages, count) {
      await Promise.all(visiblePages.map(async (page, index) => {
        try {
          await page.waitForFunction(
            (expected) => {
              const participants = document.querySelectorAll(".room-participant");
              const videos = [...document.querySelectorAll(".room-participant video")];
              const liveVideos = videos.filter((video) => {
                const stream = video.srcObject;
                return stream instanceof MediaStream
                  && stream.getVideoTracks().some((track) => track.readyState === "live")
                  && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
              });
              const remoteAudio = [...document.querySelectorAll("audio")].filter((audio) => {
                const stream = audio.srcObject;
                return stream instanceof MediaStream
                  && stream.getAudioTracks().some((track) => track.readyState === "live");
              });
              return participants.length === expected
                && liveVideos.length === expected
                && remoteAudio.length >= Math.max(0, expected - 1);
            },
            count,
            { timeout: 20_000 }
          );
        } catch {
          throw new Error(
            `Browser ${index + 1} saw ${await page.locator(".room-participant").count()} participant tiles, expected ${count}. ` +
            `Visible page: ${(await page.locator("body").innerText()).slice(0, 1_200)} ` +
            `Browser messages: ${(diagnostics.get(page) ?? []).slice(-12).join(" | ")}`
          );
        }
      }));
    }

    let stageStartedAt = await joinPages(pages.slice(0, 2));
    await expectParticipantCount(pages.slice(0, 2), 2);
    mediaLatencies.push(Date.now() - stageStartedAt);
    stageStartedAt = await joinPages([pages[2]]);
    await expectParticipantCount(pages.slice(0, 3), 3);
    mediaLatencies.push(Date.now() - stageStartedAt);
    stageStartedAt = await joinPages([pages[3]]);
    await expectParticipantCount(pages, 4);
    mediaLatencies.push(Date.now() - stageStartedAt);

    for (const [index, page] of pages.entries()) {
      const messages = diagnostics.get(page) ?? [];
      assert(messages.length === 0, `Browser ${index + 1} emitted errors during the stable four-person call: ${messages.join(" | ")}`);
    }

    assert(percentile95(tokenLatencies) < 500, `LiveKit token p95 exceeded 500 ms: ${percentile95(tokenLatencies)} ms`);
    assert(percentile95(connectionLatencies) < 3_000, `LiveKit connection p95 exceeded 3 s: ${percentile95(connectionLatencies)} ms`);
    assert(percentile95(mediaLatencies) < 5_000, `Remote media p95 exceeded 5 s: ${percentile95(mediaLatencies)} ms`);

    const roomService = new RoomServiceClient(liveKitHttpUrl, liveKitApiKey, liveKitApiSecret);
    const expectedRoomName = `ntmy_${session.id}`;
    let liveRoom = null;
    const capacityDeadline = Date.now() + 5_000;
    while (Date.now() <= capacityDeadline) {
      liveRoom = (await roomService.listRooms()).find((room) => room.name === expectedRoomName) ?? null;
      if (Number(liveRoom?.numParticipants) === 4) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert(Number(liveRoom?.maxParticipants) === 4 && Number(liveRoom?.numParticipants) === 4, "LiveKit room did not enforce its four-participant capacity");
    const connectedParticipants = await roomService.listParticipants(expectedRoomName);
    assert(connectedParticipants.length === 4, "LiveKit did not report exactly four connected participants");
    for (const participant of connectedParticipants) {
      const publishedSources = new Set(participant.tracks.filter((track) => !track.muted).map((track) => track.source));
      assert(publishedSources.has(TrackSource.CAMERA), `${participant.identity} did not publish a live camera track`);
      assert(publishedSources.has(TrackSource.MICROPHONE), `${participant.identity} did not publish a live microphone track`);
    }

    const fifthAccessToken = new AccessToken(liveKitApiKey, liveKitApiSecret, {
      identity: `capacity-check-${suffix}`,
      name: "Capacity check",
      ttl: 60
    });
    fifthAccessToken.addGrant({
      roomJoin: true,
      room: expectedRoomName,
      canPublish: false,
      canSubscribe: true,
      canPublishData: false
    });
    const fifthContext = await browser.newContext();
    contexts.push(fifthContext);
    const fifthPage = await fifthContext.newPage();
    await fifthPage.goto(appUrl);
    await fifthPage.addScriptTag({ path: liveKitClientUmdPath });
    const fifthConnection = await fifthPage.evaluate(async ({ serverUrl, token }) => {
      const room = new globalThis.LivekitClient.Room();
      try {
        await room.connect(serverUrl, token, { websocketTimeout: 5_000 });
        await new Promise((resolve) => setTimeout(resolve, 1_000));
        return { connected: room.state === "connected", state: room.state };
      } catch (error) {
        return { connected: false, state: room.state, error: error instanceof Error ? error.message : String(error) };
      } finally {
        await room.disconnect();
      }
    }, { serverUrl: liveKitWsUrl, token: await fifthAccessToken.toJwt() });
    assert(!fifthConnection.connected, `A fifth LiveKit participant connected despite the room cap: ${JSON.stringify(fifthConnection)}`);

    await Promise.all(pages.map(async (page, index) => {
      assert(await page.getByText("Native", { exact: false }).count() > 0, `Browser ${index + 1} did not render Native role information`);
      assert(await page.getByText("Practice", { exact: false }).count() > 0, `Browser ${index + 1} did not render Practice role information`);
      assert(await page.getByRole("button", { name: /chat/i }).count() === 0, `Browser ${index + 1} exposed chat controls`);
      assert(await page.getByRole("button", { name: /screen share/i }).count() === 0, `Browser ${index + 1} exposed screen sharing`);
      if (index === pages.length - 1) {
        assert(await page.getByRole("link", { name: "Report a safety concern" }).isVisible(), "The safety report control is hidden at the 390 px mobile viewport");
      }
    }));

    await pages[0].evaluate(() => {
      const socket = [...globalThis.__ntmyLiveKitSockets].reverse().find((candidate) => candidate.readyState === WebSocket.OPEN);
      if (!socket) throw new Error("No active LiveKit WebSocket was available for the reconnection check");
      socket.close(4000, "realtime validation");
    });
    await pages[0].getByText(/Reconnecting/).waitFor({ timeout: 15_000 });
    await pages[0].getByRole("heading", { name: /^English conversation/ }).waitFor({ timeout: 20_000 });
    await expectParticipantCount(pages, 4);

    await pages[0].reload();
    await pages[0].getByRole("heading", { name: "Look and sound ready to speak." }).waitFor();
    await pages[0].getByRole("button", { name: "Start camera and microphone test" }).click();
    await pages[0].getByRole("button", { name: "Join speaking session" }).click();
    await pages[0].getByRole("heading", { name: /^English conversation/ }).waitFor({ timeout: 20_000 });
    await expectParticipantCount(pages, 4);

    await Promise.all(pages.map((page) => page.getByRole("heading", { name: "Thirty minutes of real English practice." }).waitFor({ timeout: 90_000 })));
    for (const [index, page] of pages.entries()) {
      const unhandledErrors = (diagnostics.get(page) ?? []).filter((message) => message.startsWith("pageerror:"));
      assert(unhandledErrors.length === 0, `Browser ${index + 1} emitted unhandled errors: ${unhandledErrors.join(" | ")}`);
    }
    let roomClosedAt = null;
    const roomClosureDeadline = endsAt + 5_000;
    while (Date.now() <= roomClosureDeadline) {
      const roomExists = (await roomService.listRooms()).some((room) => room.name === expectedRoomName);
      if (!roomExists) {
        roomClosedAt = Date.now();
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    assert(roomClosedAt !== null, "LiveKit room was not deleted within five seconds of the scheduled end");
    process.stdout.write(
      `Four-participant LiveKit browser validation passed ` +
      `(token p95 ${percentile95(tokenLatencies)} ms, connection p95 ${percentile95(connectionLatencies)} ms, ` +
      `media p95 ${percentile95(mediaLatencies)} ms, closure ${roomClosedAt - endsAt} ms).\n`
    );
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
    await browser.close();
  }
}

await main();
