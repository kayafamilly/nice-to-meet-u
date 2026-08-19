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

export type CommunityMetrics = {
  verifiedCompletedSessionCount: number;
};

export type ManagementParticipant = { id: string; userId: string; displayName: string; role: ParticipantType; reservationStatus: ReservationStatus; joinedAt: string | null; leftAt: string | null; absenceReason: string | null };
export type ManagementSessionDetail = { id: string; languageName: string; hostId: string; hostName: string; startsAt: string; endsAt: string; note: string; status: "scheduled" | "completed" | "cancelled"; participantCount: number; participants: ManagementParticipant[]; createdAt: string | null };
export type ManagementUserDetail = { id: string; email: string; displayName: string; verified: boolean; createdAt: string; status: string; onboardingComplete: boolean; timeZone: string; suspendedUntil: string | null; languages: Array<{ name: string; level: string; native: boolean }>; sessionStats: { total: number; attended: number; noShow: number; cancelled: number }; sessions?: ManagementSessionDetail[] };
export type ManagementPeriod = "day" | "week" | "month";
export type ManagementMetric = { value: number; previous: number; change: number | null };
export type ManagementPeriodStats = { visitors: number; visits: number; pageViews: number; registrations: number; verifiedAccounts: number; onboardedAccounts: number; activatedAccounts: number; sessions: number; scheduledSessions: number; completedSessions: number; cancelledSessions: number; reservations: number; attendances: number; noShows: number; cancelledReservations: number; viableSessions: number };
export type ManagementAlert = { tone: "success" | "info" | "warning" | "danger"; title: string; copy: string; href: "/management/analytics" | "/management/users" | "/management/sessions" | "/management/moderation" | "/management/system" };
export type ManagementDashboardReport = { period: ManagementPeriod; from: string; to: string; metrics: Record<Exclude<keyof ManagementPeriodStats, "cancelledReservations">, ManagementMetric>; current: ManagementPeriodStats; ratios: { pagesPerVisit: number; visitToSignup: number; verificationRate: number; onboardingRate: number; activationRate: number; fillRate: number; attendanceRate: number; noShowRate: number }; trend: Array<{ label: string; visitors: number; visits: number; pageViews: number }>; media: Array<{ label: string; visits: number; pageViews: number; registrations: number }>; pages: Array<{ label: string; value: number }>; sources: Array<{ label: string; value: number }>; campaigns: Array<{ label: string; value: number }>; devices: Array<{ label: string; value: number }>; languages: Array<{ label: string; sessions: number; reservations: number; attendances: number }>; timeSlots: Array<{ label: string; sessions: number; reservations: number; attendances: number }>; openReports: number; alerts: ManagementAlert[]; recentSessions: ManagementSessionDetail[] };
export type ManagementOverview = ManagementDashboardReport;
export type ManagementAnalyticsReport = ManagementDashboardReport;
export type ManagementModerationReport = { id: string; reporterId: string; reporterName: string; reportedUserId: string | null; reportedUserName: string | null; sessionId: string | null; reason: string; details: string; status: string; createdAt: string | null };
export type ManagementSystemStatus = { pocketBase: "healthy" | "unavailable"; liveKit: "healthy" | "unavailable"; web: "healthy"; notificationWorker: "active" | "attention" | "unavailable"; liveKitWorker: "active" | "attention" | "unavailable"; failedNotifications: number; failedWebhooks: number; lastWebhookAt: string | null; notificationWorkerLastSeenAt: string | null; liveKitWorkerLastSeenAt: string | null };
export type ManagementPage<T> = { items: T[]; page: number; perPage: number; totalItems: number; totalPages: number };
