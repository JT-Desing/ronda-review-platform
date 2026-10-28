#!/bin/sh
set -eu
export PGPASSWORD="$POSTGRES_PASSWORD"
backup=$(find /backups -mindepth 2 -maxdepth 2 -name COMPLETE | sort | tail -n 1)
test -n "$backup"
directory=$(dirname "$backup")
gzip -t "$directory/files.tar.gz"
database="ronda_restore_qa_$(date -u +%s)"
createdb -h database -U "$POSTGRES_USER" "$database"
trap 'dropdb -h database -U "$POSTGRES_USER" "$database"' EXIT
pg_restore -h database -U "$POSTGRES_USER" --no-owner --no-privileges --exit-on-error -d "$database" "$directory/database.dump"
psql -h database -U "$POSTGRES_USER" -d "$database" -q -c 'SELECT 1 FROM users LIMIT 0' >/dev/null
echo 'PASS backup restored into isolated temporary database; media archive integrity verified.'
