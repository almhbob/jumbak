# Jnbk | جنبك Production Launch Checklist

This document coordinates the final production steps for backend, database, admin dashboard, mobile app, and Android builds.

## 1. Railway Backend

Required environment variables on Railway:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
JWT_SECRET=replace_with_a_long_random_secret
NODE_ENV=production
PORT=4000
```

Recommended Railway commands:

```bash
pnpm install --force
pnpm --filter @jumbak/server build
pnpm --filter @jumbak/server start:prod
```

Production start script already runs:

```bash
prisma migrate deploy
prisma seed
node dist/main.js
```

Health check after deployment:

```text
/health
```

Expected response:

```json
{"ok":true,"app":"Jnbk","appAr":"جنبك"}
```

## 2. PostgreSQL and Prisma

After PostgreSQL is attached to Railway, verify:

```bash
pnpm --filter @jumbak/server prisma:generate
pnpm --filter @jumbak/server prisma:deploy
pnpm --filter @jumbak/server seed
```

Important database tables now include:

```text
Country
City
Zone
VehicleType
User
Driver
Vehicle
Ride
SupportRequest
StaffMember
LegalDocument
```

## 3. Vercel Admin Dashboard

Required Vercel variable:

```text
NEXT_PUBLIC_API_URL=https://YOUR-RAILWAY-BACKEND.up.railway.app
```

After setting it:

```text
Redeploy apps/admin
Open /system
Confirm API = Ready
Open /portal
Test backend staff login
Open /legal/privacy and save a change
```

## 4. Expo Mobile App

Required Expo/EAS variable:

```text
EXPO_PUBLIC_API_URL=https://YOUR-RAILWAY-BACKEND.up.railway.app
```

Build preview APK:

```bash
cd apps/mobile
eas build --platform android --profile preview
```

Build production AAB:

```bash
cd apps/mobile
eas build --platform android --profile production
```

Submit to Google Play internal track:

```bash
cd apps/mobile
eas submit --platform android --profile production
```

## 5. Functional Testing Flow

Test this exact order before launch:

```text
1. Admin /system shows API Ready.
2. Admin /portal logs in with a real staff account.
3. Business /staff creates a staff user.
4. Legal pages save to backend.
5. Mobile passenger logs in with OTP preview.
6. Passenger requests a ride.
7. Driver dashboard fetches open rides.
8. Driver accepts the ride.
9. Driver updates ride status.
10. Passenger ride screen auto-refreshes.
11. Trip becomes completed.
12. Passenger submits rating.
13. Trip appears in trip history.
```

## 6. Launch Readiness

Before public release:

```text
App icon
Splash screen
Privacy policy final review
Terms of use final review
Google Play Console account
Internal testing release
Real SMS provider
Maps/GPS provider
Support contact channel
Backup plan for database
Monitoring and error reports
```

## 7. Current Preview Safety

Until real production keys are connected, the system keeps safe fallbacks:

```text
Admin falls back to preview mode.
Mobile falls back to local preview data.
Legal editor falls back to localStorage.
OTP uses development code 123456.
```

Replace all preview fallbacks before public launch.
