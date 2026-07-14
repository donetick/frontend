fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios release

```sh
[bundle exec] fastlane ios release
```

Build a signed, App Store-ready .ipa

### ios upload

```sh
[bundle exec] fastlane ios upload
```

Upload the built .ipa to TestFlight

----


## Android

### android release

```sh
[bundle exec] fastlane android release
```

Build a signed release .aab

### android apk

```sh
[bundle exec] fastlane android apk
```

Build a signed release .apk (for sideloading/testing)

### android upload

```sh
[bundle exec] fastlane android upload
```

Upload the built .aab to the Play Store (internal testing track by default)

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
