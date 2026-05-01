import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Button } from '../src/components/Button';
import { colors } from '../src/constants/theme';

const states = ['Searching', 'Accepted', 'Arriving', 'Started'];

export default function Ride() {
  const params = useLocalSearchParams<{ pickup: string; destination: string; fare: string }>();
  const [step, setStep] = useState(0);
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Live trip</Text>
        <Text style={styles.title}>{states[step]}</Text>
      </View>
      <View style={styles.mapCard}>
        <Text style={styles.logo}>J</Text>
        <View style={styles.progressRow}>
          {states.map((item, index) => (
            <View key={item} style={[styles.dot, index <= step && styles.dotActive]} />
          ))}
        </View>
        <Text style={styles.route}>{params.pickup} to {params.destination}</Text>
      </View>
      {step > 0 && (
        <View style={styles.driverCard}>
          <View style={styles.driverAvatar}><Text style={styles.driverInitial}>M</Text></View>
          <View style={styles.driverInfo}>
            <Text style={styles.section}>Driver</Text>
            <Text style={styles.name}>Mohammed Ahmed</Text>
            <Text style={styles.muted}>Blue rickshaw - rating 4.8 - 3 min</Text>
          </View>
        </View>
      )}
      <View style={styles.fareCard}>
        <Text style={styles.section}>Fare</Text>
        <Text style={styles.fare}>{params.fare} SDG</Text>
        <Text style={styles.muted}>Cash payment on arrival.</Text>
      </View>
      {step < 3 ? (
        <Button title='Next status' variant='gold' onPress={() => setStep(Math.min(step + 1, 3))} />
      ) : (
        <Button title='Complete and rate' variant='gold' onPress={() => router.push('/rating')} />
      )}
      <Button title='Cancel' variant='ghost' onPress={() => router.back()} />
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
  driverAvatar: { width: 54, height: 54, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy },
  driverInitial: { color: colors.gold, fontSize: 26, fontWeight: '900' },
  driverInfo: { flex: 1 },
  fareCard: { backgroundColor: colors.white, borderRadius: 28, padding: 18 },
  section: { color: colors.muted, fontWeight: '800' },
  name: { color: colors.text, fontSize: 24, fontWeight: '900' },
  muted: { color: colors.muted, marginTop: 4 },
  fare: { color: colors.gold, fontSize: 36, fontWeight: '900' }
});
