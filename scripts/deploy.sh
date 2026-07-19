#!/usr/bin/env bash
set -euo pipefail

REMOTE_HOST="yaksha"
REMOTE_DIR="/opt/achis-blog"
SERVICE="achis-blog"

cd "$(dirname "$0")/.."

echo "==> Building..."
npm run build

echo "==> Syncing build/, package.json, package-lock.json..."
rsync -az --delete \
  build/ "$REMOTE_HOST:$REMOTE_DIR/build/"
rsync -az \
  package.json package-lock.json "$REMOTE_HOST:$REMOTE_DIR/"

echo "==> Installing production deps and restarting service..."
ssh "$REMOTE_HOST" "cd $REMOTE_DIR && npm ci --omit=dev && sudo systemctl restart $SERVICE"

echo "==> Done."
echo ""
echo "Hinweis: DB-Schema-Aenderungen werden hier bewusst NICHT automatisch mitgeschickt."
echo "'npm run db:push' braucht ein echtes TTY und kann bei Spalten-Aenderungen destruktive"
echo "Vorschlaege machen (siehe CLAUDE.md) - bei einer Schema-Aenderung im Zweifel manuell:"
echo "  ssh $REMOTE_HOST"
echo "  cd $REMOTE_DIR && npm install && npx drizzle-kit push"
