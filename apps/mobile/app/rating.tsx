import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../src/components/Button';
import { colors } from '../src/constants/theme';

export default function Rating() {
  const [value, setValue] = useState(5);
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Trip completed</Text>
      <Text style={styles.question}>Rate your ride</Text>
      <Text style={styles.score}>{value} / 5</Text>
      <View style={styles.row}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Button key={n} title={`${n}`} variant={n === value ? 'gold' : 'ghost'} onPress={() => setValue(n)} />
        ))}
      </View>
      <Button title='Back home' onPress={() => router.replace('/home')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 22, paddingTop: 90, gap: 18, backgroundColor: colors.bg },
  title: { textAlign: 'center', color: colors.navy, fontSize: 30, fontWeight: '900' },
  question: { textAlign: 'center', color: colors.text, fontSize: 20, fontWeight: '900' },
  score: { textAlign: 'center', color: colors.gold, fontSize: 52, fontWeight: '900' },
  row: { flexDirection: 'row', gap: 8, justifyContent: 'center' }
});
