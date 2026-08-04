#!/usr/bin/env sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
target="$repo_root/.local/bin"
pb_version=0.39.8
livekit_version=1.8.4
case "$(uname -m)" in
  x86_64) arch=amd64 ;;
  aarch64|arm64) arch=arm64 ;;
  *) echo "Unsupported CPU architecture: $(uname -m)" >&2; exit 1 ;;
esac

mkdir -p "$target/pocketbase" "$target/livekit"
if [ ! -x "$target/pocketbase/pocketbase" ]; then
  archive=$(mktemp)
  trap 'rm -f "$archive"' EXIT
  curl --fail --location --retry 3 -o "$archive" "https://github.com/pocketbase/pocketbase/releases/download/v${pb_version}/pocketbase_${pb_version}_linux_${arch}.zip"
  unzip -oq "$archive" -d "$target/pocketbase"
  chmod 755 "$target/pocketbase/pocketbase"
  rm -f "$archive"; trap - EXIT
fi
if [ ! -x "$target/livekit/livekit-server" ]; then
  archive=$(mktemp)
  trap 'rm -f "$archive"' EXIT
  curl --fail --location --retry 3 -o "$archive" "https://github.com/livekit/livekit/releases/download/v${livekit_version}/livekit_${livekit_version}_linux_${arch}.tar.gz"
  tar -xzf "$archive" -C "$target/livekit"
  chmod 755 "$target/livekit/livekit-server"
  rm -f "$archive"; trap - EXIT
fi
