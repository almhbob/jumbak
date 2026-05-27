import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

// Show alerts in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    // Simulators cannot receive push notifications
    return null;
  }

  const existing = await Notifications.getPermissionsAsync();
  let isGranted = (existing as { status?: string }).status === 'granted';

  if (!isGranted) {
    const requested = await Notifications.requestPermissionsAsync();
    isGranted = (requested as { status?: string }).status === 'granted';
  }

  if (!isGranted) {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'جنبك',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D6A936',
    });
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return tokenData.data;
  } catch {
    return null;
  }
}

export async function saveTokenToServer(token: string, userId: string): Promise<void> {
  if (!API_URL || !token || !userId) return;
  try {
    await fetch(`${API_URL}/api/notifications/register-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, userId }),
    });
  } catch {
    // Non-fatal — token will be retried on next launch
  }
}

export async function removeTokenFromServer(token: string): Promise<void> {
  if (!API_URL || !token) return;
  try {
    await fetch(`${API_URL}/api/notifications/register-token`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
  } catch {
    // Non-fatal
  }
}

export type NotificationListener = { remove: () => void };

export function addNotificationReceivedListener(
  handler: (n: Notifications.Notification) => void
): NotificationListener {
  return Notifications.addNotificationReceivedListener(handler);
}

export function addNotificationResponseListener(
  handler: (r: Notifications.NotificationResponse) => void
): NotificationListener {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

export function removeNotificationListener(subscription: NotificationListener) {
  subscription.remove();
}
