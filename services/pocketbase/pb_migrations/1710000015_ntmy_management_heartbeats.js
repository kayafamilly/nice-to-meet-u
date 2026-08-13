migrate((app) => {
  app.save(new Collection({
    id: "nmtumgheartbeat1",
    type: "base",
    name: "management_service_heartbeats",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "service", type: "select", required: true, maxSelect: 1, values: ["notification_worker", "livekit_worker"] },
      { name: "last_seen_at", type: "date", required: true }
    ],
    indexes: ["CREATE UNIQUE INDEX idx_ntmy_management_heartbeat_service ON management_service_heartbeats (service)"]
  }));
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId("management_service_heartbeats")); } catch (_) {}
});
