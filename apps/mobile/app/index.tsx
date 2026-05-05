import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Button } from '../src/components/Button';
import { brand, colors } from '../src/constants/theme';
import { dict, Lang } from '../src/i18n';

export default function Welcome() {
  const [lang, setLang] = useState<Lang>('ar');
  const t = dict[lang];
  const rtl = lang === 'ar';
  return (
    <LinearGradient colors={brand.gradient} style={styles.screen}>
      <Pressable style={styles.lang} onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
        <Text style={styles.langText}>{t.language}</Text>
      </Pressable>
      <View style={styles.logoBox}>
        <Text style={styles.logoIcon}>J</Text>
        <Text style={[styles.logoAr, rtl && styles.rtl]}>جنبك</Text>
        <Text style={styles.logoEn}>JNBK</Text>
      </View>
      <Text style={[styles.tagline, rtl && styles.rtl]}>{rtl ? 'أقرب إليك دائمًا' : 'Always near you'}</Text>
      <Text style={[styles.copy, rtl && styles.rtl]}>{rtl ? 'رحلات محلية سريعة بتسعير واضح وسائقين موثوقين.' : 'Fast local rides with clear fares and trusted drivers.'}</Text>
      <View style={styles.features}>
        <Feature title={rtl ? 'آمن' : 'Safe'} letter='S' />
        <Feature title={rtl ? 'سريع' : 'Fast'} letter='F' />
        <Feature title={rtl ? 'موثوق' : 'Reliable'} letter='R' />
      </View>
      <Button title={t.startRide} variant='gold' onPress={() => router.push({ pathname: '/login', params: { lang } })} />
      <Button title={t.driverMode} variant='ghost' onPress={() => router.push({ pathname: '/login', params: { lang } })} />
    </LinearGradient>
  );
}

function Feature({ title, letter }: { title: string; letter: string }) {
  return <View style={styles.feature}><Text style={styles.featureIcon}>{letter}</Text><Text style={styles.featureText}>{title}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, justifyContent: 'center', gap: 16 },
  lang: { position: 'absolute', top: 55, right: 22, backgroundColor: 'rgba(255,255,255,.14)', borderRadius: 999, paddingVertical: 9, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,.22)' },
  langText: { color: colors.white, fontWeight: '900' },
  logoBox: { alignItems: 'center', gap: 2, marginBottom: 8 },
  logoIcon: { color: colors.gold, fontSize: 72, fontWeight: '900', lineHeight: 78 },
  logoAr: { color: colors.white, fontSize: 42, fontWeight: '900' },
  logoEn: { color: colors.white, fontSize: 32, fontWeight: '900', letterSpacing: 5 },
  tagline: { color: colors.gold, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  copy: { color: 'rgba(255,255,255,.88)', fontSize: 17, lineHeight: 28, textAlign: 'center', marginBottom: 8 },
  features: { flexDirection: 'row', gap: 10, marginVertical: 8 },
  feature: { flex: 1, backgroundColor: 'rgba(255,255,255,.12)', borderRadius: 20, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,.16)' },
  featureIcon: { color: colors.gold, fontSize: 22, fontWeight: '900' },
  featureText: { color: colors.white, fontWeight: '900', marginTop: 5 },
  rtl: { textAlign: 'center', writingDirection: 'rtl' }
});
