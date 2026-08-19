migrate((app) => {
  var locked = { listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null };
  app.save(new Collection({
    id: "nmtuanconv00001", type: "base", name: "analytics_conversions", ...locked,
    fields: [
      { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: app.findCollectionByNameOrId("users").id, cascadeDelete: true },
      { name: "registered_at", type: "date", required: true },
      { name: "source", type: "text", required: true, max: 200 },
      { name: "medium", type: "text", max: 100 },
      { name: "campaign", type: "text", max: 100 }
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_ntmy_analytics_conversion_user ON analytics_conversions (user)",
      "CREATE INDEX idx_ntmy_analytics_conversion_time ON analytics_conversions (registered_at)",
      "CREATE INDEX idx_ntmy_analytics_conversion_source ON analytics_conversions (source)"
    ]
  }));
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId("analytics_conversions")); } catch (_) {}
});
