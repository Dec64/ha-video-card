#!/usr/bin/env bash
# Runs the card against a real, disposable Home Assistant with Bubble Card.
#   npm run e2e:ha            (from card/, after npm run build)
# Needs: uv (installs Python 3.14 and HA into $HA_WORK_DIR), ffmpeg, curl, Playwright's Chromium.
# Env: HA_VERSION (default 2026.10.0), BUBBLE_VERSION (default v3.4.1), HA_WORK_DIR (default card/.ha-test)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
CARD="$(cd "$HERE/../.." && pwd)"
WORK="${HA_WORK_DIR:-$CARD/.ha-test}"
HA_VERSION="${HA_VERSION:-2026.10.0}"
BUBBLE_VERSION="${BUBBLE_VERSION:-v3.4.1}"
PORT=8123

if [ ! -f "$CARD/dist/stream-card.js" ]; then
  echo "Build first: npm run build" >&2
  exit 1
fi

mkdir -p "$WORK"
if [ ! -x "$WORK/venv/bin/hass" ] || ! "$WORK/venv/bin/python" -c "import homeassistant.const as c, sys; sys.exit(c.__version__ != '$HA_VERSION')"; then
  echo "Installing Home Assistant $HA_VERSION into $WORK/venv"
  uv python install 3.14
  uv venv --allow-existing -p 3.14 "$WORK/venv"
  VIRTUAL_ENV="$WORK/venv" uv pip install "homeassistant==$HA_VERSION"
  FRONTEND=$(grep -o '"home-assistant-frontend==[^"]*"' \
    "$WORK"/venv/lib/python3.*/site-packages/homeassistant/components/frontend/manifest.json | tr -d '"')
  VIRTUAL_ENV="$WORK/venv" uv pip install "$FRONTEND"
fi

CONFIG="$WORK/config"
rm -rf "$CONFIG"
mkdir -p "$CONFIG/www/stream-card" "$CONFIG/www/bubble-card"
cp "$HERE/configuration.yaml" "$CONFIG/"
cp "$CARD"/dist/*.js "$CONFIG/www/stream-card/"
if [ ! -f "$WORK/bubble-$BUBBLE_VERSION.js" ]; then
  curl -fsSL "https://raw.githubusercontent.com/Clooos/Bubble-Card/$BUBBLE_VERSION/dist/bubble-card.js" \
    -o "$WORK/bubble-$BUBBLE_VERSION.js"
fi
cp "$WORK/bubble-$BUBBLE_VERSION.js" "$CONFIG/www/bubble-card/bubble-card.js"

echo "Starting Home Assistant"
"$WORK/venv/bin/hass" -c "$CONFIG" > "$WORK/hass.log" 2>&1 &
HASS_PID=$!
trap 'kill $HASS_PID 2>/dev/null || true; wait $HASS_PID 2>/dev/null || true' EXIT
for _ in $(seq 1 90); do
  if curl -fs -o /dev/null "http://127.0.0.1:$PORT/api/onboarding"; then break; fi
  if ! kill -0 $HASS_PID 2>/dev/null; then cat "$WORK/hass.log"; exit 1; fi
  sleep 2
done

export HA_TOKENS="$WORK/tokens.json"
node "$HERE/onboard.mjs"
node "$HERE/setup-dashboard.mjs"
cd "$CARD"
npx playwright test -c playwright.ha.config.ts "$@"
