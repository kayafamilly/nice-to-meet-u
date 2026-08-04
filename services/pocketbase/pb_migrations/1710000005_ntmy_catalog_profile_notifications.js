// The catalogue deliberately uses stable ISO/BCP language identifiers.  It is
// idempotent so a deployment can extend the initial eight-language seed safely.
migrate((app) => {
  var catalog = [
    ["aa", "Afar"], ["ab", "Abkhazian"], ["ae", "Avestan"], ["af", "Afrikaans"], ["ak", "Akan"], ["am", "Amharic"], ["an", "Aragonese"], ["ar", "Arabic"], ["as", "Assamese"], ["av", "Avaric"], ["ay", "Aymara"], ["az", "Azerbaijani"], ["ba", "Bashkir"], ["be", "Belarusian"], ["bg", "Bulgarian"], ["bh", "Bhojpuri"], ["bi", "Bislama"], ["bm", "Bambara"], ["bn", "Bangla"], ["bo", "Tibetan"], ["br", "Breton"], ["bs", "Bosnian"], ["ca", "Catalan"], ["ce", "Chechen"], ["ch", "Chamorro"], ["co", "Corsican"], ["cr", "Cree"], ["cs", "Czech"], ["cu", "Church Slavic"], ["cv", "Chuvash"], ["cy", "Welsh"], ["da", "Danish"], ["de", "German"], ["dv", "Divehi"], ["dz", "Dzongkha"], ["ee", "Ewe"], ["el", "Greek"], ["en", "English"], ["eo", "Esperanto"], ["es", "Spanish"], ["et", "Estonian"], ["eu", "Basque"], ["fa", "Persian"], ["ff", "Fula"], ["fi", "Finnish"], ["fj", "Fijian"], ["fo", "Faroese"], ["fr", "French"], ["fy", "Western Frisian"], ["ga", "Irish"], ["gd", "Scottish Gaelic"], ["gl", "Galician"], ["gn", "Guarani"], ["gu", "Gujarati"], ["gv", "Manx"], ["ha", "Hausa"], ["he", "Hebrew"], ["hi", "Hindi"], ["ho", "Hiri Motu"], ["hr", "Croatian"], ["ht", "Haitian Creole"], ["hu", "Hungarian"], ["hy", "Armenian"], ["hz", "Herero"], ["ia", "Interlingua"], ["id", "Indonesian"], ["ie", "Interlingue"], ["ig", "Igbo"], ["ii", "Sichuan Yi"], ["ik", "Inupiaq"], ["io", "Ido"], ["is", "Icelandic"], ["it", "Italian"], ["iu", "Inuktitut"], ["ja", "Japanese"], ["jv", "Javanese"], ["ka", "Georgian"], ["kg", "Kongo"], ["ki", "Kikuyu"], ["kj", "Kuanyama"], ["kk", "Kazakh"], ["kl", "Kalaallisut"], ["km", "Khmer"], ["kn", "Kannada"], ["ko", "Korean"], ["kr", "Kanuri"], ["ks", "Kashmiri"], ["ku", "Kurdish"], ["kv", "Komi"], ["kw", "Cornish"], ["ky", "Kyrgyz"], ["la", "Latin"], ["lb", "Luxembourgish"], ["lg", "Ganda"], ["li", "Limburgish"], ["ln", "Lingala"], ["lo", "Lao"], ["lt", "Lithuanian"], ["lu", "Luba-Katanga"], ["lv", "Latvian"], ["mg", "Malagasy"], ["mh", "Marshallese"], ["mi", "Maori"], ["mk", "Macedonian"], ["ml", "Malayalam"], ["mn", "Mongolian"], ["mr", "Marathi"], ["ms", "Malay"], ["mt", "Maltese"], ["my", "Burmese"], ["na", "Nauru"], ["nb", "Norwegian Bokmal"], ["nd", "North Ndebele"], ["ne", "Nepali"], ["ng", "Ndonga"], ["nl", "Dutch"], ["nn", "Norwegian Nynorsk"], ["no", "Norwegian"], ["nr", "South Ndebele"], ["nv", "Navajo"], ["ny", "Nyanja"], ["oc", "Occitan"], ["oj", "Ojibwa"], ["om", "Oromo"], ["or", "Odia"], ["os", "Ossetic"], ["pa", "Punjabi"], ["pi", "Pali"], ["pl", "Polish"], ["ps", "Pashto"], ["pt", "Portuguese"], ["qu", "Quechua"], ["rm", "Romansh"], ["rn", "Rundi"], ["ro", "Romanian"], ["ru", "Russian"], ["rw", "Kinyarwanda"], ["sa", "Sanskrit"], ["sc", "Sardinian"], ["sd", "Sindhi"], ["se", "Northern Sami"], ["sg", "Sango"], ["si", "Sinhala"], ["sk", "Slovak"], ["sl", "Slovenian"], ["sm", "Samoan"], ["sn", "Shona"], ["so", "Somali"], ["sq", "Albanian"], ["sr", "Serbian"], ["ss", "Swati"], ["st", "Southern Sotho"], ["su", "Sundanese"], ["sv", "Swedish"], ["sw", "Swahili"], ["ta", "Tamil"], ["te", "Telugu"], ["tg", "Tajik"], ["th", "Thai"], ["ti", "Tigrinya"], ["tk", "Turkmen"], ["tl", "Filipino"], ["tn", "Tswana"], ["to", "Tongan"], ["tr", "Turkish"], ["ts", "Tsonga"], ["tt", "Tatar"], ["tw", "Akan (Twi)"], ["ty", "Tahitian"], ["ug", "Uyghur"], ["uk", "Ukrainian"], ["ur", "Urdu"], ["uz", "Uzbek"], ["ve", "Venda"], ["vi", "Vietnamese"], ["vo", "Volapuk"], ["wa", "Walloon"], ["wo", "Wolof"], ["xh", "Xhosa"], ["yi", "Yiddish"], ["yo", "Yoruba"], ["za", "Zhuang"], ["zh", "Chinese"], ["zu", "Zulu"],
    ["ace", "Acehnese"], ["ach", "Acoli"], ["ada", "Adangme"], ["ady", "Adyghe"], ["agq", "Aghem"], ["ain", "Ainu"], ["akk", "Akkadian"], ["alt", "Southern Altai"], ["ang", "Old English"], ["ann", "Obolo"], ["anp", "Angika"], ["arn", "Mapuche"], ["arp", "Arapaho"], ["arw", "Arawak"], ["ast", "Asturian"], ["atj", "Atikamekw"], ["awa", "Awadhi"], ["ban", "Balinese"], ["bas", "Basaa"], ["bax", "Bamun"], ["bbc", "Batak Toba"], ["bbj", "Ghomala"], ["bej", "Beja"], ["bem", "Bemba"], ["bew", "Betawi"], ["bez", "Bena"], ["bfd", "Bafut"], ["bfy", "Bagheli"], ["bgn", "Western Balochi"], ["bho", "Bhojpuri (regional)"], ["bik", "Bikol"], ["bin", "Bini"], ["bkm", "Kom"], ["bnj", "Tawbuid"], ["bss", "Akoose"], ["btm", "Batak Mandailing"], ["bua", "Buriat"], ["bug", "Buginese"], ["byn", "Blin"], ["cad", "Caddo"], ["car", "Carib"], ["cay", "Cayuga"], ["cch", "Atsam"], ["ccp", "Chakma"], ["ceb", "Cebuano"], ["cgg", "Chiga"], ["chk", "Chuukese"], ["chm", "Mari"], ["cho", "Choctaw"], ["chp", "Chipewyan"], ["chr", "Cherokee"], ["chy", "Cheyenne"], ["ckb", "Central Kurdish"], ["cnh", "Hakha Chin"], ["cop", "Coptic"], ["crh", "Crimean Tatar"], ["csb", "Kashubian"], ["dak", "Dakota"], ["dar", "Dargwa"], ["dav", "Taita"], ["del", "Delaware"], ["den", "Slavey"], ["dgr", "Dogrib"], ["din", "Dinka"], ["dje", "Zarma"], ["doi", "Dogri"], ["dsb", "Lower Sorbian"], ["dua", "Duala"], ["dum", "Middle Dutch"], ["dyu", "Dyula"], ["dzg", "Dazaga"], ["ebu", "Embu"], ["efi", "Efik"], ["egl", "Emilian"], ["egy", "Ancient Egyptian"], ["eka", "Ekajuk"], ["elx", "Elamite"], ["eml", "Emilian-Romagnol"], ["enm", "Middle English"], ["ewo", "Ewondo"], ["fan", "Fang"], ["fat", "Fante"], ["fil", "Filipino (Tagalog)"], ["fon", "Fon"], ["frm", "Middle French"], ["fro", "Old French"], ["frr", "Northern Frisian"], ["frs", "Eastern Frisian"], ["fur", "Friulian"], ["gaa", "Ga"], ["gag", "Gagauz"], ["gan", "Gan Chinese"], ["gay", "Gayo"], ["gba", "Gbaya"], ["gbz", "Zoroastrian Dari"], ["gez", "Geez"], ["gil", "Gilbertese"], ["gom", "Konkani"], ["gor", "Gorontalo"], ["got", "Gothic"], ["grb", "Grebo"], ["grc", "Ancient Greek"], ["gsw", "Swiss German"], ["guz", "Gusii"], ["gwi", "Gwichin"], ["haw", "Hawaiian"], ["hif", "Fiji Hindi"], ["hil", "Hiligaynon"], ["hit", "Hittite"], ["hmn", "Hmong"], ["hsb", "Upper Sorbian"], ["hup", "Hupa"], ["iba", "Iban"], ["ibb", "Ibibio"], ["ilo", "Iloko"], ["inh", "Ingush"]
  ];
  if (catalog.length !== 300) throw new Error("The language catalogue must contain exactly 300 entries");

  var languages = app.findCollectionByNameOrId("languages");
  catalog.forEach((entry) => {
    var record;
    try { record = app.findFirstRecordByFilter("languages", "code = {:code}", { code: entry[0] }); } catch (_) { record = new Record(languages); }
    record.set("code", entry[0]);
    record.set("name", entry[1]);
    record.set("is_active", true);
    app.save(record);
  });

  var profiles = app.findCollectionByNameOrId("user_profiles");
  if (!profiles.fields.getByName("deleted_at")) profiles.fields.add(new DateField({ name: "deleted_at" }));
  app.save(profiles);

  var notifications = app.findCollectionByNameOrId("notifications");
  if (!notifications.fields.getByName("title")) notifications.fields.add(new TextField({ name: "title", required: true, max: 120 }));
  if (!notifications.fields.getByName("body")) notifications.fields.add(new TextField({ name: "body", required: true, max: 500 }));
  if (!notifications.fields.getByName("url")) notifications.fields.add(new TextField({ name: "url", max: 200 }));
  if (!notifications.fields.getByName("read_at")) notifications.fields.add(new DateField({ name: "read_at" }));
  if (!notifications.fields.getByName("deliver_after")) notifications.fields.add(new DateField({ name: "deliver_after" }));
  if (!notifications.fields.getByName("delivery_status")) notifications.fields.add(new SelectField({ name: "delivery_status", required: true, maxSelect: 1, values: ["pending", "processing", "delivered", "failed"] }));
  if (!notifications.fields.getByName("delivery_attempts")) notifications.fields.add(new NumberField({ name: "delivery_attempts", min: 0, onlyInt: true }));
  if (!notifications.fields.getByName("last_delivery_error")) notifications.fields.add(new TextField({ name: "last_delivery_error", max: 500 }));
  var deliveryIndex = "CREATE INDEX idx_ntmy_notifications_delivery ON notifications (delivery_status, deliver_after)";
  if (notifications.indexes.indexOf(deliveryIndex) === -1) notifications.indexes = notifications.indexes.concat([deliveryIndex]);
  app.save(notifications);

  try { app.findCollectionByNameOrId("push_subscriptions"); } catch (_) {
    app.save(new Collection({
      id: "nmtupushs000001",
      type: "base",
      name: "push_subscriptions",
      listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: app.findCollectionByNameOrId("users").id, cascadeDelete: true },
        { name: "endpoint", type: "text", required: true, max: 2000 },
        { name: "p256dh", type: "text", required: true, max: 512 },
        { name: "auth", type: "text", required: true, max: 512 }
      ],
      indexes: ["CREATE UNIQUE INDEX idx_ntmy_push_subscriptions_endpoint ON push_subscriptions (endpoint)"]
    }));
  }
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId("push_subscriptions")); } catch (_) {}
  var profiles = app.findCollectionByNameOrId("user_profiles");
  if (profiles.fields.getByName("deleted_at")) profiles.fields.removeByName("deleted_at");
  app.save(profiles);
  var notifications = app.findCollectionByNameOrId("notifications");
  ["title", "body", "url", "read_at", "deliver_after", "delivery_status", "delivery_attempts", "last_delivery_error"].forEach((name) => { if (notifications.fields.getByName(name)) notifications.fields.removeByName(name); });
  app.save(notifications);
});
