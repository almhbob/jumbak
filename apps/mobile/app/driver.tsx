import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Button } from '../src/components/Button';
import { colors } from '../src/constants/theme';
import { dict, Lang } from '../src/i18n';
import { subscribeFirebaseCollection, updateFirebaseDocument } from '../src/firebase';

type Ride = { id: string; pickupLabel?: string; destinationLabel?: string; estimatedFare?: number; distanceKm?: number; status?: string };

export default function Driver() {
  const params = useLocalSearchParams<{ lang?: Lang }>();
  const [lang, setLang] = useState<Lang>(params.lang === 'en' ? 'en' : 'ar');
  const [online, setOnline] = useState(false);
  const [rides, setRides] = useState<Ride[]>([]);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);

  const t = dict[lang];
  const rtl = lang === 'ar';

  useEffect(() => {
    if (!online) return;

    const unsubscribe = subscribeFirebaseCollection<Ride>(
      'rides',
      ['REQUESTED', 'ACCEPTED', 'ARRIVING', 'ACTIVE'],
      (data) => setRides(data),
      () => setRides([])
    );

    return () => unsubscribe?.();
  }, [online]);

  function toggle(val: boolean) {
    setOnline(val);
    if (!val) {
      setRides([]);
      setActiveRide(null);
    }
  }

  async function updateStatus(ride: Ride, status: string) {
    await updateFirebaseDocument('rides', ride.id, { status });
    if (status === 'COMPLETED') setActiveRide(null);
    else setActiveRide({ ...ride, status });
    setRides(rides.filter((r) => r.id !== ride.id));
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={[styles.header, rtl && styles.reverse]}>
        <Text style={[styles.title, rtl && styles.rtl]}>{t.driverDashboard}</Text>
        <Pressable onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')} style={styles.langBtn}>
          <Text style={styles.langText}>{t.language}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.status}>{online ? t.online : t.offline}</Text>
        <Switch value={online} onValueChange={toggle} />
      </View>

      {online && !activeRide && rides.map((ride) => (
        <View key={ride.id} style={styles.rideCard}>
          <Text style={styles.route}>{ride.pickupLabel} → {ride.destinationLabel}</Text>
          <Text style={styles.muted}>{ride.distanceKm} km</Text>
          <Text style={styles.fare}>{ride.estimatedFare} SDG</Text>
          <Button title={t.acceptRide} variant='gold' onPress={() => updateStatus(ride, 'ACCEPTED')} />
          <Button title={t.reject} variant='ghost' onPress={() => setRides(rides.filter(r => r.id !== ride.id))} />
        </View>
      ))}

      {activeRide && (
        <View style={styles.active}>
          <Text style={styles.route}>{activeRide.pickupLabel} → {activeRide.destinationLabel}</Text>
          <Button title='Arrived' variant='gold' onPress={() => updateStatus(activeRide, 'ARRIVING')} />
          <Button title='Start' variant='gold' onPress={() => updateStatus(activeRide, 'ACTIVE')} />
          <Button title='Complete' variant='gold' onPress={() => updateStatus(activeRide, 'COMPLETED')} />
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reverse: { flexDirection: 'row-reverse' },
  title: { fontSize: 26, fontWeight: '900', color: colors.navy },
  langBtn: { backgroundColor: colors.navy, padding: 10, borderRadius: 12 },
  langText: { color: colors.white },
  card: { backgroundColor: colors.white, padding: 16, borderRadius: 20, flexDirection: 'row', justifyContent: 'space-between' },
  status: { fontWeight: '900', color: colors.navy },
  rideCard: { backgroundColor: colors.white, padding: 16, borderRadius: 20, gap: 8 },
  route: { fontWeight: '900', fontSize: 18 },
  muted: { color: colors.muted },
  fare: { color: colors.gold, fontWeight: '900', fontSize: 22 },
  active: { backgroundColor: colors.white, padding: 20, borderRadius: 20, gap: 10 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' }
});
