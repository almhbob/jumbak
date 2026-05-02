# Jnbk Mobile Build Guide

## Preview APK

Use this when you want to install and test the app directly on Android.

```bash
cd apps/mobile
eas build --platform android --profile preview
```

## Production AAB

Use this for Google Play Console.

```bash
cd apps/mobile
eas build --platform android --profile production
```

## Required API URL

Before building, set the backend URL in EAS secrets or your shell:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value https://YOUR-RAILWAY-BACKEND.up.railway.app
```

Or run locally:

```bash
EXPO_PUBLIC_API_URL=https://YOUR-RAILWAY-BACKEND.up.railway.app pnpm start
```

## Test before release

```text
Passenger login
Driver login
Passenger requests a ride
Driver accepts ride
Passenger sees live ride update
Driver completes ride
Passenger rates ride
Trip appears in history
Support request submits successfully
```

## Current Android package

```text
com.almhbob.jnbk
```
