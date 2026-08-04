migrate((app) => {
  var collection = app.findCollectionByNameOrId("session_cycles");
  collection.fields.getByName("practice_completed").required = false;
  collection.fields.getByName("support_completed").required = false;
  app.save(collection);
}, (app) => {
  var collection = app.findCollectionByNameOrId("session_cycles");
  collection.fields.getByName("practice_completed").required = true;
  collection.fields.getByName("support_completed").required = true;
  app.save(collection);
});
