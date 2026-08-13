migrate((app) => {
  var locked = { listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null };
  app.save(new Collection({
    id: "nmtuanvis000001", type: "base", name: "analytics_visits", ...locked,
    fields: [
      { name: "visitor_hash", type: "text", required: true, max: 64 },
      { name: "started_at", type: "date", required: true },
      { name: "last_seen_at", type: "date", required: true },
      { name: "landing_path", type: "text", required: true, max: 200 },
      { name: "referrer_host", type: "text", max: 200 },
      { name: "device", type: "select", required: true, maxSelect: 1, values: ["desktop", "mobile", "tablet", "other"] },
      { name: "utm_source", type: "text", max: 100 },
      { name: "utm_medium", type: "text", max: 100 },
      { name: "utm_campaign", type: "text", max: 100 }
    ],
    indexes: ["CREATE INDEX idx_ntmy_analytics_visits_visitor_seen ON analytics_visits (visitor_hash, last_seen_at)", "CREATE INDEX idx_ntmy_analytics_visits_started ON analytics_visits (started_at)"]
  }));
  app.save(new Collection({
    id: "nmtuanpview0001", type: "base", name: "analytics_page_views", ...locked,
    fields: [
      { name: "visit", type: "relation", required: true, maxSelect: 1, collectionId: "nmtuanvis000001", cascadeDelete: true },
      { name: "event_id", type: "text", required: true, max: 80 },
      { name: "path", type: "text", required: true, max: 200 },
      { name: "occurred_at", type: "date", required: true }
    ],
    indexes: ["CREATE UNIQUE INDEX idx_ntmy_analytics_page_event ON analytics_page_views (event_id)", "CREATE INDEX idx_ntmy_analytics_page_time ON analytics_page_views (occurred_at)"]
  }));
  app.save(new Collection({
    id: "nmtuandaily0001", type: "base", name: "analytics_daily", ...locked,
    fields: [
      { name: "day", type: "text", required: true, min: 10, max: 10 },
      { name: "visitors", type: "number", min: 0, onlyInt: true },
      { name: "visits", type: "number", min: 0, onlyInt: true },
      { name: "page_views", type: "number", min: 0, onlyInt: true }
    ],
    indexes: ["CREATE UNIQUE INDEX idx_ntmy_analytics_daily_day ON analytics_daily (day)"]
  }));
  app.save(new Collection({
    id: "nmtumanageauth1", type: "base", name: "management_auth_events", ...locked,
    fields: [
      { name: "fingerprint", type: "text", required: true, max: 64 },
      { name: "outcome", type: "select", required: true, maxSelect: 1, values: ["success", "failure", "logout", "export"] },
      { name: "occurred_at", type: "date", required: true },
      { name: "metadata", type: "json" }
    ],
    indexes: ["CREATE INDEX idx_ntmy_management_auth_fingerprint_time ON management_auth_events (fingerprint, occurred_at)"]
  }));
}, (app) => {
  ["management_auth_events", "analytics_daily", "analytics_page_views", "analytics_visits"].forEach((name) => {
    try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) {}
  });
});
