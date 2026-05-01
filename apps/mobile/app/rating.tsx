import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../src/components/Button';
import { colors } from '../src/constants/theme';
import { dict, Lang } from '../src/i18n';
import { submitRideRating } from '../src/api';

export default function Rating() {
  const params = useLocalSearchParams<{ lang?: Lang; rideId?: string }>();
  const lang: Lang = params.lang === 'en' ? 'en' : 'ar';
  const t = dict[lang];
  const rtl = lang === 'ar';
  const [value, setValue] = useState(5);
  const [saving, setSaving] = useState(false);

  async function finishRating() {
    setSaving(true);
    try {
      if (params.rideId) {
        await submitRideRating(params.rideId, value);
      }
      router.replace({ pathname: '/home', params: { lang } });
    } catch {
      Alert.alert('JUMBAK', lang === 'ar' ? 'تعذر حفظ التقييم على الخادم. تم حفظ التجربة محليًا.' : 'Could not save rating online. Continuing locally.');
      router.replace({ pathname: '/home', params: { lang } });
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={[styles.title, rtl && styles.rtl]}>{t.tripCompleted}</Text>
      <View style={styles.card}>
        <Text style={[styles.question, rtl && styles.rtl]}>{t.rateRide}</Text>
        <Text style={styles.score}>{value} / 5</Text>
        {!!params.rideId && <Text style={styles.rideId}>#{params.rideId}</Text>}
        <View style={styles.row}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Button key={n} title={`${n}`} variant={n === value ? 'gold' : 'ghost'} onPress={() => setValue(n)} />
          ))}
        </View>
      </View>
      <Button title={saving ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : t.backHome} onPress={finishRating} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 22, paddingTop: 90, gap: 18, backgroundColor: colors.bg },
  card: { backgroundColor: colors.white, borderRadius: 30, padding: 22, gap: 18 },
  title: { textAlign: 'center', color: colors.navy, fontSize: 30, fontWeight: '900' },
  question: { textAlign: 'center', color: colors.text, fontSize: 20, fontWeight: '900' },
  score: { textAlign: 'center', color: colors.gold, fontSize: 52, fontWeight: '900' },
  rideId: { textAlign: 'center', color: colors.muted, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  rtl: { textAlign: 'right', writingDirection: 'rtl' }
});
