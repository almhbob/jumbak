import React from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors } from '../src/constants/theme';
import { dict, Lang } from '../src/i18n';

const tripsAr = [
  { id: 'one', from: 'السوق', to: 'المستشفى', price: '1200 SDG', status: 'مكتملة' },
  { id: 'two', from: 'المواقف', to: 'الأحياء', price: '1500 SDG', status: 'مكتملة' },
  { id: 'three', from: 'الجامعة', to: 'السوق', price: '1800 SDG', status: 'جارية' }
];

const tripsEn = [
  { id: 'one', from: 'Market', to: 'Hospital', price: '1200 SDG', status: 'Completed' },
  { id: 'two', from: 'Station', to: 'Residential', price: '1500 SDG', status: 'Completed' },
  { id: 'three', from: 'University', to: 'Market', price: '1800 SDG', status: 'Active' }
];

export default function Trips() {
  const params = useLocalSearchParams<{ lang?: Lang }>();
  const lang: Lang = params.lang === 'en' ? 'en' : 'ar';
  const t = dict[lang];
  const rtl = lang === 'ar';
  const trips = lang === 'ar' ? tripsAr : tripsEn;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={[styles.title, rtl && styles.rtl]}>{t.tripHistory}</Text>
      {trips.map((trip) => (
        <View key={trip.id} style={styles.card}>
          <Text style={[styles.route, rtl && styles.rtl]}>{trip.from} {t.to} {trip.to}</Text>
          <Text style={[styles.meta, rtl && styles.rtl]}>{trip.price} - {trip.status}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 22, paddingTop: 60, gap: 14 },
  title: { fontSize: 30, fontWeight: '900', color: colors.navy },
  card: { backgroundColor: colors.white, borderRadius: 28, padding: 18 },
  route: { color: colors.text, fontSize: 20, fontWeight: '900' },
  meta: { color: colors.muted, marginTop: 8 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' }
});
