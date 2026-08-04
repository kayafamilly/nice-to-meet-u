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
