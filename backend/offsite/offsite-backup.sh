#!/bin/sh
# Incremental, encrypted copies of PostgreSQL and media files to a restic
# repository (Cloudflare R2). "offsite-backup.sh once" runs a single pass.
set -eu
: "${RESTIC_REPOSITORY:?Set RESTIC_REPOSITORY in .env.offsite}"
: "${RESTIC_PASSWORD:?Set RESTIC_PASSWORD in .env.offsite}"
export PGPASSWORD="$POSTGRES_PASSWORD"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-auto}"
export RESTIC_CACHE_DIR="${RESTIC_CACHE_DIR:-/tmp/restic-cache}"
host="${OFFSITE_HOST:?Set OFFSITE_HOST to name this deployment}"
interval="${OFFSITE_INTERVAL_SECONDS:-21600}"

ensure_repository() {
  status=0
  restic cat config >/dev/null 2>&1 || status=$?
  # restic exits with 10 only when the repository does not exist yet.
  if [ "$status" -eq 10 ]; then restic init; return; fi
  if [ "$status" -ne 0 ]; then echo 'Offsite repository unreachable or password wrong.' >&2; return 1; fi
}

# Every step returns explicitly: "set -e" does not apply inside a function
# called from an "if" condition.
run_once() {
  ensure_repository || return 1
  restic unlock || return 1
  restic backup --host "$host" --tag database --stdin-filename database.dump \
    --stdin-from-command -- pg_dump -h database -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc || return 1
  restic backup --host "$host" --tag files --exclude '*.part' /data/files || return 1
  restic forget --host "$host" --keep-last 4 --keep-daily 14 --keep-weekly 8 --keep-monthly 6 --prune || return 1
}

if [ "${1:-}" = once ]; then run_once; exit; fi
while true; do
  if run_once; then
    echo "Offsite backup completed: $(date -u +%Y%m%dT%H%M%SZ)"
    sleep "$interval"
  else
    echo 'Offsite backup failed; retry in 15 minutes.' >&2
    sleep 900
  fi
done
