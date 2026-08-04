// NiceToMeetU owns all sensitive writes through pb_hooks/main.pb.js.
// Every collection rule is deliberately locked (null): the Next.js BFF is the
// only caller that may reach the business routes, and those routes emit DTOs.
migrate((app) => {
  const locked = { listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null };
  // PocketBase creates its default auth collection named "users" during
  // bootstrap. Reuse it instead of attempting to create a second collection
  // with the same reserved name, and propagate its actual id to every relation.
  const users = app.findCollectionByNameOrId("users");
  const ids = {
    users: users.id,
    languages: "nmtulangs000001",
    profiles: "nmtuprofs000001",
    userLanguages: "nmtuulngs000001",
    cycles: "nmtucycle000001",
    sessions: "nmtusessn000001",
    participants: "nmtupartc000001",
    evidence: "nmtuevidn000001",
    notifications: "nmtunotif000001",
    webhooks: "nmtuwebhk000001",
    audits: "nmtuaudit000001",
    reports: "nmtureport00001"
  };

  users.listRule = null;
  users.viewRule = null;
  users.createRule = null;
  users.updateRule = null;
  users.deleteRule = null;
  users.passwordAuth = { enabled: true, identityFields: ["email"] };
  users.fields.add(new TextField({ name: "display_name", required: true, min: 2, max: 40 }));
  app.save(users);

  app.save(new Collection({
    id: ids.languages,
    type: "base",
    name: "languages",
    ...locked,
    fields: [
      { name: "code", type: "text", required: true, min: 2, max: 10 },
      { name: "name", type: "text", required: true, min: 2, max: 50 },
      { name: "is_active", type: "bool" }
    ],
    indexes: ["CREATE UNIQUE INDEX idx_ntmy_languages_code ON languages (code)"]
  }));

  app.save(new Collection({
    id: ids.profiles,
    type: "base",
    name: "user_profiles",
    ...locked,
    fields: [
      { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: ids.users, cascadeDelete: true },
      { name: "time_zone", type: "text", required: true, min: 1, max: 64 },
      { name: "adult_confirmed", type: "bool", required: true },
      { name: "onboarding_complete", type: "bool" },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["active", "suspended", "deleted"] },
      { name: "no_show_suspended_until", type: "date" }
    ],
    indexes: ["CREATE UNIQUE INDEX idx_ntmy_profiles_user ON user_profiles (user)"]
  }));

  app.save(new Collection({
    id: ids.userLanguages,
    type: "base",
    name: "user_languages",
    ...locked,
    fields: [
      { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: ids.users, cascadeDelete: true },
      { name: "language", type: "relation", required: true, maxSelect: 1, collectionId: ids.languages, cascadeDelete: false },
      { name: "level", type: "select", required: true, maxSelect: 1, values: ["beginner", "intermediate", "advanced", "native"] },
      { name: "is_native", type: "bool" }
    ],
    indexes: ["CREATE UNIQUE INDEX idx_ntmy_user_languages_user_language ON user_languages (user, language)"]
  }));

  app.save(new Collection({
    id: ids.cycles,
    type: "base",
    name: "session_cycles",
    ...locked,
    fields: [
      { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: ids.users, cascadeDelete: true },
      { name: "cycle_started_at", type: "date", required: true },
      { name: "practice_completed", type: "number", min: 0, onlyInt: true },
      { name: "support_completed", type: "number", min: 0, onlyInt: true }
    ],
    indexes: ["CREATE UNIQUE INDEX idx_ntmy_cycles_user ON session_cycles (user)"]
  }));

  app.save(new Collection({
    id: ids.sessions,
    type: "base",
    name: "sessions",
    ...locked,
    fields: [
      { name: "language", type: "relation", required: true, maxSelect: 1, collectionId: ids.languages, cascadeDelete: false },
      { name: "host", type: "relation", required: true, maxSelect: 1, collectionId: ids.users, cascadeDelete: false },
      { name: "starts_at", type: "date", required: true },
      { name: "ends_at", type: "date", required: true },
      { name: "topic", type: "text", max: 120 },
      { name: "description", type: "text", max: 1000 },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["scheduled", "cancelled", "completed"] },
      { name: "room_name", type: "text", required: true, max: 80 }
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_ntmy_sessions_room_name ON sessions (room_name)",
      "CREATE INDEX idx_ntmy_sessions_starts_at ON sessions (starts_at)"
    ]
  }));

  app.save(new Collection({
    id: ids.participants,
    type: "base",
    name: "session_participants",
    ...locked,
    fields: [
      { name: "session", type: "relation", required: true, maxSelect: 1, collectionId: ids.sessions, cascadeDelete: true },
      { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: ids.users, cascadeDelete: false },
      { name: "role", type: "select", required: true, maxSelect: 1, values: ["practice", "support"] },
      { name: "reservation_status", type: "select", required: true, maxSelect: 1, values: ["reserved", "cancelled", "attended", "no_show"] },
      { name: "joined_at", type: "date" },
      { name: "left_at", type: "date" },
      { name: "cancelled_at", type: "date" },
      { name: "absence_marked_at", type: "date" },
      { name: "absence_reason", type: "select", maxSelect: 1, values: ["late_cancellation", "no_show", "technical_exception"] }
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_ntmy_participants_session_user ON session_participants (session, user)",
      "CREATE INDEX idx_ntmy_participants_session_status ON session_participants (session, reservation_status)"
    ]
  }));

  app.save(new Collection({
    id: ids.evidence,
    type: "base",
    name: "attendance_evidence",
    ...locked,
    fields: [
      { name: "participant", type: "relation", required: true, maxSelect: 1, collectionId: ids.participants, cascadeDelete: true },
      { name: "source", type: "select", required: true, maxSelect: 1, values: ["livekit_webhook", "admin"] },
      { name: "event_type", type: "text", required: true, max: 80 },
      { name: "observed_at", type: "date", required: true },
      { name: "metadata", type: "json" }
    ]
  }));

  app.save(new Collection({
    id: ids.notifications,
    type: "base",
    name: "notifications",
    ...locked,
    fields: [
      { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: ids.users, cascadeDelete: true },
      { name: "kind", type: "text", required: true, max: 80 },
      { name: "dedup_key", type: "text", required: true, max: 160 },
      { name: "payload", type: "json" },
      { name: "sent_at", type: "date" }
    ],
    indexes: ["CREATE UNIQUE INDEX idx_ntmy_notifications_dedup ON notifications (user, dedup_key)"]
  }));

  app.save(new Collection({
    id: ids.webhooks,
    type: "base",
    name: "webhook_events",
    ...locked,
    fields: [
      { name: "provider", type: "text", required: true, max: 30 },
      { name: "event_id", type: "text", required: true, max: 120 },
      { name: "event_type", type: "text", required: true, max: 100 },
      { name: "processing_status", type: "select", required: true, maxSelect: 1, values: ["received", "processing", "processed", "failed"] },
      { name: "payload", type: "json" },
      { name: "failure_reason", type: "text", max: 500 },
      { name: "processed_at", type: "date" }
    ],
    indexes: ["CREATE UNIQUE INDEX idx_ntmy_webhook_event ON webhook_events (provider, event_id)"]
  }));

  app.save(new Collection({
    id: ids.audits,
    type: "base",
    name: "audit_logs",
    ...locked,
    fields: [
      { name: "actor", type: "relation", maxSelect: 1, collectionId: ids.users, cascadeDelete: false },
      { name: "action", type: "text", required: true, max: 100 },
      { name: "entity_type", type: "text", required: true, max: 60 },
      { name: "entity_id", type: "text", required: true, max: 30 },
      { name: "metadata", type: "json" }
    ]
  }));

  app.save(new Collection({
    id: ids.reports,
    type: "base",
    name: "moderation_reports",
    ...locked,
    fields: [
      { name: "reporter", type: "relation", required: true, maxSelect: 1, collectionId: ids.users, cascadeDelete: false },
      { name: "reported_user", type: "relation", maxSelect: 1, collectionId: ids.users, cascadeDelete: false },
      { name: "session", type: "relation", maxSelect: 1, collectionId: ids.sessions, cascadeDelete: false },
      { name: "reason", type: "select", required: true, maxSelect: 1, values: ["harassment", "hate", "sexual_content", "spam", "other"] },
      { name: "details", type: "text", max: 1000 },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["open", "reviewing", "resolved", "dismissed"] }
    ]
  }));

  const languageCollection = app.findCollectionByNameOrId("languages");
  [
    ["en", "English"], ["fr", "French"], ["es", "Spanish"], ["de", "German"],
    ["it", "Italian"], ["pt", "Portuguese"], ["ja", "Japanese"], ["ko", "Korean"]
  ].forEach((language) => {
    const record = new Record(languageCollection);
    record.set("code", language[0]);
    record.set("name", language[1]);
    record.set("is_active", true);
    app.save(record);
  });
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  users.fields.removeByName("display_name");
  app.save(users);
  [
    "moderation_reports", "audit_logs", "webhook_events", "notifications", "attendance_evidence",
    "session_participants", "sessions", "session_cycles", "user_languages", "user_profiles", "languages"
  ].forEach((name) => app.delete(app.findCollectionByNameOrId(name)));
});
