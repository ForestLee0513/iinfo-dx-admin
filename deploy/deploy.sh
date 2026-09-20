#!/usr/bin/env bash
set -euo pipefail

sha=${1:?commit SHA required}
[[ $sha =~ ^[0-9a-f]{40}$ ]] || { echo 'Invalid commit SHA' >&2; exit 2; }

repo=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
root=${DEPLOY_ROOT:-/home/forestlee/deploy/iinfo-dx-admin}
lock="$root/deploy.lock"
mkdir -p "$root"
exec 9>"$lock"
flock -x 9

actual_sha=$(git -C "$repo" rev-parse HEAD)
[[ $actual_sha == "$sha" ]] || { echo 'Checkout does not match requested SHA' >&2; exit 1; }

export ADMIN_API_URL=${ADMIN_API_URL:-https://iinfo-dx-api.forestlee.me}
export DEPLOY_SHA=$sha
compose=(docker compose -f "$repo/deploy/compose.yaml")
"${compose[@]}" up -d --build --force-recreate app

for ((attempt=0; attempt<24; attempt++)); do
  status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' iinfo-dx-admin 2>/dev/null || true)
  [[ $status == healthy ]] && break
  if [[ $status == unhealthy || $status == exited || $attempt == 23 ]]; then
    docker logs --tail 100 iinfo-dx-admin >&2 || true
    exit 1
  fi
  sleep 5
done

curl --fail --silent --show-error --max-time 15 https://iinfo-dx-admin.forestlee.me/ >/dev/null
echo "Admin deployed: $sha"
