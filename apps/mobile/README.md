# ArenaSports mobile

Expo SDK 57 / React Native 0.86 Android-first client.

```bash
pnpm install
pnpm dev:mobile
```

The default Android emulator API URL is `http://10.0.2.2:4000/v1`. Set `EXPO_PUBLIC_API_URL` to the computer's LAN address for a physical device.

The current application is a foundation shell. Tournament discovery calls the API. Authentication, persistent tournament creation, notifications, evidence capture, and production builds remain planned.

Never put server secrets or signing credentials in `EXPO_PUBLIC_*` variables.
