#!/usr/bin/env bash
# Apply Salesflow Attribution Supabase migrations
set -euo pipefail

DB_URL="${SUPABASE_DATABASE_URL:-${DATABASE_URL:-}}"
if [ -z "$DB_URL" ]; then
  echo "Set SUPABASE_DATABASE_URL or DATABASE_URL"
  exit 1
fi

DIR="$(cd "$(dirname "$0")/.." && pwd)/supabase/migrations"

for f in \
  20250607000001_analytics_schema.sql \
  20250607000002_analytics_attribution_functions.sql \
  20250607000003_analytics_seed_data.sql \
  20250607000004_attribution_advanced_models.sql
do
  echo "Applying $f..."
  psql "$DB_URL" -f "$DIR/$f"
done

echo "Done. Demo org: org_demo"
