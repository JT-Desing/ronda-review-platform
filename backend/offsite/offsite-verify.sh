#!/bin/sh
# Restores the latest offsite database dump into a temporary database and
# checks that every stored file referenced by it exists in the files snapshot.
set -eu
export PGPASSWORD="$POSTGRES_PASSWORD"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-auto}"
export RESTIC_CACHE_DIR="${RESTIC_CACHE_DIR:-/tmp/restic-cache}"
host="${OFFSITE_HOST:?Set OFFSITE_HOST to name this deployment}"
work=$(mktemp -d)
database="ronda_offsite_qa_$(date -u +%s)"
cleanup() { rm -rf "$work"; dropdb --if-exists -h database -U "$POSTGRES_USER" "$database"; }
trap cleanup EXIT

restic check --read-data-subset="${OFFSITE_VERIFY_SUBSET:-10%}"
restic dump --host "$host" --tag database latest /database.dump > "$work/database.dump"
createdb -h database -U "$POSTGRES_USER" "$database"
pg_restore -h database -U "$POSTGRES_USER" --no-owner --no-privileges --exit-on-error -d "$database" "$work/database.dump"

# Files are copied after the dump, so the snapshot may hold newer files but never fewer.
restic ls --recursive --host "$host" --tag files latest /data/files | grep -E '^/data/files/.+/[^/]+$' | sed 's|^/data/files/||' | sort > "$work/snapshot"
psql -h database -U "$POSTGRES_USER" -d "$database" -tA -c "
  SELECT user_id || '/' || id FROM files
  UNION ALL
  SELECT '_shared/' || object_key FROM shared_media_files WHERE state = 'ready'" | sort > "$work/expected"
missing=$(comm -23 "$work/expected" "$work/snapshot" | wc -l)
if [ "$missing" -ne 0 ]; then
  echo "FAIL $missing stored files are missing from the offsite snapshot." >&2
  exit 1
fi
echo "PASS offsite dump restored into $database; $(wc -l < "$work/expected") stored files present in the snapshot."
