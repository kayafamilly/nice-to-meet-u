migrate((app) => {
  var collection = app.findCollectionByNameOrId("user_languages");
  collection.fields.getByName("is_native").required = false;
  app.save(collection);
}, (app) => {
  var collection = app.findCollectionByNameOrId("user_languages");
  collection.fields.getByName("is_native").required = true;
  app.save(collection);
});
