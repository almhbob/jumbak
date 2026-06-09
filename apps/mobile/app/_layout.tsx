import { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import {
  registerForPushNotifications,
  saveTokenToServer,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  removeNotificationListener,
  NotificationListener,
} from '../src/notifications';

// Initialize Sentry before the component tree mounts
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: __DEV__ ? 1.0 : 0.1,
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
  // Enable automatic breadcrumbs and session tracking
  enableAutoSessionTracking: true,
});

function Layout() {
  const router = useRouter();
  const receivedRef = useRef<NotificationListener | null>(null);
  const responseRef = useRef<NotificationListener | null>(null);

  useEffect(() => {
    // Register and store device token
    (async () => {
      const token = await registerForPushNotifications();
      if (token) {
        const userId = await AsyncStorage.getItem('jnbk_user_id');
        if (userId) await saveTokenToServer(token, userId);
        await AsyncStorage.setItem('jnbk_push_token', token);
      }
    })();

    // Listen for notifications received while app is foregrounded
    receivedRef.current = addNotificationReceivedListener((_notification) => {
      // Notification shown automatically by setNotificationHandler
    });

    // Handle notification tap — navigate to the relevant screen
    responseRef.current = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (data?.rideId) {
        router.push(`/ride?rideId=${data.rideId}`);
      }
    });

    return () => {
      if (receivedRef.current) removeNotificationListener(receivedRef.current);
      if (responseRef.current) removeNotificationListener(responseRef.current);
    };
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}

// Wrap with Sentry to capture unhandled errors and navigation breadcrumbs
export default Sentry.wrap(Layout);
