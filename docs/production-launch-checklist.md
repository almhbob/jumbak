# Jnbk Production Launch Checklist

This checklist is the final handoff for launching Jnbk after the backend, admin dashboard, and mobile app are connected.

## 1. Backend on Railway

Required variables:

```txt
DATABASE_URL=postgresql://...
JWT_SECRET=replace-with-a-long-random-secret
NODE_ENV=production
PORT=4000
ALLOWED_ORIGINS=https://jnbk-admin.pages.dev,https://jumbak-admin.vercel.app
```

Railway commands are already wired in `package.json`:

```bash
pnpm run railway:build
pnpm run railway:start
```

`railway:start` runs Prisma migrations before starting the API server.

Health check path:

```txt
/health
```

## 2. Admin dashboard

Required variable:

```txt
NEXT_PUBLIC_API_URL=https://YOUR-RAILWAY-BACKEND.up.railway.app
```

After setting the variable, redeploy the dashboard from the latest `main` branch.

Recommended smoke test:

1. Open the dashboard.
2. Log in as an operations, supervisor, business, finance, or developer account.
3. Open Operations and confirm the backend status is online.
4. Open Drivers and approve a pending driver.
5. Open Pricing and change one fare, then confirm the mobile app receives the updated config.

## 3. Mobile app

Required variable before building the APK:

```txt
EXPO_PUBLIC_API_URL=https://YOUR-RAILWAY-BACKEND.up.railway.app
```

Build command:

```bash
cd apps/mobile
eas build -p android --profile preview
```

Before distributing the APK, test this full flow:

1. Passenger login with phone OTP.
2. Driver login and submit driver file.
3. Admin approves driver.
4. Driver goes online.
5. Passenger creates a ride.
6. Driver accepts the ride.
7. Driver moves ride through ARRIVING, ACTIVE, and COMPLETED.
8. Driver wallet updates after completion.

## 4. OTP provider

For real launch, connect a production SMS provider. Until then, the development OTP flow can be used only for testing.

## 5. Production cleanup

Before public release:

- Keep only the active Railway backend service.
- Remove or archive duplicate Railway services.
- Confirm database backups are enabled.
- Confirm `JWT_SECRET` is not the development default.
- Confirm dashboard and mobile point to the same backend URL.
- Test from a real Android device on mobile data, not only Wi-Fi.
