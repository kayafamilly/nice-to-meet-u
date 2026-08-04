migrate((app) => {
  var users = app.findCollectionByNameOrId("users");
  users.authRule = "verified = true";
  users.verificationTemplate = {
    subject: "Confirm your NiceToMeetU email",
    actionUrl: "{APP_URL}/verify-email#token={TOKEN}",
    body: "<p>Hello,</p><p>Confirm your email address to activate your NiceToMeetU account and start practising with international language groups.</p><p><a class=\"btn\" href=\"{ACTION_URL}\" target=\"_blank\" rel=\"noopener\">Confirm my email</a></p><p>If you did not create this account, you can ignore this email.</p>"
  };
  app.save(users);
}, (app) => {
  var users = app.findCollectionByNameOrId("users");
  users.authRule = null;
  app.save(users);
});
