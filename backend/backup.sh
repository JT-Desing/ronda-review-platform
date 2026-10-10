#!/bin/sh
set -eu
export PGPASSWORD="$POSTGRES_PASSWORD"
while true; do
  stamp=$(date -u +%Y%m%dT%H%M%SZ)
  directory="/backups/$stamp"
  mkdir -p "$directory"
  chmod 700 "$directory"
  if pg_dump -h database -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f "$directory/database.dump.part" && tar -czf "$directory/files.tar.gz.part" -C /data/files .; then
    mv "$directory/database.dump.part" "$directory/database.dump"
    mv "$directory/files.tar.gz.part" "$directory/files.tar.gz"
    printf 'completed\n' > "$directory/COMPLETE"
    echo "Backup completed: $stamp"
    sleep 86400
  else
    echo 'Backup failed; incomplete backup preserved, retry in 5 minutes.' >&2
    sleep 300
  fi
done
