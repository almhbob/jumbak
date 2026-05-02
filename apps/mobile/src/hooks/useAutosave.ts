import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AutosaveStatus = 'idle' | 'restored' | 'saving' | 'saved' | 'error';

export function useAutosave<T extends Record<string, unknown>>(key: string, value: T, applyDraft: (draft: Partial<T>) => void, enabled = true) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const loaded = useRef(false);
  const serialized = JSON.stringify(value);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(key)
      .then((saved) => {
        if (!alive) return;
        if (saved) {
          applyDraft(JSON.parse(saved));
          setStatus('restored');
        }
      })
      .catch(() => alive && setStatus('error'))
      .finally(() => {
        loaded.current = true;
      });
    return () => {
      alive = false;
    };
  }, [key]);

  useEffect(() => {
    if (!enabled || !loaded.current) return;
    setStatus('saving');
    const timer = setTimeout(() => {
      AsyncStorage.setItem(key, serialized)
        .then(() => setStatus('saved'))
        .catch(() => setStatus('error'));
    }, 450);
    return () => clearTimeout(timer);
  }, [enabled, key, serialized]);

  async function clearDraft() {
    await AsyncStorage.removeItem(key);
    setStatus('idle');
  }

  return { status, clearDraft };
}

export function autosaveLabel(status: AutosaveStatus, lang: 'ar' | 'en') {
  if (status === 'saving') return lang === 'ar' ? 'جاري الحفظ التلقائي...' : 'Autosaving...';
  if (status === 'saved') return lang === 'ar' ? 'تم الحفظ تلقائيًا' : 'Autosaved';
  if (status === 'restored') return lang === 'ar' ? 'تم استرجاع بيانات محفوظة' : 'Saved draft restored';
  if (status === 'error') return lang === 'ar' ? 'تعذر الحفظ التلقائي' : 'Autosave failed';
  return lang === 'ar' ? 'الحفظ التلقائي مفعل' : 'Autosave enabled';
}
