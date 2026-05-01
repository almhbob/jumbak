# JUMBAK Preview

## Repository
https://github.com/almhbob/jumbak

## Mobile preview with Expo

```bash
cd ~/jumbak
git pull
rm -rf node_modules apps/mobile/node_modules pnpm-lock.yaml
pnpm install --force
pnpm --filter @jumbak/mobile start --clear
```

Open the QR code with Expo Go.

## Backend preview

```bash
cd ~/jumbak
pnpm --filter @jumbak/server dev
```

Health check:

```bash
curl http://localhost:4000/health
```

Expected response:

```json
{"ok":true,"app":"JUMBAK"}
```

## Admin dashboard preview

```bash
cd ~/jumbak
pnpm --filter @jumbak/admin dev
```

Open:

```text
http://localhost:3001
```

## Current implemented flows

- Bilingual Arabic / English interface
- OTP login preview
- Passenger flow
- Driver registration
- Driver dashboard
- Multi-city support
- Rickshaw, car, and van services
- Backend API
- Prisma PostgreSQL-ready schema
- Railway-ready deployment config
- EAS APK preview config
