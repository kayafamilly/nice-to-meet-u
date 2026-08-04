"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ConnectionStateToast,
  LiveKitRoom,
  RoomAudioRenderer,
  TrackToggle,
  VideoTrack,
  useConnectionState,
  useParticipantTracks,
  usePreviewTracks,
  useRoomContext,
  useTrackMutedIndicator,
  useTrackVolume,
  useTracks,
  type LocalUserChoices,
  type TrackReference,
  type TrackReferenceOrPlaceholder
} from "@livekit/components-react";
import {
  ConnectionState,
  DisconnectReason,
  type MediaDeviceFailure,
  Track,
  VideoPresets,
  type LocalAudioTrack,
  type LocalVideoTrack
} from "livekit-client";
import { mediaDeviceErrorMessage, serverClockOffset, sessionClock } from "@/lib/domain/session-room";
import type { ParticipantType, SessionParticipantPreview } from "@/types/api";

type RoomCredentials = {
  serverUrl: string;
  participantToken: string;
  serverNow: string;
  startsAt: string;
  endsAt: string;
};

type RoomClientProps = {
  sessionId: string;
  languageName: string;
  note: string;
  startsAt: string;
  endsAt: string;
  role: ParticipantType;
  participants: SessionParticipantPreview[];
  initialServerNow: string;
};

const roomOptions = {
  adaptiveStream: true,
  dynacast: true,
  audioCaptureDefaults: {
    autoGainControl: true,
    echoCancellation: true,
    noiseSuppression: true
  },
  videoCaptureDefaults: {
    resolution: VideoPresets.h1080.resolution
  },
  publishDefaults: {
    simulcast: true,
    videoEncoding: VideoPresets.h1080.encoding,
    videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h540],
    degradationPreference: "maintain-resolution" as const
  }
};

function csrf(): string | undefined {
  return document.cookie.split("; ").find((entry) => entry.startsWith("ntmy-csrf="))?.split("=")[1];
}

function participantRole(track: TrackReferenceOrPlaceholder): ParticipantType {
  try {
    const metadata = JSON.parse(track.participant.metadata || "{}") as { role?: ParticipantType };
    return metadata.role === "native" ? "native" : "practice";
  } catch {
    return "practice";
  }
}

function EndScreen({ sessionId, languageName }: { sessionId: string; languageName: string }) {
  return (
    <main className="room-end">
      <section className="room-end-card">
        <span className="room-end-mark" aria-hidden="true">✓</span>
        <p className="eyebrow">Session complete</p>
        <h1 className="editorial">Thirty minutes of real {languageName} practice.</h1>
        <p>Your attendance is being confirmed securely from the live session. Thank you for showing up and speaking.</p>
        <div className="hero-actions">
          <Link className="button violet" href={`/app/sessions/${sessionId}/feedback`}>Share feedback</Link>
          <Link className="button secondary" href="/app/sessions">Explore more sessions</Link>
        </div>
      </section>
    </main>
  );
}

function compactDeviceLabel(label: string, fallback: string): string {
  const value = label.trim() || fallback;
  return value.length > 44 ? `${value.slice(0, 41)}…` : value;
}

function CompactDeviceSelect({
  label,
  kind,
  value,
  devices,
  disabled,
  onChange
}: {
  label: "Camera" | "Microphone";
  kind: MediaDeviceKind;
  value: string;
  devices: MediaDeviceInfo[];
  disabled: boolean;
  onChange: (deviceId: string) => void;
}) {
  const choices = devices.filter((device) => device.kind === kind && device.deviceId !== "default");
  const selected = devices.find((device) => device.kind === kind && device.deviceId === value);
  return <label className="room-device-select" title={selected?.label || `Default ${label.toLowerCase()}`}>
    <span>{label}</span>
    <select aria-label={label} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
      <option value="default">Default {label.toLowerCase()}</option>
      {choices.map((device, index) => <option value={device.deviceId} key={`${kind}-${device.deviceId}`}>{compactDeviceLabel(device.label, `${label} ${index + 1}`)}</option>)}
    </select>
  </label>;
}

function DeviceLobby({
  languageName,
  note,
  role,
  reservedCount,
  clock,
  connecting,
  requestError,
  requestMediaOnMount,
  onReady,
  onRetry
}: {
  languageName: string;
  note: string;
  role: ParticipantType;
  reservedCount: number;
  clock: ReturnType<typeof sessionClock>;
  connecting: boolean;
  requestError: string | null;
  requestMediaOnMount: boolean;
  onReady: (choices: LocalUserChoices) => void;
  onRetry: () => void;
}) {
  const [audioDeviceId, setAudioDeviceId] = useState("default");
  const [videoDeviceId, setVideoDeviceId] = useState("default");
  const [mediaRequested, setMediaRequested] = useState(requestMediaOnMount);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const videoElement = useRef<HTMLVideoElement>(null);
  const handlePreviewError = useCallback((error: Error) => setMediaError(mediaDeviceErrorMessage(error)), []);
  const previewOptions = useMemo(() => mediaRequested ? ({
    audio: {
      deviceId: audioDeviceId,
      autoGainControl: true,
      echoCancellation: true,
      noiseSuppression: true
    },
    video: {
      deviceId: videoDeviceId,
      resolution: VideoPresets.h1080.resolution
    }
  }) : ({ audio: false, video: false }), [audioDeviceId, mediaRequested, videoDeviceId]);
  const tracks = usePreviewTracks(previewOptions, handlePreviewError);
  const audioTrack = tracks?.find((track) => track.kind === Track.Kind.Audio) as LocalAudioTrack | undefined;
  const videoTrack = tracks?.find((track) => track.kind === Track.Kind.Video) as LocalVideoTrack | undefined;
  const volume = useTrackVolume(audioTrack);
  const devicesReady = Boolean(audioTrack && videoTrack && !mediaError);
  const canJoin = devicesReady && clock.phase === "live" && !connecting;

  useEffect(() => {
    if (!mediaRequested || !navigator.mediaDevices?.enumerateDevices) return;
    let active = true;
    const refreshDevices = () => void navigator.mediaDevices.enumerateDevices()
      .then((devices) => { if (active) setAvailableDevices(devices.filter((device) => device.kind === "audioinput" || device.kind === "videoinput")); })
      .catch(() => undefined);
    refreshDevices();
    navigator.mediaDevices.addEventListener("devicechange", refreshDevices);
    return () => {
      active = false;
      navigator.mediaDevices.removeEventListener("devicechange", refreshDevices);
    };
  }, [audioTrack, mediaRequested, videoTrack]);

  useEffect(() => {
    const element = videoElement.current;
    if (!element || !videoTrack) return;
    void videoTrack.unmute();
    videoTrack.attach(element);
    return () => {
      videoTrack.detach(element);
    };
  }, [videoTrack]);

  return (
    <main className="room-lobby" data-lk-theme="default">
      <section className="room-lobby-shell">
        <div className="room-lobby-copy">
          <div>
            <p className="eyebrow">Device check · {reservedCount}/4 reserved</p>
            <h1 className="editorial">Look and sound ready to speak.</h1>
            <p>Camera and microphone are required when you enter. You can mute either one temporarily once the conversation starts.</p>
          </div>
          <div className="room-lobby-session">
            <span className="language-pill">{languageName}</span>
            <span className={`role-pill ${role}`}>{role === "native" ? "Native" : "Practice"}</span>
            {note && <p>{note}</p>}
          </div>
          <div className="room-lobby-checks" aria-live="polite">
            <div className={videoTrack ? "ready" : ""}><span aria-hidden="true">{videoTrack ? "✓" : "1"}</span><strong>Camera</strong><small>{videoTrack ? "Ready" : "Waiting for permission"}</small></div>
            <div className={audioTrack ? "ready" : ""}><span aria-hidden="true">{audioTrack ? "✓" : "2"}</span><strong>Microphone</strong><small>{audioTrack ? "Ready" : "Waiting for permission"}</small></div>
          </div>
        </div>

        <div className="room-preview-card">
          <div className="room-preview-video">
            <video ref={videoElement} autoPlay muted playsInline aria-label="Camera preview" />
            {!videoTrack && <div className="room-preview-placeholder"><span aria-hidden="true">●</span><p>Camera preview will appear here</p></div>}
            <span className="room-preview-you">You · Preview</span>
          </div>
          <div className="room-audio-meter" aria-label="Microphone input level">
            <span style={{ width: `${Math.max(audioTrack ? 5 : 0, Math.min(100, volume * 140))}%` }} />
          </div>
          <div className="room-device-row">
            <CompactDeviceSelect label="Camera" kind="videoinput" value={videoDeviceId} devices={availableDevices} disabled={!videoTrack} onChange={(deviceId) => { setMediaError(null); setVideoDeviceId(deviceId); }} />
            <CompactDeviceSelect label="Microphone" kind="audioinput" value={audioDeviceId} devices={availableDevices} disabled={!audioTrack} onChange={(deviceId) => { setMediaError(null); setAudioDeviceId(deviceId); }} />
          </div>
          {(mediaError || requestError) && <div className="room-device-error" role="alert"><p>{mediaError || requestError}</p><button type="button" onClick={onRetry}>Try again</button></div>}
          <button
            className="button violet room-join-button"
            type="button"
            disabled={mediaRequested && !canJoin}
            onClick={() => {
              if (!mediaRequested) {
                setMediaError(null);
                setMediaRequested(true);
                return;
              }
              onReady({ username: "", audioEnabled: true, videoEnabled: true, audioDeviceId, videoDeviceId });
            }}
          >
            {!mediaRequested ? "Start camera and microphone test" : connecting ? "Joining securely…" : mediaError ? "Camera and microphone unavailable" : !devicesReady ? "Starting camera and microphone…" : clock.phase === "lobby" ? `Ready · starts in ${clock.label}` : "Join speaking session"}
          </button>
          <p className="room-lobby-privacy">No recording, no chat and no screen sharing.</p>
        </div>
      </section>
    </main>
  );
}

function ClockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v5l3 1.8" /></svg>;
}

function MicrophoneIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3.5" width="6" height="11" rx="3" /><path d="M6.8 11.5a5.2 5.2 0 0 0 10.4 0M12 16.7v3.8M9 20.5h6" /></svg>;
}

function CameraIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="6.5" width="12.5" height="11" rx="2.4" /><path d="m16 10 4.5-2.5v9L16 14" /></svg>;
}

function SafetyIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 19 6v5.3c0 4.2-2.8 7.7-7 9.2-4.2-1.5-7-5-7-9.2V6l7-2.5Z" /><path d="M12 8v4.5M12 16h.01" /></svg>;
}

function LeaveIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 15.5a6.4 6.4 0 0 1 9 0" /><path d="m5 14.5 3.3 4.2M19 14.5l-3.3 4.2" /></svg>;
}

function RoomParticipant({ track, self = false }: { track: TrackReferenceOrPlaceholder; self?: boolean }) {
  const role = participantRole(track);
  const publishedTrack = track.publication ? track as TrackReference : undefined;
  const displayName = self ? "You" : track.participant.name || "Participant";
  const microphoneTracks = useParticipantTracks([Track.Source.Microphone], track.participant.identity);
  const microphoneTrack = microphoneTracks[0] ?? { participant: track.participant, source: Track.Source.Microphone };
  const { isMuted: microphoneMuted } = useTrackMutedIndicator(microphoneTrack);
  return (
    <div className={`room-participant${self ? " self" : ""}`} data-speaking={track.participant.isSpeaking ? "true" : "false"}>
      {publishedTrack ? <VideoTrack trackRef={publishedTrack} playsInline /> : <div className="room-video-placeholder"><span>{displayName.slice(0, 1).toUpperCase()}</span><p>Camera paused</p></div>}
      <div className="room-person-label">
        <strong>{displayName}{!self && ` (${role === "native" ? "Native" : "Practice"})`}</strong>
        <span className={microphoneMuted ? "muted" : "active"} aria-label={microphoneMuted ? "Microphone muted" : "Microphone on"}><MicrophoneIcon /></span>
      </div>
    </div>
  );
}

function SessionRoom({
  sessionId,
  languageName,
  note,
  clock,
  reservedCount,
  onEnded,
  onMediaError
}: {
  sessionId: string;
  languageName: string;
  note: string;
  clock: ReturnType<typeof sessionClock>;
  reservedCount: number;
  onEnded: () => void;
  onMediaError: (message: string) => void;
}) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const ending = useRef(false);
  const localTrack = tracks.find((track) => track.participant.isLocal);
  const remoteTracks = tracks.filter((track) => !track.participant.isLocal);

  useEffect(() => {
    if (clock.phase !== "ended" || ending.current) return;
    ending.current = true;
    void room.disconnect().finally(onEnded);
  }, [clock.phase, onEnded, room]);

  async function leaveRoom() {
    await room.disconnect();
    window.location.assign(`/app/sessions/${sessionId}`);
  }

  const connectionLabel =
    connectionState === ConnectionState.Reconnecting || connectionState === ConnectionState.SignalReconnecting ? "Reconnecting…" :
    connectionState === ConnectionState.Connecting ? "Connecting…" :
    `${tracks.length}/${Math.max(reservedCount, tracks.length)} connected`;
  const countdownTone = clock.remainingMs <= 60_000 ? "urgent" : clock.remainingMs <= 5 * 60_000 ? "warning" : "";
  const sessionLabel = note ? `${languageName} conversation: ${note}` : `${languageName} conversation`;

  return (
    <div className="room-shell">
      <header className="room-top">
        <div className="room-brand">NiceToMeetU</div>
        <div className="room-session-summary" title={`${sessionLabel} · ${connectionLabel}`}>
          <h1>{sessionLabel}</h1>
          <span className="room-summary-divider" aria-hidden="true" />
          <div className={`room-countdown ${countdownTone}`} aria-live="polite">
            <ClockIcon />
            <strong>{clock.label}</strong>
          </div>
          <span className="room-connection-status" aria-live="polite">{connectionLabel}</span>
        </div>
        <button className="room-header-leave" type="button" onClick={() => setConfirmLeave(true)}>Leave session</button>
      </header>

      <main className="room-stage">
        <div className="room-participant-grid" data-count={Math.max(1, remoteTracks.length)}>
          {remoteTracks.map((track) => <RoomParticipant key={track.participant.identity} track={track} />)}
          {!remoteTracks.length && <div className="room-connecting-card"><span className="room-loader" aria-hidden="true" /><h2>Waiting for the others</h2><p>Their video will appear here automatically.</p></div>}
        </div>
        {localTrack && <div className="room-self-preview"><RoomParticipant track={localTrack} self /></div>}
      </main>

      <footer className="room-bottom">
        <div className="room-controls">
          <TrackToggle
            className="room-media-toggle"
            source={Track.Source.Microphone}
            aria-label="Toggle microphone"
            title="Microphone"
            showIcon={false}
            onDeviceError={(error) => onMediaError(mediaDeviceErrorMessage(error))}
          ><MicrophoneIcon /></TrackToggle>
          <TrackToggle
            className="room-media-toggle"
            source={Track.Source.Camera}
            aria-label="Toggle camera"
            title="Camera"
            showIcon={false}
            onDeviceError={(error) => onMediaError(mediaDeviceErrorMessage(error))}
          ><CameraIcon /></TrackToggle>
          <Link className="room-safety-link" href={`/app/sessions/${sessionId}/feedback`} target="_blank" rel="noreferrer" aria-label="Report a safety concern" title="Report a safety concern"><SafetyIcon /><span>Safety</span></Link>
        </div>
        <button className="room-leave-button" type="button" onClick={() => setConfirmLeave(true)}><LeaveIcon />Leave session</button>
      </footer>

      <RoomAudioRenderer />
      <ConnectionStateToast />
      {confirmLeave && <div className="room-modal-backdrop" role="presentation">
        <section className="room-modal" role="dialog" aria-modal="true" aria-labelledby="leave-room-title">
          <p className="eyebrow">Leave session</p>
          <h2 id="leave-room-title">Leave the conversation now?</h2>
          <p>You can rejoin until the countdown reaches zero.</p>
          <div className="hero-actions">
            <button className="button danger" type="button" onClick={() => void leaveRoom()}>Leave session</button>
            <button className="button secondary" type="button" onClick={() => setConfirmLeave(false)}>Stay</button>
          </div>
        </section>
      </div>}
    </div>
  );
}

export function RoomClient({ sessionId, languageName, note, startsAt, endsAt, role, participants, initialServerNow }: RoomClientProps) {
  const [clockOffset, setClockOffset] = useState(() => {
    const initial = new Date(initialServerNow).getTime();
    return Number.isFinite(initial) ? initial - Date.now() : 0;
  });
  const [now, setNow] = useState(() => Date.now() + clockOffset);
  const [credentials, setCredentials] = useState<RoomCredentials | null>(null);
  const [choices, setChoices] = useState<LocalUserChoices | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [lobbyAttempt, setLobbyAttempt] = useState(0);
  const clock = useMemo(() => sessionClock(startsAt, endsAt, now), [endsAt, now, startsAt]);

  useEffect(() => {
    const update = () => setNow(Date.now() + clockOffset);
    update();
    const timer = window.setInterval(update, 250);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, [clockOffset]);

  const joinRoom = useCallback(async (nextChoices: LocalUserChoices) => {
    setRequestError(null);
    setConnecting(true);
    const requestStartedAt = Date.now();
    try {
      const response = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf() ?? "" },
        body: JSON.stringify({ sessionId })
      });
      const responseReceivedAt = Date.now();
      if (!response.ok) {
        throw new Error(response.status === 403 ? "The live room opens at the scheduled start time." : "We could not prepare the live room. Please try again.");
      }
      const payload = await response.json() as RoomCredentials;
      setClockOffset(serverClockOffset(payload.serverNow, requestStartedAt, responseReceivedAt));
      setChoices(nextChoices);
      setCredentials(payload);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Unable to prepare the live room.");
    } finally {
      setConnecting(false);
    }
  }, [sessionId]);

  function retryLobby() {
    setRequestError(null);
    setConnectionError(null);
    setCredentials(null);
    setChoices(null);
    setLobbyAttempt((current) => current + 1);
  }

  function handleDisconnected(reason?: DisconnectReason) {
    const atOrAfterEnd = Date.now() + clockOffset >= new Date(endsAt).getTime();
    if (atOrAfterEnd || reason === DisconnectReason.ROOM_DELETED) {
      setEnded(true);
      return;
    }
    if (reason === DisconnectReason.DUPLICATE_IDENTITY) {
      setConnectionError("This session is already open in another tab or device.");
      return;
    }
    if (reason !== DisconnectReason.CLIENT_INITIATED) {
      setConnectionError("The connection ended unexpectedly. Check your network and rejoin the session.");
    }
  }

  function handleMediaDeviceFailure(failure?: MediaDeviceFailure) {
    setConnectionError(null);
    setRequestError(mediaDeviceErrorMessage(failure));
    setCredentials(null);
    setChoices(null);
    setLobbyAttempt((current) => current + 1);
  }

  if (ended || (!credentials && clock.phase === "ended")) return <EndScreen sessionId={sessionId} languageName={languageName} />;

  if (!credentials || !choices) {
    return (
      <DeviceLobby
        key={lobbyAttempt}
        languageName={languageName}
        note={note}
        role={role}
        reservedCount={participants.length}
        clock={clock}
        connecting={connecting}
        requestError={requestError}
        requestMediaOnMount={lobbyAttempt > 0}
        onReady={(nextChoices) => void joinRoom(nextChoices)}
        onRetry={retryLobby}
      />
    );
  }

  return (
    <div className="room" data-lk-theme="default">
      <LiveKitRoom
        token={credentials.participantToken}
        serverUrl={credentials.serverUrl}
        connect
        audio={{
          deviceId: choices.audioDeviceId,
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true
        }}
        video={{
          deviceId: choices.videoDeviceId,
          resolution: VideoPresets.h1080.resolution
        }}
        options={roomOptions}
        connectOptions={{ maxRetries: 5, peerConnectionTimeout: 15_000, websocketTimeout: 15_000 }}
        onError={(error) => setConnectionError(error.message || "Unable to connect to the live room.")}
        onMediaDeviceFailure={handleMediaDeviceFailure}
        onDisconnected={handleDisconnected}
      >
        <SessionRoom
          sessionId={sessionId}
          languageName={languageName}
          note={note}
          clock={clock}
          reservedCount={participants.length}
          onEnded={() => setEnded(true)}
          onMediaError={setConnectionError}
        />
      </LiveKitRoom>
      {connectionError && <div className="room-fatal-error" role="alert">
        <p>{connectionError}</p>
        <button type="button" onClick={retryLobby}>Check devices and rejoin</button>
      </div>}
    </div>
  );
}
