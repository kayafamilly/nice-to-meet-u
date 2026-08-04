#!/usr/bin/env sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 infra/vps/.env.production|infra/vps/.env.staging" >&2
  exit 64
fi

env_file=$1

if ! command -v ufw >/dev/null 2>&1; then
  echo "UFW is required: this deployment refuses to expose LiveKit HTTP without a host firewall gate." >&2
  exit 1
fi

set -a
. "$env_file"
set +a

: "${DEPLOYMENT:?DEPLOYMENT is required}"
: "${LIVEKIT_HTTP_PORT:?LIVEKIT_HTTP_PORT is required}"
: "${LIVEKIT_TCP_PORT:?LIVEKIT_TCP_PORT is required}"
: "${LIVEKIT_UDP_PORT_START:?LIVEKIT_UDP_PORT_START is required}"
: "${LIVEKIT_UDP_PORT_END:?LIVEKIT_UDP_PORT_END is required}"
: "${TURN_UDP_PORT:?TURN_UDP_PORT is required}"
: "${TURN_RELAY_PORT_START:?TURN_RELAY_PORT_START is required}"
: "${TURN_RELAY_PORT_END:?TURN_RELAY_PORT_END is required}"

verbose_status=$(ufw status verbose)
plain_status=$(ufw status)

if ! printf '%s\n' "$verbose_status" | grep -Eq 'Default:[[:space:]]+deny[[:space:]]+\(incoming\)'; then
  echo "UFW must use a default-deny incoming policy before deploying $DEPLOYMENT." >&2
  exit 1
fi

if printf '%s\n' "$plain_status" | grep -Eq "^${LIVEKIT_HTTP_PORT}(/tcp)?[[:space:]].*ALLOW IN"; then
  echo "LiveKit HTTP port ${LIVEKIT_HTTP_PORT} must stay blocked; Caddy exposes it through HTTPS." >&2
  exit 1
fi

# Default deny is not sufficient when an administrator has added a broad rule
# or a TCP range containing the signaling port. The intended topology has no
# broad inbound allowance and no TCP ranges, so reject both configurations.
if printf '%s\n' "$plain_status" | grep -Eq '^Anywhere[[:space:]].*ALLOW IN'; then
  echo "A broad inbound UFW allow rule could expose LiveKit HTTP; narrow the rule before deploying." >&2
  exit 1
fi

if printf '%s\n' "$plain_status" | grep -Eq '^[0-9]+:[0-9]+(/tcp)?[[:space:]].*ALLOW IN'; then
  echo "Inbound TCP ranges are not allowed because they could expose LiveKit HTTP." >&2
  exit 1
fi

require_allow_rule() {
  rule=$1
  label=$2
  if ! printf '%s\n' "$verbose_status" | grep -Eq "^${rule}[[:space:]].*ALLOW IN"; then
    echo "Missing inbound UFW rule for ${label}: ${rule}" >&2
    exit 1
  fi
}

require_allow_rule "${LIVEKIT_TCP_PORT}/tcp" "LiveKit ICE/TCP"
require_allow_rule "${LIVEKIT_UDP_PORT_START}:${LIVEKIT_UDP_PORT_END}/udp" "LiveKit ICE/UDP"
require_allow_rule "${TURN_UDP_PORT}/udp" "TURN/UDP"
require_allow_rule "${TURN_RELAY_PORT_START}:${TURN_RELAY_PORT_END}/udp" "TURN relay UDP"
