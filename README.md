# JUMBAK | جمبك

JUMBAK is a bilingual multi-city transport platform inspired by modern ride-hailing apps and adapted for Sudanese local mobility. The first launch area is Rufaa, with support for adding more cities inside or outside Sudan.

## What is included

- Passenger mobile app
- Driver registration and driver dashboard
- Admin operations dashboard
- Express API backend
- Prisma PostgreSQL schema
- Railway-ready backend configuration
- Vercel/Railway-ready admin dashboard
- Expo/EAS Android preview configuration
- Arabic and English interface
- Multi-city support
- Rickshaw, car, and van service types

## Project structure

```text
apps/mobile      Expo mobile app for passengers and drivers
apps/admin       Next.js admin dashboard
server           Express API server
server/prisma    Prisma schema and seed data
docs             Deployment and preview guides
```

## Brand colors

```text
Navy:       #063B63
Teal:       #0E8FB3
Gold:       #D6A936
Background: #F7FAFC
```

## Local setup

```bash
pnpm install --force
```

### Backend

```bash
pnpm --filter @jumbak/server dev
```

Health check:

```text
http://localhost:4000/health
```

### Admin dashboard

```bash
pnpm --filter @jumbak/admin dev
```

Open:

```text
http://localhost:3001
```

### Mobile app

```bash
pnpm --filter @jumbak/mobile start --clear
```

Open the QR code with Expo Go.

## Environment variables

Backend:

```text
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/jumbak"
JWT_SECRET="change_me_to_a_long_random_secret"
PORT=4000
NODE_ENV="production"
```

Mobile:

```text
EXPO_PUBLIC_API_URL="https://your-jumbak-api.up.railway.app"
```

Admin:

```text
NEXT_PUBLIC_API_URL="https://your-jumbak-api.up.railway.app"
```

## Database commands

```bash
pnpm --filter @jumbak/server prisma:generate
pnpm --filter @jumbak/server prisma:migrate
pnpm --filter @jumbak/server seed
```

## Current status

JUMBAK is now beyond the initial prototype stage. It includes a working app flow, API routes, database-ready models, admin dashboard, driver onboarding, OTP preview login, and deployment preparation.

## Next production steps

1. Connect the GitHub repository to Railway.
2. Add PostgreSQL on Railway.
3. Set `DATABASE_URL` and `JWT_SECRET`.
4. Run Prisma migration and seed.
5. Set `EXPO_PUBLIC_API_URL` and `NEXT_PUBLIC_API_URL` to the Railway backend URL.
6. Build the Android APK with EAS.
