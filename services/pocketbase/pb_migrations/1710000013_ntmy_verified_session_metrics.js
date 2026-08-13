// Public activity claims must be derived from authoritative attendance, not
// from reservations or incomplete sessions. This private singleton is exposed
// only through a server-to-server PocketBase route.
migrate((app) => {
  var metrics = new Collection({
    id: "nmtumetrics00001",
    type: "base",
    name: "public_metrics",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "verified_completed_session_count", type: "number", min: 0, onlyInt: true }
    ]
  });
  app.save(metrics);

  var count = 0;
  app.findRecordsByFilter("sessions", "status = 'completed'", "id", 10000, 0, {}).forEach((session) => {
    var attendees = app.findRecordsByFilter(
      "session_participants",
      "session = {:session} && reservation_status = 'attended'",
      "id",
      2,
      0,
      { session: session.id }
    );
    if (attendees.length >= 2) count += 1;
  });

  var singleton = new Record(metrics);
  singleton.id = "nmtumetric00001";
  singleton.set("verified_completed_session_count", count);
  app.save(singleton);
}, (app) => {
  try {
    app.delete(app.findCollectionByNameOrId("public_metrics"));
  } catch (_) {}
});
