migrate((app) => {
  var userLanguages = app.findCollectionByNameOrId("user_languages");
  if (!userLanguages.fields.getByName("position")) {
    userLanguages.fields.add(new NumberField({ name: "position", required: true, min: 1, max: 3, onlyInt: true }));
    app.save(userLanguages);
  }

  var positions = {};
  app.findRecordsByFilter("user_languages", "id != ''", "user,is_native,id", 5000, 0, {}).forEach((record) => {
    var key = record.getString("user") + ":" + String(record.getBool("is_native"));
    positions[key] = (positions[key] || 0) + 1;
    if (positions[key] > 3) throw new Error("A language profile contains more than three entries in one role");
    record.set("position", positions[key]);
    app.save(record);
  });

  var positionIndex = "CREATE UNIQUE INDEX idx_ntmy_user_languages_position ON user_languages (user, is_native, position)";
  if (userLanguages.indexes.indexOf(positionIndex) === -1) {
    userLanguages.indexes = userLanguages.indexes.concat([positionIndex]);
    app.save(userLanguages);
  }
}, (app) => {
  var userLanguages = app.findCollectionByNameOrId("user_languages");
  userLanguages.indexes = userLanguages.indexes.filter((index) => index.indexOf("idx_ntmy_user_languages_position") === -1);
  if (userLanguages.fields.getByName("position")) userLanguages.fields.removeByName("position");
  app.save(userLanguages);
});
