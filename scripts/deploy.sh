#!/usr/bin/env bash
set -euo pipefail

REMOTE_HOST="yaksha"
REMOTE_DIR="/opt/achis-blog"
SERVICE="achis-blog"
# Kept in sync with the DATABASE_URL= line in the remote systemd unit (systemctl cat achis-blog) -
# the service gets its env vars from Environment= lines in the unit file, not a .env file, so a
# plain `ssh` shell has no access to it and drizzle.config.ts's `DATABASE_URL is not set` check
# fails unless we pass it explicitly for the schema-push step below.
REMOTE_DATABASE_URL="file:$REMOTE_DIR/data/local.db"

cd "$(dirname "$0")/.."

echo "==> Building..."
npm run build

echo "==> Syncing build/, package.json, package-lock.json..."
rsync -az --delete \
  build/ "$REMOTE_HOST:$REMOTE_DIR/build/"
rsync -az \
  package.json package-lock.json "$REMOTE_HOST:$REMOTE_DIR/"

echo "==> Installing production deps..."
ssh "$REMOTE_HOST" "cd $REMOTE_DIR && npm ci --omit=dev"

# drizzle-kit push needs a real TTY to show its interactive confirmation prompt (drizzle.config.ts
# has strict:true, so it always asks - even for purely additive/non-destructive changes). That
# prompt is the actual safety net (see CLAUDE.md: it once proposed `delete from post;` for a
# NOT NULL column), so it must never be auto-confirmed blindly. Only attempt it here when this
# script itself is running in a real interactive terminal (e.g. you running it by hand) - when
# invoked non-interactively (e.g. by an agent's shell tool), stdin has no TTY and the prompt would
# just fail outright, so skip it and fall back to printing the manual step instead.
#
# Needs a plain `npm install` (not just `npx drizzle-kit push` on its own) despite the prod-only
# `npm ci --omit=dev` above: drizzle.config.ts itself does `require('drizzle-kit')`, resolved
# against this project's own node_modules - npx fetching drizzle-kit into its ephemeral cache does
# NOT satisfy that require (confirmed live: "Cannot find module 'drizzle-kit'" even though npx had
# just installed it). `npm install` pulls in drizzle-kit (a devDependency) on top of the existing
# prod install without wiping it.
if [ -t 0 ]; then
  echo "==> Pushing DB schema changes (interactive - review each prompt before confirming)..."
  ssh -t "$REMOTE_HOST" "cd $REMOTE_DIR && npm install && DATABASE_URL='$REMOTE_DATABASE_URL' npx drizzle-kit push"
else
  echo "==> Skipping DB schema push (no TTY available in this shell)."
fi

echo "==> Restarting service..."
ssh "$REMOTE_HOST" "sudo systemctl restart $SERVICE"

echo "==> Done."

if ! [ -t 0 ]; then
  echo ""
  echo "Hinweis: DB-Schema-Aenderungen wurden hier bewusst NICHT automatisch mitgeschickt (kein"
  echo "TTY in dieser Shell). 'npm run db:push' braucht ein echtes TTY und kann bei"
  echo "Spalten-Aenderungen destruktive Vorschlaege machen (siehe CLAUDE.md) - bei einer"
  echo "Schema-Aenderung im Zweifel manuell:"
  echo "  ssh $REMOTE_HOST"
  echo "  cd $REMOTE_DIR && npm install && DATABASE_URL='$REMOTE_DATABASE_URL' npx drizzle-kit push"
fi
