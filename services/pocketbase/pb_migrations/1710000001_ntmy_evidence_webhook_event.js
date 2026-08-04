// Make LiveKit attendance evidence exactly-once per persisted webhook event.
migrate((app) => {
  const webhooks = app.findCollectionByNameOrId("webhook_events");
  webhooks.fields.add(new DateField({
    name: "processing_started_at"
  }));
  app.save(webhooks);

  const collection = app.findCollectionByNameOrId("attendance_evidence");
  collection.fields.add(new RelationField({
    name: "webhook_event",
    maxSelect: 1,
    collectionId: "nmtuwebhk000001",
    cascadeDelete: false
  }));
  collection.indexes.push(
    "CREATE UNIQUE INDEX idx_ntmy_evidence_webhook_event ON attendance_evidence (webhook_event) WHERE webhook_event != ''"
  );
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("attendance_evidence");
  collection.fields.removeByName("webhook_event");
  collection.indexes = collection.indexes.filter((index) => index.indexOf("idx_ntmy_evidence_webhook_event") === -1);
  app.save(collection);

  const webhooks = app.findCollectionByNameOrId("webhook_events");
  webhooks.fields.removeByName("processing_started_at");
  app.save(webhooks);
});
