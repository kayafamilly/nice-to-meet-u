// Fence reclaimed webhook attempts and make attendance-event reads efficient.
migrate((app) => {
  const webhooks = app.findCollectionByNameOrId("webhook_events");
  webhooks.fields.add(new TextField({
    name: "processing_attempt",
    max: 64
  }));
  app.save(webhooks);

  const evidence = app.findCollectionByNameOrId("attendance_evidence");
  evidence.indexes.push(
    "CREATE INDEX idx_ntmy_evidence_participant_observed_at ON attendance_evidence (participant, observed_at)"
  );
  app.save(evidence);
}, (app) => {
  const evidence = app.findCollectionByNameOrId("attendance_evidence");
  evidence.indexes = evidence.indexes.filter((index) => index.indexOf("idx_ntmy_evidence_participant_observed_at") === -1);
  app.save(evidence);

  const webhooks = app.findCollectionByNameOrId("webhook_events");
  webhooks.fields.removeByName("processing_attempt");
  app.save(webhooks);
});
