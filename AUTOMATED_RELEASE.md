# Automated Release Pipeline

Builds and (optionally) uploads signed Android and iOS release artifacts from the CLI — no Android Studio or Xcode GUI needed for routine releases.

## Quick start

```sh
./scripts/pull-secrets.sh          # pulls all signing secrets from Vaultwarden
./scripts/release.sh               # bump patch version, build + sign both platforms
./scripts/release.sh --upload      # also upload: Android → Play internal track, iOS → TestFlight
```

Common flags on `release.sh`:

| Flag                  | Effect                                                |
| --------------------- | ----------------------------------------------------- |
| `--android` / `--ios` | Build only one platform                               |
| `--bump minor\|major` | Bump type (default: `patch`)                          |
| `--skip-bump`         | Build with the current version, don't bump            |
| `--upload`            | Upload after building                                 |
| `--track TRACK`       | Play Store track for `--upload` (default: `internal`) |

Outputs:

- Android: `android/app/build/outputs/bundle/release/app-release.aab`
- iOS: `build/ios/Donetick.ipa`

## One-time machine setup

1. `bundle install` — installs fastlane (Ruby gems, local to the repo via `vendor/bundle`)
2. `./scripts/pull-secrets.sh` — pulls all secrets below from Vaultwarden
3. `android/local.properties` needs `sdk.dir=<path to Android SDK>` — not pulled from vault, machine-specific. Android Studio creates this automatically; if building headless-only, create it manually.
4. Export `ASC_ISSUER_ID` (App Store Connect API key issuer ID) — either in your shell profile, or add it to the `Donetick Env Production` vault note so `pull-secrets.sh` delivers it into `.env.production` (which `release.sh` auto-sources).
5. A working Apple Distribution certificate + the `Donetick App Store(fastline)` provisioning profile must be installed in your keychain / `~/Library/MobileDevice/Provisioning Profiles/` (see "iOS signing model" below) — **not** currently pulled from vault, machine-specific one-time setup.

## Secrets pulled by `scripts/pull-secrets.sh`

All secrets live in Vaultwarden (`https://www.bitwarden.com`) as Secure Notes, named exactly as below:

| Vault item name                      | Written to                                      | Encoding |
| ------------------------------------ | ----------------------------------------------- | -------- |
| Donetick Google Services Android     | `android/app/google-services.json`              | raw      |
| Donetick Android Keystore            | `android/app/release/donetick.jks`              | base64   |
| Donetick Keystore Password           | (used inline for `android/keystore.properties`) | raw      |
| Donetick Google Play Service Account | `android/play-service-account.json`             | raw      |
| Donetick Google Services iOS         | `ios/App/App/GoogleService-Info.plist`          | raw      |
| Donetick App Store Connect Key       | `ios/AuthKey_84F695CDQ3.p8`                     | base64   |
| Donetick Env Production              | `.env.production`                               | raw      |

None of these files are committed to git — all covered by `.gitignore`.

## iOS signing model (important — don't relitigate this)

The App target uses **manual signing for Release**, not Automatic. This was a deliberate choice, not the default:

- The project has **two** Apple Distribution-type certificates on the Apple Developer account: an Xcode Cloud–managed one (private key never leaves Apple, can't be used for local CLI signing) and a plain one created via Xcode → Settings → Accounts → Manage Certificates (private key is in the local keychain, usable). Automatic signing kept binding to the wrong (Managed) one.
- Fix: `ios/App/App.xcodeproj/project.pbxproj` → App target → Release config has `CODE_SIGN_STYLE = Manual`, `CODE_SIGN_IDENTITY = "Apple Distribution"`, `PROVISIONING_PROFILE_SPECIFIER = "Donetick App Store(fastline)"`. Debug config is untouched (still Automatic, for local dev builds in Xcode).
- `fastlane/Fastfile`'s `ios release` lane passes explicit `export_options: { signingStyle: "manual", provisioningProfiles: {...} }` to `build_app` — do **not** switch this back to `-allowProvisioningUpdates`/automatic without a good reason, it re-triggers the ambiguous cert selection.

**If you ever add/change an entitlement** (new Capability in Signing & Capabilities, e.g. a new permission), the existing provisioning profile becomes stale and exports will fail with an error like `"App.app" requires a provisioning profile with the X feature`. Fix:

1. developer.apple.com → Identifiers → `com.donetick.app` → confirm the new capability is checked
2. developer.apple.com → Profiles → find `Donetick App Store(fastline)` → regenerate it → download
3. Install it locally: get its UUID (`security cms -D -i <file>.mobileprovision | plutil -extract UUID xml1 -o - -`) and copy to `~/Library/MobileDevice/Provisioning Profiles/<uuid>.mobileprovision`

**If the Distribution certificate ever expires/is revoked**, redo the one-time Xcode step: Settings → Accounts → Manage Certificates → `+` → Apple Distribution, then regenerate the profile as above.

## Android signing model

Standard keystore signing via `android/keystore.properties`, read by `android/app/build.gradle`. One historical gotcha already fixed: `storeFile` must be `release/donetick.jks` (relative to the `android/app` module dir), **not** `app/release/donetick.jks` — that extra `app/` silently resolved to a double-nested wrong path and broke CLI builds (Android Studio may have masked this before).

## Play Store upload gotchas

- The service account (`fastline-471@donetick-5f910.iam.gserviceaccount.com`) needs the **Google Play Android Developer API enabled** in its GCP project (`donetick-5f910`), **and** explicit per-app release permission granted in Play Console → Users and permissions (not just account-level access) — **and you have to actually click Save**, the UI will silently not persist it otherwise.
- Google Play Console permission changes can take time to propagate on Google's backend even after saving (historically documented as up to ~24h, though in practice it was near-instant once actually saved).
- The Play Developer API requires the app to have had **at least one manual release** uploaded through the Play Console website before API uploads work at all — not an issue for Donetick (already satisfied) but relevant if this is ever set up for a brand-new app.

## Fastlane lanes reference

```sh
bundle exec fastlane android release          # build signed .aab
bundle exec fastlane android apk              # build signed .apk (sideloading/testing)
bundle exec fastlane android upload [track:X] # upload .aab to Play Store (default track: internal)

bundle exec fastlane ios release              # build signed .ipa
bundle exec fastlane ios upload               # upload .ipa to TestFlight
```
