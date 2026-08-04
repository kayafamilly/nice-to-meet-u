migrate((app) => {
  var publicAppUrl = $os.getenv("NEXT_PUBLIC_APP_URL");
  if (!publicAppUrl) return;
  var settings = app.settings();
  settings.meta.appURL = publicAppUrl.replace(/\/+$/, "");
  app.save(settings);
});
