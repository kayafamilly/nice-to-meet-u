// Pure domain helpers shared by the PocketBase hooks and their Node tests.
// Keep this module free of PocketBase globals so production rules can be
// exercised without exposing any database access to browser code.

function roomNameFor(sessionId) {
  return "ntmy_" + sessionId;
}

function rangesOverlap(leftStart, leftEnd, rightStart, rightEnd) {
  var ls = new Date(leftStart).getTime(), le = new Date(leftEnd).getTime(), rs = new Date(rightStart).getTime(), re = new Date(rightEnd).getTime();
  if ([ls, le, rs, re].some(function (value) { return isNaN(value); })) return false;
  return ls < re && le > rs;
}

function hasViableGroup(participantCount) {
  var count = Number(participantCount);
  return count >= 2 && count <= 4;
}

function sessionJoinState(input) {
  var status = String(input.status || "");
  var participantCount = Number(input.participantCount);
  var startsAt = new Date(input.startsAt || "").getTime();
  var endsAt = new Date(input.endsAt || "").getTime();
  var now = Number(input.now);
  if (status !== "scheduled" || [startsAt, endsAt, now].some(function (value) { return isNaN(value); }) || now >= endsAt) return "closed";
  if (!hasViableGroup(participantCount)) return "waiting_for_group";
  if (now < startsAt - 10 * 60 * 1000) return "opens_later";
  if (now < startsAt) return "lobby";
  return "open";
}

function isSessionClosureDue(endsAt, now, graceMinutes) {
  var ended = new Date(endsAt || "").getTime();
  var current = Number(now);
  var grace = Number(graceMinutes);
  if (isNaN(ended) || isNaN(current) || grace < 0) return false;
  return current > ended + grace * 60 * 1000;
}

function hasValidatedAttendance(input) {
  var joined = new Date(input.joinedAt || "").getTime();
  var starts = new Date(input.startsAt || "").getTime();
  var ended = new Date(input.endsAt || "").getTime();
  var left = input.leftAt ? new Date(input.leftAt).getTime() : ended;
  var minimumMinutes = Number(input.minimumMinutes);

  if (isNaN(joined) || isNaN(left) || isNaN(starts) || isNaN(ended) || ended <= starts || minimumMinutes <= 0) {
    return false;
  }

  var effectiveJoined = Math.max(joined, starts);
  var effectiveLeft = Math.min(left, ended);
  return effectiveLeft - effectiveJoined >= minimumMinutes * 60 * 1000;
}

function hasValidatedAttendanceFromEvents(input) {
  var starts = new Date(input.startsAt || "").getTime();
  var ended = new Date(input.endsAt || "").getTime();
  var minimumMinutes = Number(input.minimumMinutes);
  var events = Array.isArray(input.events) ? input.events.slice() : [];
  if (isNaN(starts) || isNaN(ended) || ended <= starts || minimumMinutes <= 0) return false;

  events.sort(function (left, right) {
    return new Date(left.observedAt || "").getTime() - new Date(right.observedAt || "").getTime();
  });

  var joinedAt = null;
  var attendedMilliseconds = 0;
  events.forEach(function (event) {
    var observedAt = new Date(event.observedAt || "").getTime();
    if (isNaN(observedAt)) return;
    if (event.eventType === "participant_joined" && joinedAt === null) {
      joinedAt = observedAt;
      return;
    }
    if (event.eventType === "participant_left" && joinedAt !== null) {
      attendedMilliseconds += Math.max(0, Math.min(observedAt, ended) - Math.max(joinedAt, starts));
      joinedAt = null;
    }
  });

  if (joinedAt !== null) {
    attendedMilliseconds += Math.max(0, ended - Math.max(joinedAt, starts));
  }
  return attendedMilliseconds >= minimumMinutes * 60 * 1000;
}

function isProcessingLeaseExpired(updatedAt, now, leaseSeconds) {
  var updated = new Date(updatedAt || "").getTime();
  var current = Number(now);
  var lease = Number(leaseSeconds);
  if (isNaN(updated) || isNaN(current) || lease <= 0) return true;
  return current - updated >= lease * 1000;
}

module.exports = {
  hasValidatedAttendance: hasValidatedAttendance,
  hasValidatedAttendanceFromEvents: hasValidatedAttendanceFromEvents,
  hasViableGroup: hasViableGroup,
  isSessionClosureDue: isSessionClosureDue,
  isProcessingLeaseExpired: isProcessingLeaseExpired,
  rangesOverlap: rangesOverlap,
  roomNameFor: roomNameFor,
  sessionJoinState: sessionJoinState
};
