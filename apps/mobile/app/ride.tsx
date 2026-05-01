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
      <Text style={styles.title}>{states[step]}</Text>
      <Text style={styles.map}>JUMBAK</Text>
      <Text style={styles.route}>{params.pickup} to {params.destination}</Text>
      {step > 0 && (
        <View style={styles.card}>
          <Text style={styles.section}>Driver</Text>
          <Text style={styles.name}>Mohammed Ahmed</Text>
          <Text style={styles.muted}>Blue rickshaw - rating 4.8 - 3 min</Text>
        </View>
      )}
      <View style={styles.card}>
        <Text style={styles.section}>Fare</Text>
        <Text style={styles.fare}>{params.fare} SDG</Text>
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
  screen: { flex: 1, padding: 22, paddingTop: 60, gap: 16, backgroundColor: colors.bg },
  title: { fontSize: 30, fontWeight: '900', color: colors.navy },
  map: { padding: 70, textAlign: 'center', borderRadius: 24, backgroundColor: '#DDF3FA', color: colors.gold, fontSize: 40, fontWeight: '900' },
  route: { color: colors.navy, fontSize: 20, fontWeight: '900' },
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 18 },
  section: { color: colors.muted, fontWeight: '800' },
  name: { color: colors.text, fontSize: 24, fontWeight: '900' },
  muted: { color: colors.muted },
  fare: { color: colors.gold, fontSize: 32, fontWeight: '900' }
});
