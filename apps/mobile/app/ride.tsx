import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Button } from '../src/components/Button';
import { colors } from '../src/constants/theme';
import { dict, Lang } from '../src/i18n';

export default function Ride() {
  const params = useLocalSearchParams<{ pickup?: string; destination?: string; fare?: string; lang?: Lang }>();
  const [step, setStep] = useState(0);
  const lang: Lang = params.lang === 'en' ? 'en' : 'ar';
  const t = dict[lang];
  const rtl = lang === 'ar';
  const states = [t.searching, t.accepted, t.arriving, t.started];
  const pickup = params.pickup || (lang === 'ar' ? 'السوق' : 'Market');
  const destination = params.destination || (lang === 'ar' ? 'المستشفى' : 'Hospital');
  const fare = params.fare || '1200';

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={[styles.kicker, rtl && styles.rtl]}>{t.liveTrip}</Text>
        <Text style={[styles.title, rtl && styles.rtl]}>{states[step]}</Text>
      </View>
      <View style={styles.mapCard}>
        <Text style={styles.logo}>J</Text>
        <View style={styles.progressRow}>
          {states.map((item, index) => (
            <View key={item} style={[styles.dot, index <= step && styles.dotActive]} />
          ))}
        </View>
        <Text style={[styles.route, rtl && styles.rtl]}>{pickup} {t.to} {destination}</Text>
      </View>
      {step > 0 && (
        <View style={[styles.driverCard, rtl && styles.driverCardRtl]}>
          <View style={styles.driverAvatar}><Text style={styles.driverInitial}>M</Text></View>
          <View style={styles.driverInfo}>
            <Text style={[styles.section, rtl && styles.rtl]}>{t.driver}</Text>
            <Text style={[styles.name, rtl && styles.rtl]}>Mohammed Ahmed</Text>
            <Text style={[styles.muted, rtl && styles.rtl]}>{lang === 'ar' ? 'ركشة زرقاء - تقييم 4.8 - 3 دقائق' : 'Blue rickshaw - rating 4.8 - 3 min'}</Text>
          </View>
        </View>
      )}
      <View style={styles.fareCard}>
        <Text style={[styles.section, rtl && styles.rtl]}>{t.fare}</Text>
        <Text style={[styles.fare, rtl && styles.rtl]}>{fare} SDG</Text>
        <Text style={[styles.muted, rtl && styles.rtl]}>{t.cashNote}</Text>
      </View>
      {step < 3 ? (
        <Button title={t.nextStatus} variant='gold' onPress={() => setStep(Math.min(step + 1, 3))} />
      ) : (
        <Button title={t.completeRate} variant='gold' onPress={() => router.push({ pathname: '/rating', params: { lang } })} />
      )}
      <Button title={t.cancel} variant='ghost' onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 22, paddingTop: 58, gap: 16, backgroundColor: colors.bg },
  header: { gap: 2 },
  kicker: { color: colors.gold, fontWeight: '900', letterSpacing: 2 },
  title: { fontSize: 32, fontWeight: '900', color: colors.navy },
  mapCard: { height: 275, borderRadius: 32, padding: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DDF3FA' },
  logo: { color: colors.gold, fontSize: 72, fontWeight: '900' },
  progressRow: { flexDirection: 'row', gap: 8, marginVertical: 22 },
  dot: { width: 42, height: 7, borderRadius: 999, backgroundColor: colors.white },
  dotActive: { backgroundColor: colors.navy },
  route: { color: colors.navy, fontSize: 20, fontWeight: '900' },
  driverCard: { backgroundColor: colors.white, borderRadius: 28, padding: 18, flexDirection: 'row', gap: 14, alignItems: 'center' },
  driverCardRtl: { flexDirection: 'row-reverse' },
  driverAvatar: { width: 54, height: 54, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy },
  driverInitial: { color: colors.gold, fontSize: 26, fontWeight: '900' },
  driverInfo: { flex: 1 },
  fareCard: { backgroundColor: colors.white, borderRadius: 28, padding: 18 },
  section: { color: colors.muted, fontWeight: '800' },
  name: { color: colors.text, fontSize: 24, fontWeight: '900' },
  muted: { color: colors.muted, marginTop: 4 },
  fare: { color: colors.gold, fontSize: 36, fontWeight: '900' },
  rtl: { textAlign: 'right', writingDirection: 'rtl' }
});
