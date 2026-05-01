import React from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { colors } from '../src/constants/theme';

const trips = [
  { id: 'one', from: 'Market', to: 'Hospital', price: '1200 SDG', status: 'Completed' },
  { id: 'two', from: 'Station', to: 'Residential', price: '1500 SDG', status: 'Completed' },
  { id: 'three', from: 'University', to: 'Market', price: '1800 SDG', status: 'Active' }
];

export default function Trips() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Trip history</Text>
      {trips.map((trip) => (
        <View key={trip.id} style={styles.card}>
          <Text style={styles.route}>{trip.from} to {trip.to}</Text>
          <Text style={styles.meta}>{trip.price} - {trip.status}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 22, paddingTop: 60, gap: 14 },
  title: { fontSize: 30, fontWeight: '900', color: colors.navy },
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 18 },
  route: { color: colors.text, fontSize: 20, fontWeight: '900' },
  meta: { color: colors.muted, marginTop: 8 }
});
