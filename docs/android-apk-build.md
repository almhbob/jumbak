# Android APK Build Handoff

Backend API:

```txt
https://jumbakserver-production.up.railway.app
```

The Expo EAS preview profile already uses this backend URL.

Current mobile release prepared for APK testing:

```txt
version: 0.1.2
android.versionCode: 3
package: com.almhbob.jnbk
```

Build command:

```bash
cd apps/mobile
eas build -p android --profile preview
```

The preview profile produces an APK for direct Android installation.

After the build finishes, open the EAS build link and download the APK.

Smoke test checklist:

1. Install the APK on a real Android phone.
2. Log in as a driver.
3. Open the driver dashboard.
4. Confirm the app loads the current driver profile from `/api/drivers/me`.
5. Approve the driver from the admin dashboard if needed.
6. Toggle the driver online.
7. Create a passenger ride.
8. Accept, start, and complete the ride.
9. Confirm the wallet balance updates.
