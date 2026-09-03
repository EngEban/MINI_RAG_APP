#!/bin/bash
set -e

echo "Running database migrations..."
cd /app/models/db_schemes/minirag/

# Retry logic for transient DNS/network startup races against pgvector
MAX_RETRIES=10
RETRY_DELAY=2
RETRY_COUNT=0

while true; do
  if alembic upgrade head; then
    echo "Database migrations completed successfully"
    break
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
    echo "Database migration failed after $MAX_RETRIES attempts"
    exit 1
  fi

  echo "Database migration failed (attempt $RETRY_COUNT/$MAX_RETRIES). Retrying in ${RETRY_DELAY}s..."
  sleep "$RETRY_DELAY"
done

cd /app
exec "$@"
