migrate((app) => {
  // Keep the breadth of the original international catalogue while hiding
  // historical, liturgical and constructed entries that cannot represent a
  // member's current native language. Modern regional languages remain valid.
  var excludedCodes = {
    ae: true,   // Avestan
    akk: true,  // Akkadian
    ang: true,  // Old English
    cop: true,  // Coptic
    cu: true,   // Church Slavic
    dum: true,  // Middle Dutch
    egy: true,  // Ancient Egyptian
    elx: true,  // Elamite
    enm: true,  // Middle English
    eo: true,   // Esperanto
    frm: true,  // Middle French
    fro: true,  // Old French
    gez: true,  // Geez
    got: true,  // Gothic
    grc: true,  // Ancient Greek
    hit: true,  // Hittite
    ia: true,   // Interlingua
    ie: true,   // Interlingue
    io: true,   // Ido
    la: true,   // Latin
    pi: true,   // Pali
    sa: true,   // Sanskrit
    vo: true,   // Volapuk

    // Prefer one clear contemporary entry over aliases or aggregate variants.
    eml: true,  // Emilian-Romagnol; Emilian remains available.
    nb: true,   // Norwegian Bokmal; Norwegian remains available.
    nn: true,   // Norwegian Nynorsk; Norwegian remains available.
    tl: true    // Tagalog alias; Filipino remains available.
  };

  var preferredNames = {
    bh: "Bihari",
    bho: "Bhojpuri",
    cmn: "Mandarin Chinese",
    fil: "Filipino",
    fy: "Western Frisian",
    rn: "Kirundi",
    tw: "Twi",
    yue: "Cantonese"
  };

  var records = app.findRecordsByFilter("languages", "id != ''", "name", 1000, 0, {});
  var activeCount = 0;
  records.forEach((record) => {
    var code = record.getString("code");
    if (preferredNames[code]) record.set("name", preferredNames[code]);
    var isActive = !excludedCodes[code];
    record.set("is_active", isActive);
    app.save(record);
    if (isActive) activeCount += 1;
  });

  if (activeCount < 250) throw new Error("The global modern language catalogue must expose at least 250 languages");
}, (app) => {
  var previousCatalog = {
    af: "Afrikaans", ar: "Arabic", bn: "Bengali", yue: "Cantonese",
    cs: "Czech", da: "Danish", nl: "Dutch", en: "English",
    fil: "Filipino", fi: "Finnish", fr: "French", de: "German",
    el: "Greek", he: "Hebrew", hi: "Hindi", hu: "Hungarian",
    id: "Indonesian", it: "Italian", ja: "Japanese", ko: "Korean",
    ms: "Malay", cmn: "Mandarin", no: "Norwegian", fa: "Persian",
    pl: "Polish", pt: "Portuguese", pa: "Punjabi", ro: "Romanian",
    ru: "Russian", es: "Spanish", sw: "Swahili", sv: "Swedish",
    ta: "Tamil", te: "Telugu", th: "Thai", tr: "Turkish",
    uk: "Ukrainian", ur: "Urdu", vi: "Vietnamese", yo: "Yoruba"
  };

  app.findRecordsByFilter("languages", "id != ''", "name", 1000, 0, {}).forEach((record) => {
    var code = record.getString("code");
    record.set("is_active", Boolean(previousCatalog[code]));
    if (previousCatalog[code]) record.set("name", previousCatalog[code]);
    app.save(record);
  });
});
