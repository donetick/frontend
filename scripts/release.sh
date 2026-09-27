#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

PLATFORM="both"
BUMP="patch"
SKIP_BUMP=false
UPLOAD=false
UPLOAD_ONLY=false
ANDROID_TRACK="internal"

usage() {
  cat <<EOF
Usage: $(basename "$0") [--android|--ios] [--bump patch|minor|major] [--skip-bump] [--upload|--upload-only] [--track TRACK]

Builds signed release artifacts for Android (.aab) and/or iOS (.ipa).

  --android        Build Android only
  --ios            Build iOS only
  --bump TYPE      Version bump type before building (default: patch)
  --skip-bump      Don't bump the version, build with the current one
  --upload         Also upload: Android to Play Store, iOS to TestFlight
  --upload-only    Skip bump/build entirely, just upload the artifacts already built
  --track TRACK    Play Store track for --upload (default: internal)
  -h, --help       Show this help

Requires:
  - scripts/pull-secrets.sh to have been run (keystore, google-services, App Store Connect key, Play service account)
  - ASC_ISSUER_ID env var set (App Store Connect API key issuer id) for iOS builds/uploads
  - bundle install (fastlane) run at least once
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --android) PLATFORM="android"; shift ;;
    --ios) PLATFORM="ios"; shift ;;
    --bump) BUMP="$2"; shift 2 ;;
    --skip-bump) SKIP_BUMP=true; shift ;;
    --upload) UPLOAD=true; shift ;;
    --upload-only) UPLOAD=true; UPLOAD_ONLY=true; shift ;;
    --track) ANDROID_TRACK="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

if [ -f "$REPO_ROOT/.env.production" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env.production"
  set +a
fi

if [ "$UPLOAD_ONLY" = false ]; then
  if [ "$SKIP_BUMP" = false ]; then
    echo "→ Bumping version ($BUMP)"
    node bump-version.js "$BUMP"
  fi

  echo "→ Building web assets"
  npm run build

  echo "→ Syncing Capacitor"
  npx cap sync
fi

if [ -f Gemfile ] && command -v bundle >/dev/null 2>&1; then
  RUN="bundle exec fastlane"
else
  RUN="fastlane"
fi

if [ "$PLATFORM" = "android" ] || [ "$PLATFORM" = "both" ]; then
  if [ "$UPLOAD_ONLY" = false ]; then
    echo "→ Building signed Android release (.aab)"
    $RUN android release
  fi

  if [ "$UPLOAD" = true ]; then
    echo "→ Uploading Android release to Play Store ($ANDROID_TRACK track)"
    $RUN android upload track:"$ANDROID_TRACK"
  fi
fi

if [ "$PLATFORM" = "ios" ] || [ "$PLATFORM" = "both" ]; then
  if [ "$UPLOAD_ONLY" = false ]; then
    echo "→ Building signed iOS release (.ipa)"
    $RUN ios release
  fi

  if [ "$UPLOAD" = true ]; then
    echo "→ Uploading iOS release to TestFlight"
    $RUN ios upload
  fi
fi

echo "✓ Release build complete"
[ -f android/app/build/outputs/bundle/release/app-release.aab ] && echo "  Android: android/app/build/outputs/bundle/release/app-release.aab"
[ -f build/ios/Donetick.ipa ] && echo "  iOS:     build/ios/Donetick.ipa"

echo ""
echo "Next steps:"
echo "  git add . && git commit -m \"Release \$(node -p \"require('./package.json').version\")\""
echo "  git tag v\$(node -p \"require('./package.json').version\") && git push origin develop --tags"
