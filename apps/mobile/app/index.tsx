import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '../src/components/Button';
import { brand, colors } from '../src/constants/theme';
import { dict, Lang } from '../src/i18n';
import { setTokenCache } from '../src/api';

const logoSource = require('../assets/icon.png');
const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

function decodeToken(token: string): { exp?: number; role?: string } {
  try {
    const payload = token.split('.')[1];
    const padded = payload + '==='.slice(payload.length % 4);
    return JSON.parse(atob(padded));
  } catch {
    return {};
  }
}

function isTokenValid(token: string): boolean {
  const { exp } = decodeToken(token);
  return typeof exp === 'number' && exp * 1000 > Date.now();
}

async function tryRefresh(refreshToken: string): Promise<string | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.token ?? null;
  } catch {
    return null;
  }
}

export default function Welcome() {
  const [lang, setLang] = useState<Lang>('ar');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const [[, token], [, refreshToken], [, savedLang], [, savedRole]] =
        await AsyncStorage.multiGet(['jnbk_auth_token', 'jnbk_refresh_token', 'jnbk_lang', 'jnbk_user_role']);

      if (savedLang === 'en' || savedLang === 'ar') setLang(savedLang as Lang);

      const navigateTo = (t: string) => {
        const role = decodeToken(t).role || savedRole || 'passenger';
        setTokenCache(t);
        router.replace(role === 'driver' ? '/driver' : '/home');
      };

      if (token && isTokenValid(token)) {
        navigateTo(token);
        return;
      }

      // Access token expired — try refresh token (valid 7 days)
      if (refreshToken) {
        const newToken = await tryRefresh(refreshToken);
        if (newToken) {
          await AsyncStorage.setItem('jnbk_auth_token', newToken);
          navigateTo(newToken);
          return;
        }
      }

      // Both expired — clear session
      await AsyncStorage.multiRemove(['jnbk_auth_token', 'jnbk_refresh_token', 'jnbk_user_id', 'jnbk_user_role']);
      setReady(true);
    })();
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
