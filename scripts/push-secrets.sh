#!/usr/bin/env bash
# One-time script to upload local secrets into Vaultwarden.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# BW_SERVER="${BW_SERVER:-https://www.bitwareden.com}"

# ── Auth ──────────────────────────────────────────────────────────────────────
# bw config server "$BW_SERVER"
# bw login
export BW_SESSION=$(bw unlock --passwordenv BW_PASSWORD --raw)

# ── Helper ────────────────────────────────────────────────────────────────────
upsert_secure_note() {
  local name="$1"
  local content="$2"
  local existing_id
  existing_id=$(bw list items --session "$BW_SESSION" | jq -r --arg n "$name" '.[] | select(.name == $n) | .id' | head -1)

  if [[ -n "$existing_id" ]]; then
    bw get item "$existing_id" --session "$BW_SESSION" \
      | jq --arg c "$content" '.notes = $c' \
      | bw encode \
      | bw edit item "$existing_id" --session "$BW_SESSION" > /dev/null
    echo "  ✓ Updated: $name"
  else
    bw get template item --session "$BW_SESSION" \
      | jq --arg n "$name" --arg c "$content" \
        '.name = $n | .type = 2 | .secureNote = {"type":0} | .notes = $c' \
      | bw encode \
      | bw create item --session "$BW_SESSION" > /dev/null
    echo "  ✓ Created: $name"
  fi
}

# ── Upload ────────────────────────────────────────────────────────────────────
echo "→ Uploading Android google-services.json"
upsert_secure_note \
  "Donetick Google Services Android" \
  "$(cat "$REPO_ROOT/android/app/google-services.json")"

echo "→ Uploading Fastline google-services.json"
upsert_secure_note \
  "Donetick Google Play Service Account" \
  "$(cat "$REPO_ROOT/donetick-5f910-5688a280a65a--fastline.json")"

echo "→ Uploading Android keystore (base64)"
upsert_secure_note \
  "Donetick Android Keystore" \
  "$(base64 < /Users/mohamad-macbook-air/donetick-android-ley)"

echo "→ Uploading iOS GoogleService-Info.plist"
upsert_secure_note \
  "Donetick Google Services iOS" \
  "$(cat "$REPO_ROOT/ios/App/App/GoogleService-Info.plist")"

echo "→ Uploading App Store Connect key (base64)"
upsert_secure_note \
  "Donetick App Store Connect Key" \
  "$(base64 < /Users/mohamad-macbook-air/Downloads/AuthKey_84F695CDQ3.p8)"

echo "→ Uploading .env.production"
upsert_secure_note \
  "Donetick Env Production" \
  "$(cat "$REPO_ROOT/.env.production")"

echo ""
echo "✓ All secrets uploaded. Verify in Vaultwarden, then you can safely delete local copies outside the repo."
echo "  NOTE: 'Donetick Keystore Password' should already exist — if not, create it manually as a Login item."
