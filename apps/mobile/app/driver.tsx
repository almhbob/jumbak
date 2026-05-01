import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Button } from '../src/components/Button';
import { colors } from '../src/constants/theme';
import { dict, Lang } from '../src/i18n';

export default function Driver() {
  const params = useLocalSearchParams<{ lang?: Lang }>();
  const [lang, setLang] = useState<Lang>(params.lang === 'en' ? 'en' : 'ar');
  const [online, setOnline] = useState(false);
  const [request, setRequest] = useState(false);
  const t = dict[lang];
  const rtl = lang === 'ar';
  function toggle(value: boolean) { setOnline(value); setRequest(value); }
  return (
    <View style={styles.screen}>
      <View style={[styles.header, rtl && styles.reverse]}>
        <Text style={[styles.title, rtl && styles.rtl]}>{t.driverDashboard}</Text>
        <Pressable style={styles.langButton} onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
          <Text style={styles.langText}>{t.language}</Text>
        </Pressable>
      </View>
      <View style={styles.profileCard}>
        <Text style={[styles.name, rtl && styles.rtl]}>{lang === 'ar' ? 'محمد أحمد' : 'Mohammed Ahmed'}</Text>
        <Text style={[styles.muted, rtl && styles.rtl]}>{lang === 'ar' ? `ركشة زرقاء - ${t.verificationPending}` : `Blue rickshaw - ${t.verificationPending}`}</Text>
      </View>
      <View style={[styles.switchRow, rtl && styles.reverse]}>
        <Text style={styles.switchText}>{online ? t.online : t.offline}</Text>
        <Switch value={online} onValueChange={toggle} />
      </View>
      {request && (
        <View style={styles.request}>
          <Text style={[styles.section, rtl && styles.rtl]}>{t.newRide}</Text>
          <Text style={[styles.route, rtl && styles.rtl]}>{lang === 'ar' ? 'السوق إلى المستشفى' : 'Market to Hospital'}</Text>
          <Text style={[styles.fare, rtl && styles.rtl]}>1200 SDG</Text>
          <Button title={t.acceptRide} variant='gold' onPress={() => setRequest(false)} />
          <Button title={t.reject} variant='ghost' onPress={() => setRequest(false)} />
        </View>
      )}
      <View style={styles.earningsCard}>
        <Text style={[styles.section, rtl && styles.rtl]}>{t.todayEarnings}</Text>
        <Text style={[styles.fare, rtl && styles.rtl]}>0 SDG</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 22, paddingTop: 60, gap: 16, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reverse: { flexDirection: 'row-reverse' },
  title: { fontSize: 30, fontWeight: '900', color: colors.navy },
  langButton: { borderRadius: 18, backgroundColor: colors.navy, paddingVertical: 11, paddingHorizontal: 14 },
  langText: { color: colors.white, fontWeight: '900' },
  profileCard: { backgroundColor: colors.white, borderRadius: 28, padding: 18 },
  name: { fontSize: 26, fontWeight: '900', color: colors.text },
  muted: { color: colors.muted, marginTop: 5 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, padding: 18, borderRadius: 24 },
  switchText: { color: colors.navy, fontWeight: '900' },
  request: { borderWidth: 2, borderColor: colors.gold, borderRadius: 28, padding: 18, gap: 12, backgroundColor: colors.white },
  earningsCard: { backgroundColor: colors.white, borderRadius: 28, padding: 18 },
  section: { color: colors.muted, fontWeight: '800' },
  route: { color: colors.navy, fontSize: 22, fontWeight: '900' },
  fare: { color: colors.gold, fontSize: 30, fontWeight: '900' },
  rtl: { textAlign: 'right', writingDirection: 'rtl' }
});
