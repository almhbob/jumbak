import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TextInput, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../src/components/Button';
import { colors } from '../src/constants/theme';
import { dict, Lang } from '../src/i18n';
import { submitRideRating } from '../src/api';

export default function Rating() {
  const params = useLocalSearchParams<{ lang?: Lang; rideId?: string }>();
  const [lang, setLang] = useState<Lang>(params.lang === 'en' ? 'en' : 'ar');
  const t = dict[lang];
  const rtl = lang === 'ar';
  const [value, setValue] = useState(5);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState<'ready' | 'api' | 'local'>('ready');

  async function finishRating() {
    setSaving(true);
    try {
      if (params.rideId) {
        await submitRideRating(params.rideId, value);
        setSource('api');
      } else {
        setSource('local');
      }
      const item = { rideId: params.rideId || `local_${Date.now()}`, rating: value, note, createdAt: new Date().toISOString() };
      const saved = JSON.parse(String(localStorageShim.getItem('jnbk_mobile_ratings') || '[]'));
      localStorageShim.setItem('jnbk_mobile_ratings', JSON.stringify([item, ...saved].slice(0, 25)));
      Alert.alert('Jnbk جنبك', lang === 'ar' ? 'تم حفظ التقييم بنجاح. شكرًا لك.' : 'Rating saved successfully. Thank you.');
      router.replace({ pathname: '/home', params: { lang } });
    } catch {
      setSource('local');
      const item = { rideId: params.rideId || `local_${Date.now()}`, rating: value, note, createdAt: new Date().toISOString() };
      const saved = JSON.parse(String(localStorageShim.getItem('jnbk_mobile_ratings') || '[]'));
      localStorageShim.setItem('jnbk_mobile_ratings', JSON.stringify([item, ...saved].slice(0, 25)));
      Alert.alert('Jnbk جنبك', lang === 'ar' ? 'تعذر حفظ التقييم على الخادم، وتم حفظ نسخة محلية للمعاينة.' : 'Could not save rating online. A local preview copy was saved.');
      router.replace({ pathname: '/home', params: { lang } });
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, rtl && styles.reverse]}>
        <View>
          <Text style={[styles.kicker, rtl && styles.rtl]}>Jnbk جنبك</Text>
          <Text style={[styles.title, rtl && styles.rtl]}>{t.tripCompleted}</Text>
        </View>
        <Pressable style={styles.langButton} onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
          <Text style={styles.langText}>{t.language}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={[styles.question, rtl && styles.rtl]}>{t.rateRide}</Text>
        <Text style={styles.score}>{value} / 5</Text>
        {!!params.rideId && <Text style={styles.rideId}>#{params.rideId}</Text>}
        <View style={styles.row}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} style={[styles.star, n <= value && styles.starActive]} onPress={() => setValue(n)}>
              <Text style={[styles.starText, n <= value && styles.starTextActive]}>★</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          multiline
          value={note}
          onChangeText={setNote}
          placeholder={lang === 'ar' ? 'ملاحظات اختيارية عن الرحلة...' : 'Optional trip feedback...'}
          style={[styles.input, rtl && styles.rtl]}
        />
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{source === 'api' ? 'API' : source === 'local' ? 'Local' : (lang === 'ar' ? 'جاهز للحفظ' : 'Ready to save')}</Text>
        </View>
      </View>
      <Button title={saving ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ التقييم والعودة للرئيسية' : 'Save rating and go home')} onPress={finishRating} />
      <Button title={lang === 'ar' ? 'تخطي التقييم' : 'Skip rating'} variant='ghost' onPress={() => router.replace({ pathname: '/home', params: { lang } })} />
    </View>
  );
}

const localMemory: Record<string, string> = {};
const localStorageShim = {
  getItem(key: string) {
    try {
      // @ts-ignore
      return globalThis?.localStorage?.getItem(key) || localMemory[key] || null;
    } catch {
      return localMemory[key] || null;
    }
  },
  setItem(key: string, value: string) {
    try {
      // @ts-ignore
      globalThis?.localStorage?.setItem(key, value);
    } catch {
      localMemory[key] = value;
    }
  }
};

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 22, paddingTop: 70, gap: 18, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reverse: { flexDirection: 'row-reverse' },
  kicker: { color: colors.gold, fontWeight: '900', letterSpacing: 2 },
  langButton: { borderRadius: 18, backgroundColor: colors.navy, paddingVertical: 11, paddingHorizontal: 14 },
  langText: { color: colors.white, fontWeight: '900' },
  card: { backgroundColor: colors.white, borderRadius: 30, padding: 22, gap: 18 },
  title: { color: colors.navy, fontSize: 30, fontWeight: '900' },
  question: { textAlign: 'center', color: colors.text, fontSize: 20, fontWeight: '900' },
  score: { textAlign: 'center', color: colors.gold, fontSize: 52, fontWeight: '900' },
  rideId: { textAlign: 'center', color: colors.muted, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  star: { width: 48, height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E7EEF5' },
  starActive: { backgroundColor: colors.gold },
  starText: { color: colors.navy, fontSize: 25, fontWeight: '900' },
  starTextActive: { color: colors.navy },
  input: { minHeight: 105, textAlignVertical: 'top', backgroundColor: '#F1F5F9', borderRadius: 20, padding: 14, color: colors.text, fontWeight: '800' },
  statusPill: { alignSelf: 'center', backgroundColor: '#E7F7EF', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 13 },
  statusText: { color: colors.teal, fontWeight: '900' },
  rtl: { textAlign: 'right', writingDirection: 'rtl' }
});
