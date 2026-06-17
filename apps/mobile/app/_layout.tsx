import { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { setUnauthorizedHandler, setTokenCache } from '../src/api';
import { colors } from '../src/constants/theme';
import {
  registerForPushNotifications,
  saveTokenToServer,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  removeNotificationListener,
  NotificationListener,
} from '../src/notifications';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: __DEV__ ? 1.0 : 0.1,
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
  enableAutoSessionTracking: true,
});

function Layout() {
  const router = useRouter();
  const receivedRef = useRef<NotificationListener | null>(null);
  const responseRef = useRef<NotificationListener | null>(null);

  useEffect(() => {
    // Pre-load token into cache so first API call is instant
    AsyncStorage.getItem('jnbk_auth_token').then((t) => setTokenCache(t ?? null));

    // Redirect to login when any API call gets a 401 that can't be refreshed
    setUnauthorizedHandler(() => {
      router.replace('/');
    });

    // Register and store device push token
    (async () => {
      const token = await registerForPushNotifications();
      if (token) {
        const userId = await AsyncStorage.getItem('jnbk_user_id');
        if (userId) await saveTokenToServer(token, userId);
        await AsyncStorage.setItem('jnbk_push_token', token);
      }
    })();

    // Handle notification tap — navigate to the relevant screen
    receivedRef.current = addNotificationReceivedListener((_notification) => {});
    responseRef.current = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (data?.rideId) router.push(`/ride?rideId=${data.rideId}`);
    });

    return () => {
      if (receivedRef.current) removeNotificationListener(receivedRef.current);
      if (responseRef.current) removeNotificationListener(responseRef.current);
    };
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'رجوع',
        headerTitleAlign: 'center',
        headerTintColor: colors.navy,
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.navy, fontWeight: '900' },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="home" options={{ headerShown: false }} />
      <Stack.Screen name="driver" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: 'تسجيل الدخول' }} />
      <Stack.Screen name="driver-register" options={{ title: 'تسجيل السائق' }} />
      <Stack.Screen name="ride" options={{ title: 'الرحلة' }} />
      <Stack.Screen name="wallet" options={{ title: 'المحفظة' }} />
      <Stack.Screen name="settings" options={{ title: 'الإعدادات' }} />
      <Stack.Screen name="support" options={{ title: 'الدعم' }} />
      <Stack.Screen name="legal" options={{ title: 'الشروط والسياسة' }} />
    </Stack>
  );
}

export default Sentry.wrap(Layout);
