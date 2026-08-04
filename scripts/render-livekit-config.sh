#!/usr/bin/env sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 path/to/environment.env" >&2
  exit 64
fi

env_file=$1
repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

if ! command -v envsubst >/dev/null 2>&1; then
  echo "envsubst is required to render the LiveKit configuration (install gettext-base on Debian/Ubuntu)." >&2
  exit 1
fi

set -a
. "$env_file"
set +a

: "${DEPLOYMENT:?DEPLOYMENT is required}"
: "${LIVEKIT_API_KEY:?LIVEKIT_API_KEY is required}"
: "${LIVEKIT_API_SECRET:?LIVEKIT_API_SECRET is required}"
: "${LIVEKIT_WEBHOOK_URL:?LIVEKIT_WEBHOOK_URL is required}"
: "${TURN_RELAY_PORT_START:?TURN_RELAY_PORT_START is required}"
: "${TURN_RELAY_PORT_END:?TURN_RELAY_PORT_END is required}"

output_dir="$repo_root/infra/vps/rendered/$DEPLOYMENT"
mkdir -p "$output_dir"
envsubst < "$repo_root/infra/vps/livekit.template.yaml" > "$output_dir/livekit.yaml"
chmod 600 "$output_dir/livekit.yaml"
