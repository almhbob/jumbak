import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../src/components/Button';
import { colors } from '../src/constants/theme';

export default function Welcome() {
  return (
    <View style={styles.screen}>
      <Text style={styles.logo}>J</Text>
      <Text style={styles.title}>JUMBAK</Text>
      <Text style={styles.tagline}>Rickshaw near you</Text>
      <Text style={styles.copy}>Fast local rides in Rufaa with clear fares and trusted drivers.</Text>
      <Button title='Start ride' variant='gold' onPress={() => router.push('/home')} />
      <Button title='Driver mode' variant='ghost' onPress={() => router.push('/driver')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, justifyContent: 'center', gap: 18, backgroundColor: colors.navy },
  logo: { color: colors.gold, fontSize: 70, fontWeight: '900', textAlign: 'center' },
  title: { color: colors.white, fontSize: 44, fontWeight: '900', letterSpacing: 3, textAlign: 'center' },
  tagline: { color: colors.gold, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  copy: { color: 'rgba(255,255,255,.88)', fontSize: 18, lineHeight: 30, textAlign: 'center', marginBottom: 16 }
});
