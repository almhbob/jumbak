import React, { useState } from 'react';
import { ScrollView, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../src/components/Button';
import { colors, zones } from '../src/constants/theme';

export default function Home() {
  const [pickup, setPickup] = useState('Market');
  const [destination, setDestination] = useState('Hospital');
  const fare = pickup === destination ? 1000 : 1200;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Where are you going?</Text>
      <Text style={styles.map}>Rufaa Map</Text>
      <Text style={styles.route}>{pickup} to {destination}</Text>
      <Text style={styles.label}>Pickup</Text>
      {zones.slice(0, 4).map((z) => (
        <Pressable key={z} onPress={() => setPickup(z)} style={[styles.item, pickup === z && styles.active]}>
          <Text style={[styles.itemText, pickup === z && styles.activeText]}>{z}</Text>
        </Pressable>
      ))}
      <Text style={styles.label}>Destination</Text>
      {zones.slice(1, 6).map((z) => (
        <Pressable key={z} onPress={() => setDestination(z)} style={[styles.item, destination === z && styles.active]}>
          <Text style={[styles.itemText, destination === z && styles.activeText]}>{z}</Text>
        </Pressable>
      ))}
      <Text style={styles.fare}>{fare} SDG</Text>
      <Button title='Request rickshaw' onPress={() => router.push({ pathname: '/ride', params: { pickup, destination, fare } })} />
      <Button title='Trip history' variant='ghost' onPress={() => router.push('/trips')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 22, paddingTop: 60, gap: 12 },
  title: { fontSize: 30, fontWeight: '900', color: colors.navy },
  map: { padding: 60, textAlign: 'center', borderRadius: 24, backgroundColor: '#DDF3FA', color: colors.teal, fontSize: 28, fontWeight: '900' },
  route: { color: colors.navy, fontWeight: '900', fontSize: 18 },
  label: { color: colors.text, fontWeight: '800', fontSize: 16, marginTop: 10 },
  item: { padding: 14, borderRadius: 18, backgroundColor: '#E7EEF5' },
  active: { backgroundColor: colors.navy },
  itemText: { color: colors.navy, fontWeight: '800' },
  activeText: { color: colors.white },
  fare: { color: colors.gold, fontSize: 36, fontWeight: '900' }
});
