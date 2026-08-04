#!/usr/bin/env sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 infra/vps/.env.production|infra/vps/.env.staging" >&2
  exit 64
fi

env_file=$1
repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

"$repo_root/scripts/verify-vps-firewall.sh" "$env_file"
"$repo_root/scripts/render-livekit-config.sh" "$env_file"
set -a
. "$env_file"
set +a

: "${DEPLOYMENT:?DEPLOYMENT is required}"
: "${NEXT_PUBLIC_APP_URL:?NEXT_PUBLIC_APP_URL is required}"
: "${NEXT_PUBLIC_LIVEKIT_WS_URL:?NEXT_PUBLIC_LIVEKIT_WS_URL is required}"
: "${MAIL_SENDER_ADDRESS:?MAIL_SENDER_ADDRESS is required}"
: "${MAIL_SENDER_NAME:?MAIL_SENDER_NAME is required}"

if [ -z "${BREVO_API_KEY:-}" ]; then
  : "${SMTP_HOST:?BREVO_API_KEY or SMTP_HOST is required}"
  : "${SMTP_PORT:?SMTP_PORT is required when SMTP is used}"
  : "${SMTP_USERNAME:?SMTP_USERNAME is required when SMTP is used}"
  : "${SMTP_PASSWORD:?SMTP_PASSWORD is required when SMTP is used}"
  : "${SMTP_TLS:?SMTP_TLS is required when SMTP is used}"
  : "${SMTP_AUTH_METHOD:?SMTP_AUTH_METHOD is required when SMTP is used}"
  case "$SMTP_PORT" in
    *[!0-9]*|'') echo "SMTP_PORT must be numeric" >&2; exit 64 ;;
  esac
  case "$SMTP_TLS" in
    true|false) ;;
    *) echo "SMTP_TLS must be true or false" >&2; exit 64 ;;
  esac
fi

"$repo_root/scripts/install-native-linux.sh"
pnpm --dir "$repo_root" install --frozen-lockfile
pnpm --dir "$repo_root" --filter @ntmy/web build

# Next.js standalone output deliberately excludes public and static assets.
# Place them beside server.js so the native systemd process serves the same
# production build without invoking `next start`.
standalone_web="$repo_root/apps/web/.next/standalone/apps/web"
mkdir -p "$standalone_web/.next"
cp -R "$repo_root/apps/web/.next/static" "$standalone_web/.next/static"
if [ -d "$repo_root/apps/web/public" ]; then
  cp -R "$repo_root/apps/web/public" "$standalone_web/public"
fi

# Secrets and PocketBase data remain outside the release checkout.
sudo install -d -m 750 -o ntmy -g ntmy /etc/nicetomeetu /var/lib/nicetomeetu/$DEPLOYMENT/pocketbase
sudo install -m 640 -o root -g ntmy "$env_file" "/etc/nicetomeetu/$DEPLOYMENT.env"
sudo chown root:ntmy "$repo_root/infra/vps/rendered/$DEPLOYMENT/livekit.yaml"
sudo chmod 640 "$repo_root/infra/vps/rendered/$DEPLOYMENT/livekit.yaml"
sudo install -m 644 "$repo_root"/infra/vps/systemd/*.service /etc/systemd/system/
sudo install -m 644 "$repo_root"/infra/vps/systemd/*.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable "ntmy-pocketbase@$DEPLOYMENT" "ntmy-redis@$DEPLOYMENT" "ntmy-livekit@$DEPLOYMENT" "ntmy-web@$DEPLOYMENT" "ntmy-notifications@$DEPLOYMENT" "ntmy-livekit-lifecycle@$DEPLOYMENT"
if [ "$DEPLOYMENT" = production ]; then
  sudo systemctl enable --now ntmy-certbot-renew.timer
fi
sudo systemctl stop "ntmy-livekit-lifecycle@$DEPLOYMENT" "ntmy-notifications@$DEPLOYMENT" "ntmy-web@$DEPLOYMENT" "ntmy-livekit@$DEPLOYMENT" "ntmy-redis@$DEPLOYMENT" "ntmy-pocketbase@$DEPLOYMENT" || true
if ! migration_output=$(sudo -u ntmy "$repo_root/.local/bin/pocketbase/pocketbase" migrate up \
  --dir="/var/lib/nicetomeetu/$DEPLOYMENT/pocketbase" \
  --migrationsDir="$repo_root/services/pocketbase/pb_migrations" \
  --automigrate=false 2>&1); then
  printf '%s\n' "$migration_output" >&2
  exit 1
fi
printf '%s\n' "$migration_output"
case "$migration_output" in
  *"Error:"*) echo "PocketBase migrations failed" >&2; exit 1 ;;
esac
sudo systemctl restart "ntmy-pocketbase@$DEPLOYMENT" "ntmy-redis@$DEPLOYMENT" "ntmy-livekit@$DEPLOYMENT" "ntmy-web@$DEPLOYMENT" "ntmy-notifications@$DEPLOYMENT" "ntmy-livekit-lifecycle@$DEPLOYMENT"
sudo systemctl --no-pager --full status "ntmy-pocketbase@$DEPLOYMENT" "ntmy-redis@$DEPLOYMENT" "ntmy-livekit@$DEPLOYMENT" "ntmy-web@$DEPLOYMENT" "ntmy-notifications@$DEPLOYMENT" "ntmy-livekit-lifecycle@$DEPLOYMENT"
