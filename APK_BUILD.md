# 🚀 JNBK APK BUILD (ركشة.. جنبك)

## 🔗 Admin Panel
https://jumbak-admin.vercel.app

## 📱 Live Preview (Expo)

Run:

```
npx expo start --tunnel
```

Scan using Expo Go.

---

## 📦 Build APK (Direct)

```
cd apps/mobile
npm install
npx expo prebuild
npx eas build -p android --profile preview
```

---

## 📥 After build

You will get:

```
https://expo.dev/artifacts/...apk
```

---

## ⚙️ Config

Backend:
https://workspaceapi-server-production-3e22.up.railway.app

---

## 🔥 Notes

- Default staff password: 123456
- First login forces password change
- Firebase supported
- Preview works without backend

---

## 🎯 Status

✔ Ready for APK
✔ Ready for testing
✔ Ready for deployment (next phase)
