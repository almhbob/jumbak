import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '../src/components/Button';
import { BrandLogo } from '../src/components/BrandLogo';
import { brand, colors } from '../src/constants/theme';
import { dict, Lang } from '../src/i18n';
import { verifyOtp, requestOtp } from '../src/api';
import { saveTokenToServer } from '../src/notifications';

type Role = 'PASSENGER' | 'DRIVER';

export default function Login() {
  const params = useLocalSearchParams<{ lang?: Lang }>();
  const [lang, setLang] = useState<Lang>(params.lang === 'en' ? 'en' : 'ar');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [role, setRole] = useState<Role>('PASSENGER');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const t = dict[lang];
  const rtl = lang === 'ar';

  function nextRoute() {
    if (role === 'DRIVER') {
      router.replace({ pathname: '/driver-register', params: { lang, phone: phone.trim(), name: name.trim() } });
    } else {
      router.replace({ pathname: '/home', params: { lang } });
    }
  }

  async function persistSession(userId: string, token: string) {
    await AsyncStorage.multiSet([
      ['jnbk_user_id', userId],
      ['jnbk_auth_token', token],
    ]);
    const pushToken = await AsyncStorage.getItem('jnbk_push_token');
    if (pushToken) await saveTokenToServer(pushToken, userId);
  }

  // ─── OTP via server ──────────────────────────────────────────────────────────

  async function handleSend() {
    const trimmed = phone.trim();
    if (!trimmed) {
      Alert.alert('Jnbk', lang === 'ar' ? 'أدخل رقم الهاتف أولًا' : 'Enter your phone number first');
      return;
    }
    setLoading(true);
    try {
      const res = await requestOtp(trimmed);
      // Dev/staging: server returns dev_code when SMS provider is not configured
      if (res?.dev_code) {
        setCode(String(res.dev_code));
        Alert.alert('Jnbk [DEV]', `OTP: ${res.dev_code}`);
      } else {
        Alert.alert('Jnbk', lang === 'ar' ? 'تم إرسال رمز التحقق عبر SMS' : 'OTP sent via SMS');
      }
    } catch {
      // Server unreachable — proceed anyway so the user can try entering the code
      Alert.alert('Jnbk', lang === 'ar' ? 'أدخل رمز التحقق' : 'Enter your OTP code');
    } finally {
      setLoading(false);
      setOtpSent(true);
    }
  }

  async function handleVerify() {
    if (!phone.trim() || !code.trim()) return;
    setLoading(true);
    try {
      const result = await verifyOtp({ phone: phone.trim(), code: code.trim(), name: name.trim() || undefined, role });
      await persistSession(result.user.id, result.token);
      nextRoute();
    } catch (err: any) {
      const msg = err?.message?.includes('401') || err?.message?.includes('Invalid')
        ? (lang === 'ar' ? 'رمز التحقق غير صحيح' : 'Invalid OTP code')
        : (lang === 'ar' ? 'تعذر الاتصال بالخادم' : 'Could not reach server. Check your connection.');
      Alert.alert('Jnbk', msg);
    } finally {
      setLoading(false);
    }
  }

  const sendLabel = loading
    ? (lang === 'ar' ? 'جاري الإرسال...' : 'Sending...')
    : (lang === 'ar' ? 'إرسال رمز التحقق' : 'Send OTP');

  const verifyLabel = loading
    ? (lang === 'ar' ? 'جاري التحقق...' : 'Verifying...')
    : role === 'DRIVER'
    ? (lang === 'ar' ? 'متابعة بيانات المركبة' : 'Continue vehicle details')
    : (lang === 'ar' ? 'تسجيل الدخول' : 'Sign in');

  return (
    <LinearGradient colors={brand.gradient} style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable style={styles.langButton} onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
            <Text style={styles.langText}>{t.language}</Text>
          </Pressable>

          <View style={styles.brandBox}>
            <BrandLogo size="sm" onDark showTagline={false} />
          </View>
          <Text style={[styles.title, rtl && styles.rtl]}>
            {lang === 'ar' ? 'الدخول إلى Jnbk' : 'Login to Jnbk'}
          </Text>
          <Text style={[styles.subtitle, rtl && styles.rtl]}>
            {lang === 'ar'
              ? 'سجّل برقم الهاتف — سيصلك رمز تحقق قصير'
              : "Enter your phone number — you'll receive an OTP"}
          </Text>

          <View style={styles.card}>
            <TextInput
              placeholderTextColor={colors.muted}
              style={[styles.input, rtl && styles.rtl]}
              placeholder={lang === 'ar' ? 'الاسم (اختياري)' : 'Name (optional)'}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              placeholderTextColor={colors.muted}
              style={[styles.input, rtl && styles.rtl]}
              placeholder={lang === 'ar' ? 'رقم الهاتف مع كود الدولة (+249...)' : 'Phone with country code (+249...)'}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable={!otpSent}
            />
            {otpSent && (
              <TextInput
                placeholderTextColor={colors.muted}
                style={[styles.input, rtl && styles.rtl]}
                placeholder={lang === 'ar' ? 'رمز التحقق' : 'OTP code'}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                autoFocus
              />
            )}
            <View style={[styles.roleRow, rtl && styles.reverse]}>
              <Pressable
                onPress={() => setRole('PASSENGER')}
                style={[styles.roleChip, role === 'PASSENGER' && styles.active]}
              >
                <Text style={[styles.roleText, role === 'PASSENGER' && styles.activeText]}>
                  {lang === 'ar' ? 'راكب' : 'Passenger'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setRole('DRIVER')}
                style={[styles.roleChip, role === 'DRIVER' && styles.active]}
              >
                <Text style={[styles.roleText, role === 'DRIVER' && styles.activeText]}>
                  {lang === 'ar' ? 'سائق' : 'Driver'}
                </Text>
              </Pressable>
            </View>
          </View>

          {!otpSent ? (
            <Button title={sendLabel} variant="gold" onPress={handleSend} disabled={loading} />
          ) : (
            <>
              <Button title={verifyLabel} variant="gold" onPress={handleVerify} disabled={loading} />
              <Pressable
                style={styles.resend}
                onPress={() => { setOtpSent(false); setCode(''); }}
              >
                <Text style={styles.resendText}>
                  {lang === 'ar' ? 'تغيير الرقم أو إعادة الإرسال' : 'Change number or resend'}
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: 24, paddingTop: 58, gap: 16, justifyContent: 'center' },
  langButton: { alignSelf: 'flex-end', backgroundColor: 'rgba(255,255,255,.18)', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,.24)' },
  langText: { color: colors.white, fontWeight: '900' },
  brandBox: { alignItems: 'center', marginTop: 20 },
  title: { color: colors.white, fontSize: 32, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: 'rgba(255,255,255,.88)', fontSize: 16, lineHeight: 25, textAlign: 'center' },
  card: { backgroundColor: colors.white, borderRadius: 34, padding: 18, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,.35)' },
  input: { backgroundColor: '#F1F5F9', borderRadius: 20, padding: 16, color: colors.text, fontWeight: '900', fontSize: 16, borderWidth: 1, borderColor: '#DCE6EF' },
  roleRow: { flexDirection: 'row', gap: 10 },
  reverse: { flexDirection: 'row-reverse' },
  roleChip: { flex: 1, borderRadius: 20, backgroundColor: '#E7EEF5', padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#DCE6EF' },
  roleText: { color: colors.navy, fontWeight: '900', fontSize: 16 },
  active: { backgroundColor: colors.navy, borderColor: colors.navy },
  activeText: { color: colors.white },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  resend: { alignSelf: 'center', paddingVertical: 10 },
  resendText: { color: 'rgba(255,255,255,.8)', fontSize: 14, textDecorationLine: 'underline' },
});
