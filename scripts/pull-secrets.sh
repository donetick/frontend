#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BW_SERVER="${BW_SERVER:-https://bitwarden.com}"

# ── Auth ──────────────────────────────────────────────────────────────────────
echo "→ Connecting to Vaultwarden at $BW_SERVER"
CURRENT_SERVER=$(bw status | jq -r '.serverUrl // empty')

if [ "$CURRENT_SERVER" != "$BW_SERVER" ]; then
  bw logout || true
  bw config server "$BW_SERVER"
fi

if [ -z "${BW_SESSION:-}" ]; then
  BW_LOGIN_STATUS=$(bw status | jq -r '.status')

  if [ "$BW_LOGIN_STATUS" = "unauthenticated" ]; then
    if [ -n "${BW_CLIENTID:-}" ] && [ -n "${BW_CLIENTSECRET:-}" ]; then
      bw login --apikey
    else
      bw login
    fi
  fi

  export BW_SESSION=$(bw unlock --passwordenv BW_PASSWORD --raw)
fi

bw sync --session "$BW_SESSION" > /dev/null

# ── Helper ────────────────────────────────────────────────────────────────────
get_note() {
  bw get item "$1" --session "$BW_SESSION" | jq -r '.notes'
}

get_password() {
  bw get item "$1" --session "$BW_SESSION" | jq -r '.login.password // .notes'
}

# ── Android ───────────────────────────────────────────────────────────────────
echo "→ Writing android/app/google-services.json"
get_note "Donetick Google Services Android" > "$REPO_ROOT/android/app/google-services.json"

echo "→ Writing android keystore"
get_note "Donetick Android Keystore" | base64 --decode > "$REPO_ROOT/android/app/release/donetick.jks"

KEYSTORE_PASSWORD=$(get_password "Donetick Keystore Password")

cat > "$REPO_ROOT/android/keystore.properties" <<EOF
storeFile=release/donetick.jks
storePassword=$KEYSTORE_PASSWORD
keyAlias=key0
keyPassword=$KEYSTORE_PASSWORD
EOF

echo "→ Writing android/play-service-account.json"
get_note "Donetick Google Play Service Account" > "$REPO_ROOT/android/play-service-account.json"

# ── iOS ───────────────────────────────────────────────────────────────────────
echo "→ Writing ios/App/App/GoogleService-Info.plist"
get_note "Donetick Google Services iOS" > "$REPO_ROOT/ios/App/App/GoogleService-Info.plist"

echo "→ Writing App Store Connect key"
get_note "Donetick App Store Connect Key" | base64 --decode > "$REPO_ROOT/ios/AuthKey_84F695CDQ3.p8"

# ── Env ───────────────────────────────────────────────────────────────────────
echo "→ Writing .env.production"
get_note "Donetick Env Production" > "$REPO_ROOT/.env.production"

echo "✓ All secrets pulled successfully"
