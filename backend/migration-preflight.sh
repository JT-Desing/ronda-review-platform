#!/bin/sh
set -eu
export PGPASSWORD="$POSTGRES_PASSWORD"
database=ronda_migration_copy_qa
# Fail rather than overwrite an existing QA database or backup directory.
directory="/backups/pre-migration-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -m 700 "$directory"
pg_dump -h database -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f "$directory/database.dump"
tar -czf "$directory/files.tar.gz" -C /data/files .
touch "$directory/COMPLETE"
createdb -h database -U "$POSTGRES_USER" "$database"
trap 'dropdb -h database -U "$POSTGRES_USER" "$database"' 1 2 15
if ! pg_restore -h database -U "$POSTGRES_USER" --no-owner --no-privileges --exit-on-error -d "$database" "$directory/database.dump"; then
  dropdb -h database -U "$POSTGRES_USER" "$database"
  exit 1
fi
echo 'PASS pre-migration backup and isolated database copy created.'
