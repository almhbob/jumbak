import Expo, { ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

const expo = new Expo();

export { Expo };

export async function sendPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<ExpoPushTicket[]> {
  const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t));
  if (!validTokens.length) return [];

  const messages: ExpoPushMessage[] = validTokens.map((to) => ({
    to,
    sound: 'default',
    title,
    body,
    data: data || {},
  }));

  const chunks = expo.chunkPushNotifications(messages);
  const tickets: ExpoPushTicket[] = [];

  for (const chunk of chunks) {
    try {
      const chunkTickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...chunkTickets);
    } catch (err) {
      console.error('Push send error:', err);
    }
  }

  return tickets;
}

export function rideStatusMessage(
  status: string,
  lang: 'ar' | 'en' = 'ar'
): { title: string; body: string } | null {
  const messages: Record<string, { ar: { title: string; body: string }; en: { title: string; body: string } }> = {
    ACCEPTED: {
      ar: { title: 'تم قبول رحلتك', body: 'السائق في طريقه إليك الآن.' },
      en: { title: 'Ride accepted', body: 'Your driver is on the way.' },
    },
    ARRIVING: {
      ar: { title: 'السائق وصل قريباً', body: 'السائق على بعد دقائق منك.' },
      en: { title: 'Driver arriving', body: 'Your driver is almost there.' },
    },
    ACTIVE: {
      ar: { title: 'الرحلة بدأت', body: 'استمتع برحلتك!' },
      en: { title: 'Ride started', body: 'Enjoy your ride!' },
    },
    COMPLETED: {
      ar: { title: 'وصلت بسلامة', body: 'شكراً لاستخدامك جنبك. قيّم رحلتك.' },
      en: { title: 'Ride completed', body: 'Thanks for riding with Jnbk. Please rate your trip.' },
    },
    CANCELLED: {
      ar: { title: 'تم إلغاء الرحلة', body: 'يمكنك طلب رحلة جديدة في أي وقت.' },
      en: { title: 'Ride cancelled', body: 'You can request a new ride anytime.' },
    },
  };
  const entry = messages[status];
  if (!entry) return null;
  return entry[lang];
}
