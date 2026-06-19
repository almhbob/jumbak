#!/usr/bin/env bash
set -euo pipefail

npm install --legacy-peer-deps
npx expo prebuild --platform android --clean --non-interactive
npx expo export:embed --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res
cd android
./gradlew assembleDebug --no-daemon
