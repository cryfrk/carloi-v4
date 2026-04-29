#!/bin/sh
set -eu

chmod +x /usr/local/bin/postgres-backup.sh
printf '%s /usr/local/bin/postgres-backup.sh >> /var/log/postgres-backup.log 2>&1\n' "${BACKUP_SCHEDULE:-0 3 * * *}" > /etc/crontabs/root
exec crond -f -l 2