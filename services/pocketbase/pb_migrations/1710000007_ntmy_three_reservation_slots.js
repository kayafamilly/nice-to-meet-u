// Three unique slots per user preserve a hard reservation limit even when
// concurrent reserve requests reach PocketBase at the same time.
migrate((app) => {
  var locks = app.findCollectionByNameOrId("active_reservation_locks");
  if (!locks.fields.getByName("slot")) locks.fields.add(new NumberField({ name: "slot", required: true, min: 1, max: 3, onlyInt: true }));
  locks.indexes = locks.indexes.filter((index) => index.indexOf("idx_ntmy_active_reservation_locks_user ON") === -1);
  var slotIndex = "CREATE UNIQUE INDEX idx_ntmy_active_reservation_locks_user_slot ON active_reservation_locks (user, slot)";
  if (locks.indexes.indexOf(slotIndex) === -1) locks.indexes = locks.indexes.concat([slotIndex]);
  app.save(locks);

  app.findRecordsByFilter("active_reservation_locks", "id != ''", "id", 1000, 0, {}).forEach((lock) => app.delete(lock));
  var slotsByUser = {};
  app.findRecordsByFilter("session_participants", "reservation_status = 'reserved'", "id", 1000, 0, {}).forEach((participant) => {
    var session = app.findRecordById("sessions", participant.getString("session"));
    if (session.getString("status") !== "scheduled" || new Date(session.getString("starts_at")).getTime() <= Date.now()) return;
    var userId = participant.getString("user");
    var slot = (slotsByUser[userId] || 0) + 1;
    if (slot > 3) throw new Error("A member has more than three upcoming reservations");
    slotsByUser[userId] = slot;
    var lock = new Record(locks);
    lock.set("user", userId);
    lock.set("participant", participant.id);
    lock.set("slot", slot);
    app.save(lock);
  });
}, (app) => {
  var locks = app.findCollectionByNameOrId("active_reservation_locks");
  var seenUsers = {};
  app.findRecordsByFilter("active_reservation_locks", "id != ''", "id", 1000, 0, {}).forEach((lock) => {
    var userId = lock.getString("user");
    if (seenUsers[userId]) app.delete(lock); else seenUsers[userId] = true;
  });
  locks.indexes = locks.indexes.filter((index) => index.indexOf("idx_ntmy_active_reservation_locks_user_slot") === -1);
  var userIndex = "CREATE UNIQUE INDEX idx_ntmy_active_reservation_locks_user ON active_reservation_locks (user)";
  if (locks.indexes.indexOf(userIndex) === -1) locks.indexes = locks.indexes.concat([userIndex]);
  if (locks.fields.getByName("slot")) locks.fields.removeByName("slot");
  app.save(locks);
});
