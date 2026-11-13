#!/bin/bash
# Recreate the test DB and apply stub + migrations. Usage: bash tests/apply.sh
set -eo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
rm -rf /tmp/sb && cp -r "$DIR" /tmp/sb && chmod -R a+rX /tmp/sb
su postgres -c "dropdb --if-exists mh_test && createdb mh_test"
su postgres -c "psql -X -v ON_ERROR_STOP=1 -q -d mh_test -f /tmp/sb/tests/supabase_stub.sql $(ls /tmp/sb/migrations/*.sql | sed 's/^/-f /' | tr '\n' ' ')" 2>&1 | grep -v -i "wal_level\|HINT" || true
su postgres -c "psql -X -tAq -d mh_test -c \"select 'tables:'||count(*) from pg_tables where schemaname='public'\""
