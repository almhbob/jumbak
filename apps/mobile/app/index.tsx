import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../src/components/Button';
import { colors } from '../src/constants/theme';
import { dict, Lang } from '../src/i18n';

export default function Welcome() {
  const [lang, setLang] = useState<Lang>('ar');
  const t = dict[lang];
  const rtl = lang === 'ar';
  return (
    <View style={styles.screen}>
      <Pressable style={styles.lang} onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
        <Text style={styles.langText}>{t.language}</Text>
      </Pressable>
      <Text style={styles.logo}>J</Text>
      <Text style={styles.title}>{t.appName}</Text>
      <Text style={styles.tagline}>{t.tagline}</Text>
      <Text style={[styles.copy, rtl && styles.rtl]}>{t.intro}</Text>
      <Button title={t.startRide} variant='gold' onPress={() => router.push({ pathname: '/login', params: { lang } })} />
      <Button title={t.driverMode} variant='ghost' onPress={() => router.push({ pathname: '/login', params: { lang } })} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, justifyContent: 'center', gap: 18, backgroundColor: colors.navy },
  lang: { position: 'absolute', top: 55, right: 22, backgroundColor: 'rgba(255,255,255,.14)', borderRadius: 999, paddingVertical: 9, paddingHorizontal: 14 },
  langText: { color: colors.white, fontWeight: '900' },
  logo: { color: colors.gold, fontSize: 70, fontWeight: '900', textAlign: 'center' },
  title: { color: colors.white, fontSize: 44, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  tagline: { color: colors.gold, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  copy: { color: 'rgba(255,255,255,.88)', fontSize: 18, lineHeight: 30, textAlign: 'center', marginBottom: 16 },
  rtl: { writingDirection: 'rtl' }
});
