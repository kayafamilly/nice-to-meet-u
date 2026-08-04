migrate((app) => {
  var catalog = [
    ["af", "Afrikaans"], ["ar", "Arabic"], ["bn", "Bengali"], ["yue", "Cantonese"],
    ["cs", "Czech"], ["da", "Danish"], ["nl", "Dutch"], ["en", "English"],
    ["fil", "Filipino"], ["fi", "Finnish"], ["fr", "French"], ["de", "German"],
    ["el", "Greek"], ["he", "Hebrew"], ["hi", "Hindi"], ["hu", "Hungarian"],
    ["id", "Indonesian"], ["it", "Italian"], ["ja", "Japanese"], ["ko", "Korean"],
    ["ms", "Malay"], ["cmn", "Mandarin"], ["no", "Norwegian"], ["fa", "Persian"],
    ["pl", "Polish"], ["pt", "Portuguese"], ["pa", "Punjabi"], ["ro", "Romanian"],
    ["ru", "Russian"], ["es", "Spanish"], ["sw", "Swahili"], ["sv", "Swedish"],
    ["ta", "Tamil"], ["te", "Telugu"], ["th", "Thai"], ["tr", "Turkish"],
    ["uk", "Ukrainian"], ["ur", "Urdu"], ["vi", "Vietnamese"], ["yo", "Yoruba"]
  ];

  var languages = app.findCollectionByNameOrId("languages");
  var byCode = {};
  app.findRecordsByFilter("languages", "id != ''", "id", 1000, 0, {}).forEach((record) => {
    byCode[record.getString("code")] = record;
    record.set("is_active", false);
    app.save(record);
  });

  // Preserve the existing generic Chinese record id for historical relations.
  if (byCode.zh && !byCode.cmn) {
    byCode.cmn = byCode.zh;
    byCode.cmn.set("code", "cmn");
  }

  catalog.forEach((entry) => {
    var record = byCode[entry[0]] || new Record(languages);
    record.set("code", entry[0]);
    record.set("name", entry[1]);
    record.set("is_active", true);
    app.save(record);
  });

  var participants = app.findCollectionByNameOrId("session_participants");
  var role = participants.fields.getByName("role");
  role.values = ["practice", "support", "native"];
  app.save(participants);
  app.findRecordsByFilter("session_participants", "role = 'support'", "id", 10000, 0, {}).forEach((participant) => {
    participant.set("role", "native");
    app.save(participant);
  });
  role.values = ["practice", "native"];
  app.save(participants);

  var notifications = app.findCollectionByNameOrId("notifications");
  if (!notifications.fields.getByName("created_at")) {
    notifications.fields.add(new DateField({ name: "created_at" }));
    app.save(notifications);
  }
  app.findRecordsByFilter("notifications", "id != ''", "id", 10000, 0, {}).forEach((notification) => {
    if (notification.getString("created_at")) return;
    notification.set("created_at", notification.getString("deliver_after") || notification.getString("sent_at") || new Date().toISOString());
    app.save(notification);
  });
  var notificationIndex = "CREATE INDEX idx_ntmy_notifications_user_created ON notifications (user, created_at)";
  if (notifications.indexes.indexOf(notificationIndex) === -1) {
    notifications.indexes = notifications.indexes.concat([notificationIndex]);
    app.save(notifications);
  }

  var users = app.findCollectionByNameOrId("users");
  users.resetPasswordTemplate = {
    subject: "Reset your NiceToMeetU password",
    body: "<p>Hello,</p><p>Use the button below to choose a new NiceToMeetU password.</p><p><a class=\"btn\" href=\"{APP_URL}/reset-password?token={TOKEN}\" target=\"_blank\" rel=\"noopener\">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>"
  };
  app.save(users);
}, (app) => {
  var participants = app.findCollectionByNameOrId("session_participants");
  var role = participants.fields.getByName("role");
  role.values = ["practice", "native", "support"];
  app.save(participants);
  app.findRecordsByFilter("session_participants", "role = 'native'", "id", 10000, 0, {}).forEach((participant) => {
    participant.set("role", "support");
    app.save(participant);
  });
  role.values = ["practice", "support"];
  app.save(participants);

  var notifications = app.findCollectionByNameOrId("notifications");
  notifications.indexes = notifications.indexes.filter((index) => index.indexOf("idx_ntmy_notifications_user_created") === -1);
  if (notifications.fields.getByName("created_at")) notifications.fields.removeByName("created_at");
  app.save(notifications);
});
