import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Button } from '../src/components/Button';
import { colors } from '../src/constants/theme';

export default function Driver() {
  const [online, setOnline] = useState(false);
  const [request, setRequest] = useState(false);
  function toggle(value: boolean) { setOnline(value); setRequest(value); }
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Driver dashboard</Text>
      <Text style={styles.name}>Mohammed Ahmed</Text>
      <Text style={styles.muted}>Blue rickshaw - verification pending</Text>
      <View style={styles.switchRow}>
        <Text style={styles.switchText}>{online ? 'Online' : 'Offline'}</Text>
        <Switch value={online} onValueChange={toggle} />
      </View>
      {request && (
        <View style={styles.request}>
          <Text style={styles.section}>New ride request</Text>
          <Text style={styles.route}>Market to Hospital</Text>
          <Text style={styles.fare}>1200 SDG</Text>
          <Button title='Accept ride' variant='gold' onPress={() => setRequest(false)} />
          <Button title='Reject' variant='ghost' onPress={() => setRequest(false)} />
        </View>
      )}
      <Text style={styles.section}>Today earnings</Text>
      <Text style={styles.fare}>0 SDG</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 22, paddingTop: 60, gap: 16, backgroundColor: colors.bg },
  title: { fontSize: 30, fontWeight: '900', color: colors.navy },
  name: { fontSize: 26, fontWeight: '900', color: colors.text },
  muted: { color: colors.muted },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, padding: 18, borderRadius: 24 },
  switchText: { color: colors.navy, fontWeight: '800' },
  request: { borderWidth: 2, borderColor: colors.gold, borderRadius: 24, padding: 18, gap: 12, backgroundColor: colors.white },
  section: { color: colors.muted, fontWeight: '800' },
  route: { color: colors.navy, fontSize: 22, fontWeight: '900' },
  fare: { color: colors.gold, fontSize: 30, fontWeight: '900' }
});
