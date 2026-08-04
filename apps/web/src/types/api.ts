export type ReservationStatus = "reserved" | "cancelled" | "attended" | "no_show";
export type ParticipantType = "native" | "practice";
export type JoinState = "waiting_for_group" | "opens_later" | "lobby" | "open" | "closed";
export type ReservationBlockReason = "already_reserved" | "session_full" | "schedule_conflict" | "reservation_limit" | "suspended" | "closed";

export type ReservationUsage = {
  active: number;
  limit: 3;
  remaining: number;
};

export type SessionParticipantPreview = {
  displayName: string;
  initials: string;
  role: ParticipantType;
  slot: number;
  isHost: boolean;
  isViewer: boolean;
  reportParticipantId: string | null;
};

export type SessionSummary = {
  id: string;
  languageId: string;
  languageName: string;
  startsAt: string;
  endsAt: string;
  note: string;
  status: "scheduled" | "completed" | "cancelled";
  isUpcoming: boolean;
  nativeCount: number;
  practiceCount: number;
  participantCount: number;
  capacity: 4;
  minimumParticipants: 2;
  isHost: boolean;
  hostCanCancel: boolean;
  viewerReservationStatus: ReservationStatus | null;
  viewerRole: ParticipantType | null;
  viewerActiveReservationCount: number;
  viewerEligibility: {
    canReserve: boolean;
    role: ParticipantType;
    reason: ReservationBlockReason | null;
  };
  joinState: JoinState;
  joinOpensAt: string;
  participants: SessionParticipantPreview[];
};

export type CurrentUser = {
  id: string;
  displayName: string;
  onboardingCompleted: boolean;
  reservationSuspendedUntil: string | null;
  primaryPracticeLanguageId: string | null;
  reservationUsage: ReservationUsage | null;
};

export type Language = {
  id: string;
  code: string;
  name: string;
  upcomingSessionCount: number;
  nextSessionStartsAt: string | null;
};

export type PracticeLanguage = Language & { level: "beginner" | "intermediate" | "advanced" };

export type Profile = {
  id: string;
  displayName: string;
  nativeLanguages: Language[];
  practiceLanguages: PracticeLanguage[];
  timeZone: string;
  reservationSuspendedUntil: string | null;
  reservationUsage: ReservationUsage;
};

export type ProfileSession = SessionSummary & {
  role: ParticipantType;
  reservationStatus: ReservationStatus;
};

export type SessionHistory = { upcoming: ProfileSession[]; past: ProfileSession[] };

export type AppNotification = {
  id: string;
  kind: "reservation_confirmation" | "reservation_cancelled" | "session_ready" | "session_full" | "session_reminder";
  title: string;
  body: string;
  url: string;
  createdAt: string | null;
  readAt: string | null;
};

export type NotificationCentre = { notifications: AppNotification[]; unreadCount: number };
