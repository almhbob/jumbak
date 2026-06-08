import { createRequire } from 'module';
import { logger } from './logger.js';

const require = createRequire(import.meta.url);

// Africa's Talking SMS — configured via AT_API_KEY + AT_USERNAME env vars
let smsClient: { send: (opts: { to: string[]; message: string }) => Promise<unknown> } | null = null;

function getClient() {
  if (smsClient) return smsClient;
  const apiKey = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME;
  if (!apiKey || !username) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AfricasTalking = require('africastalking') as any;
    const at = AfricasTalking({ apiKey, username });
    smsClient = at.SMS;
    return smsClient;
  } catch (err) {
    logger.error('Failed to initialize Africa\'s Talking SDK', { err });
    return null;
  }
}

export async function sendSms(phone: string, message: string): Promise<boolean> {
  const client = getClient();
  if (!client) {
    logger.warn('SMS not sent — AT_API_KEY/AT_USERNAME not configured', { phone });
    return false;
  }
  try {
    await client.send({ to: [phone], message });
    logger.info('SMS sent', { phone });
    return true;
  } catch (err) {
    logger.error('SMS send failed', { phone, err });
    return false;
  }
}

export function isSmsConfigured(): boolean {
  return !!(process.env.AT_API_KEY && process.env.AT_USERNAME);
}
