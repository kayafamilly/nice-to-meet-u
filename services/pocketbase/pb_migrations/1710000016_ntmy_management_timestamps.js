migrate((app) => {
  var additions = [
    ["sessions", "created_at", "CREATE INDEX idx_ntmy_sessions_created_at ON sessions (created_at)"],
    ["moderation_reports", "created_at", "CREATE INDEX idx_ntmy_reports_created_at ON moderation_reports (created_at)"],
    ["audit_logs", "occurred_at", "CREATE INDEX idx_ntmy_audit_action_time ON audit_logs (action, occurred_at)"]
  ];
  additions.forEach((entry) => {
    var collection = app.findCollectionByNameOrId(entry[0]);
    if (!collection.fields.getByName(entry[1])) collection.fields.add(new DateField({ name: entry[1] }));
    if (collection.indexes.indexOf(entry[2]) === -1) collection.indexes.push(entry[2]);
    app.save(collection);
  });
}, (app) => {
  var removals = [
    ["sessions", "created_at", "CREATE INDEX idx_ntmy_sessions_created_at ON sessions (created_at)"],
    ["moderation_reports", "created_at", "CREATE INDEX idx_ntmy_reports_created_at ON moderation_reports (created_at)"],
    ["audit_logs", "occurred_at", "CREATE INDEX idx_ntmy_audit_action_time ON audit_logs (action, occurred_at)"]
  ];
  removals.forEach((entry) => {
    var collection = app.findCollectionByNameOrId(entry[0]);
    collection.indexes = collection.indexes.filter((index) => index !== entry[2]);
    if (collection.fields.getByName(entry[1])) collection.fields.removeByName(entry[1]);
    app.save(collection);
  });
});
