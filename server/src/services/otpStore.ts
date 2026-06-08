// In-memory OTP store with TTL — replace with Redis in high-scale production

const TTL_MS = 10 * 60 * 1000; // 10 minutes

interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}

const store = new Map<string, OtpEntry>();

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function storeOtp(phone: string, code: string): void {
  store.set(phone, { code, expiresAt: Date.now() + TTL_MS, attempts: 0 });
}

export function verifyOtp(phone: string, code: string): 'ok' | 'invalid' | 'expired' | 'too_many_attempts' {
  const entry = store.get(phone);
  if (!entry) return 'invalid';
  if (Date.now() > entry.expiresAt) {
    store.delete(phone);
    return 'expired';
  }
  if (entry.attempts >= 5) return 'too_many_attempts';

  entry.attempts++;
  if (entry.code !== code) return 'invalid';

  store.delete(phone);
  return 'ok';
}

export function clearOtp(phone: string): void {
  store.delete(phone);
}
