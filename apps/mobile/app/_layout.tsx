import { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  registerForPushNotifications,
  saveTokenToServer,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  removeNotificationListener,
  NotificationListener,
} from '../src/notifications';

export default function Layout() {
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
