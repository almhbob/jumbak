import React, { useState } from 'react';
import { ScrollView, Text, StyleSheet, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../src/components/Button';
import { colors, zones } from '../src/constants/theme';

export default function Home() {
  const [pickup, setPickup] = useState('Market');
  const [destination, setDestination] = useState('Hospital');
  const fare = pickup === destination ? 1000 : 1200;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>JUMBAK</Text>
          <Text style={styles.title}>Where are you going?</Text>
        </View>
        <Text style={styles.avatar}>J</Text>
      </View>
      <View style={styles.mapCard}>
        <Text style={styles.mapTitle}>Rufaa live map</Text>
        <Text style={styles.mapSub}>{pickup} to {destination}</Text>
        <View style={styles.routeLine}>
          <View style={styles.pin} />
          <View style={styles.line} />
          <View style={[styles.pin, styles.pinGold]} />
        </View>
      </View>
      <Text style={styles.label}>Pickup</Text>
      <View style={styles.wrap}>
        {zones.slice(0, 4).map((z) => (
          <Pressable key={z} onPress={() => setPickup(z)} style={[styles.chip, pickup === z && styles.active]}>
            <Text style={[styles.chipText, pickup === z && styles.activeText]}>{z}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Destination</Text>
      <View style={styles.wrap}>
        {zones.slice(1, 6).map((z) => (
          <Pressable key={z} onPress={() => setDestination(z)} style={[styles.chip, destination === z && styles.active]}>
            <Text style={[styles.chipText, destination === z && styles.activeText]}>{z}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.fareCard}>
        <Text style={styles.fareLabel}>Estimated fare</Text>
        <Text style={styles.fare}>{fare} SDG</Text>
        <Text style={styles.note}>Base fare plus local distance estimate.</Text>
      </View>
      <Button title='Request rickshaw' onPress={() => router.push({ pathname: '/ride', params: { pickup, destination, fare } })} />
      <Button title='Trip history' variant='ghost' onPress={() => router.push('/trips')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 22, paddingTop: 58, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hello: { color: colors.gold, fontWeight: '900', letterSpacing: 2 },
  title: { fontSize: 30, fontWeight: '900', color: colors.navy },
  avatar: { width: 48, height: 48, borderRadius: 18, backgroundColor: colors.navy, color: colors.gold, textAlign: 'center', textAlignVertical: 'center', fontSize: 24, fontWeight: '900' },
  mapCard: { height: 235, borderRadius: 30, padding: 22, justifyContent: 'space-between', backgroundColor: '#DDF3FA' },
  mapTitle: { color: colors.teal, fontSize: 28, fontWeight: '900' },
  mapSub: { color: colors.navy, fontSize: 16, fontWeight: '800' },
  routeLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  pin: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.teal },
  pinGold: { backgroundColor: colors.gold },
  line: { flex: 1, height: 4, backgroundColor: colors.white, marginHorizontal: 8, borderRadius: 999 },
  label: { color: colors.text, fontWeight: '900', fontSize: 16, marginTop: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingVertical: 11, paddingHorizontal: 15, borderRadius: 999, backgroundColor: '#E7EEF5' },
  active: { backgroundColor: colors.navy },
  chipText: { color: colors.navy, fontWeight: '900' },
  activeText: { color: colors.white },
  fareCard: { backgroundColor: colors.white, borderRadius: 28, padding: 18 },
  fareLabel: { color: colors.muted, fontWeight: '800' },
  fare: { color: colors.gold, fontSize: 38, fontWeight: '900' },
  note: { color: colors.muted, marginTop: 4 }
});
