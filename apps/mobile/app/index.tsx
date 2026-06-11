import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '../src/components/Button';
import { brand, colors } from '../src/constants/theme';
import { dict, Lang } from '../src/i18n';

const logoSource = require('../assets/icon.png');

function isTokenValid(token: string): boolean {
  try {
    const payload = token.split('.')[1];
    const padded = payload + '==='.slice(payload.length % 4);
    const decoded = JSON.parse(atob(padded));
    return typeof decoded.exp === 'number' && decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export default function Welcome() {
  const [lang, setLang] = useState<Lang>('ar');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet(['jnbk_auth_token', 'jnbk_lang']).then(([[, token], [, savedLang]]) => {
      if (savedLang === 'en' || savedLang === 'ar') setLang(savedLang as Lang);
      if (token && isTokenValid(token)) {
        router.replace('/home');
      } else {
        if (token) AsyncStorage.multiRemove(['jnbk_auth_token', 'jnbk_refresh_token', 'jnbk_user_id']);
        setReady(true);
      }
    });
  }, []);

  if (!ready) return null;

  const t = dict[lang];
  const rtl = lang === 'ar';

  return (
    <LinearGradient colors={brand.gradient} style={styles.screen}>
      <Pressable style={styles.lang} onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
        <Text style={styles.langText}>{t.language}</Text>
      </Pressable>

      <View style={styles.logoBox}>
        <View style={styles.logoCard}>
          <Image source={logoSource} style={styles.logoImg} resizeMode="contain" />
        </View>
      </View>

      <Text style={[styles.tagline, rtl && styles.rtl]}>{rtl ? 'أقرب إليك دائمًا' : 'Always near you'}</Text>
      <Text style={[styles.copy, rtl && styles.rtl]}>
        {rtl
          ? 'رحلات محلية سريعة بتسعير واضح وسائقين موثوقين.'
          : 'Fast local rides with clear fares and trusted drivers.'}
      </Text>

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
  return (
    <View style={styles.feature}>
      <Text style={styles.featureIcon}>{letter}</Text>
      <Text style={styles.featureText}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, justifyContent: 'center', gap: 16 },
  lang: {
    position: 'absolute', top: 55, right: 22,
    backgroundColor: 'rgba(255,255,255,.14)', borderRadius: 999,
    paddingVertical: 9, paddingHorizontal: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,.22)',
  },
  langText: { color: colors.white, fontWeight: '900' },
  logoBox: { alignItems: 'center', marginBottom: 8 },
  logoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  logoImg: { width: 240, height: 130 },
  tagline: { color: colors.gold, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  copy: { color: 'rgba(255,255,255,.88)', fontSize: 17, lineHeight: 28, textAlign: 'center', marginBottom: 8 },
  features: { flexDirection: 'row', gap: 10, marginVertical: 8 },
  feature: {
    flex: 1, backgroundColor: 'rgba(255,255,255,.12)', borderRadius: 20,
    padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,.16)',
  },
  featureIcon: { color: colors.gold, fontSize: 22, fontWeight: '900' },
  featureText: { color: colors.white, fontWeight: '900', marginTop: 5 },
  rtl: { textAlign: 'center', writingDirection: 'rtl' },
});
