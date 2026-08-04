// A unique lock turns the "one upcoming reservation" rule into a database
// invariant, including when two reserve requests arrive at the same time.
migrate((app) => {
  var locks;
  try {
    locks = app.findCollectionByNameOrId("active_reservation_locks");
  } catch (_) {
    locks = new Collection({
      id: "nmtulocks000001",
      type: "base",
      name: "active_reservation_locks",
      listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: app.findCollectionByNameOrId("users").id, cascadeDelete: true },
        { name: "participant", type: "relation", required: true, maxSelect: 1, collectionId: app.findCollectionByNameOrId("session_participants").id, cascadeDelete: true }
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_ntmy_active_reservation_locks_user ON active_reservation_locks (user)",
        "CREATE UNIQUE INDEX idx_ntmy_active_reservation_locks_participant ON active_reservation_locks (participant)"
      ]
    });
    app.save(locks);
  }

  var now = Date.now();
  app.findRecordsByFilter("session_participants", "reservation_status = 'reserved'", "id", 1000, 0, {}).forEach((participant) => {
    var session = app.findRecordById("sessions", participant.getString("session"));
    if (session.getString("status") !== "scheduled" || new Date(session.getString("starts_at")).getTime() <= now) return;
    try {
      app.findFirstRecordByFilter("active_reservation_locks", "user = {:user}", { user: participant.getString("user") });
    } catch (_) {
      var lock = new Record(locks);
      lock.set("user", participant.getString("user"));
      lock.set("participant", participant.id);
      app.save(lock);
    }
  });
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId("active_reservation_locks")); } catch (_) {}
});
