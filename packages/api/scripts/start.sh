#!/bin/sh
set -e

# Wait for postgres using Bun
bun run scripts/wait-for-db.ts

# Small buffer for postgres to be fully ready
sleep 1

echo "Starting API server..."
exec bun run --watch src/server.ts
