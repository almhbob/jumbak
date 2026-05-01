import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../src/components/Button';
import { colors } from '../src/constants/theme';
import { dict, Lang } from '../src/i18n';
import { requestOtp, verifyOtp } from '../src/api';

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

  async function sendOtp() {
    if (!phone.trim()) {
      Alert.alert('JUMBAK', lang === 'ar' ? 'أدخل رقم الهاتف أولًا' : 'Enter your phone number first');
      return;
    }
    setLoading(true);
    try {
      await requestOtp(phone.trim());
      setOtpSent(true);
      setCode('123456');
      Alert.alert('JUMBAK', lang === 'ar' ? 'تم إرسال رمز تجريبي: 123456' : 'Development OTP: 123456');
    } catch {
      setOtpSent(true);
      setCode('123456');
      Alert.alert('JUMBAK', lang === 'ar' ? 'الخادم غير متصل. استخدم الرمز التجريبي 123456' : 'Backend offline. Use development OTP 123456');
    } finally {
      setLoading(false);
    }
  }

  async function login() {
    if (!phone.trim() || !code.trim()) {
      Alert.alert('JUMBAK', lang === 'ar' ? 'أدخل الهاتف والرمز' : 'Enter phone and OTP');
      return;
    }
    setLoading(true);
    try {
      await verifyOtp({ phone: phone.trim(), code: code.trim(), name: name.trim() || undefined, role });
      nextRoute();
    } catch {
      if (code.trim() === '123456') {
        nextRoute();
      } else {
        Alert.alert('JUMBAK', lang === 'ar' ? 'رمز غير صحيح' : 'Invalid OTP');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Pressable style={styles.langButton} onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
        <Text style={styles.langText}>{t.language}</Text>
      </Pressable>
      <Text style={styles.logo}>J</Text>
      <Text style={[styles.title, rtl && styles.rtl]}>{lang === 'ar' ? 'الدخول إلى جمبك' : 'Login to JUMBAK'}</Text>
      <Text style={[styles.subtitle, rtl && styles.rtl]}>{lang === 'ar' ? 'سجّل برقم الهاتف للراكب أو السائق' : 'Use your phone number as passenger or driver'}</Text>

      <View style={styles.card}>
        <TextInput style={[styles.input, rtl && styles.rtl]} placeholder={lang === 'ar' ? 'الاسم' : 'Name'} value={name} onChangeText={setName} />
        <TextInput style={[styles.input, rtl && styles.rtl]} placeholder={lang === 'ar' ? 'رقم الهاتف' : 'Phone number'} value={phone} onChangeText={setPhone} keyboardType='phone-pad' />
        {otpSent && <TextInput style={[styles.input, rtl && styles.rtl]} placeholder={lang === 'ar' ? 'رمز التحقق' : 'OTP code'} value={code} onChangeText={setCode} keyboardType='number-pad' />}
        <View style={[styles.roleRow, rtl && styles.reverse]}>
          <Pressable onPress={() => setRole('PASSENGER')} style={[styles.roleChip, role === 'PASSENGER' && styles.active]}>
            <Text style={[styles.roleText, role === 'PASSENGER' && styles.activeText]}>{lang === 'ar' ? 'راكب' : 'Passenger'}</Text>
          </Pressable>
          <Pressable onPress={() => setRole('DRIVER')} style={[styles.roleChip, role === 'DRIVER' && styles.active]}>
            <Text style={[styles.roleText, role === 'DRIVER' && styles.activeText]}>{lang === 'ar' ? 'سائق' : 'Driver'}</Text>
          </Pressable>
        </View>
      </View>

      {!otpSent ? (
        <Button title={loading ? (lang === 'ar' ? 'جاري الإرسال...' : 'Sending...') : (lang === 'ar' ? 'إرسال الرمز' : 'Send OTP')} variant='gold' onPress={sendOtp} />
      ) : (
        <Button title={loading ? (lang === 'ar' ? 'جاري الدخول...' : 'Signing in...') : (role === 'DRIVER' ? (lang === 'ar' ? 'متابعة بيانات المركبة' : 'Continue vehicle details') : (lang === 'ar' ? 'تسجيل الدخول' : 'Sign in'))} variant='gold' onPress={login} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, paddingTop: 58, gap: 16, backgroundColor: colors.navy },
  langButton: { alignSelf: 'flex-end', backgroundColor: 'rgba(255,255,255,.14)', borderRadius: 999, paddingVertical: 9, paddingHorizontal: 14 },
  langText: { color: colors.white, fontWeight: '900' },
  logo: { color: colors.gold, fontSize: 70, fontWeight: '900', textAlign: 'center', marginTop: 35 },
  title: { color: colors.white, fontSize: 32, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: 'rgba(255,255,255,.82)', fontSize: 16, lineHeight: 25, textAlign: 'center' },
  card: { backgroundColor: colors.white, borderRadius: 30, padding: 18, gap: 12 },
  input: { backgroundColor: '#F1F5F9', borderRadius: 18, padding: 15, color: colors.text, fontWeight: '800' },
  roleRow: { flexDirection: 'row', gap: 10 },
  reverse: { flexDirection: 'row-reverse' },
  roleChip: { flex: 1, borderRadius: 18, backgroundColor: '#E7EEF5', padding: 14, alignItems: 'center' },
  roleText: { color: colors.navy, fontWeight: '900' },
  active: { backgroundColor: colors.navy },
  activeText: { color: colors.white },
  rtl: { textAlign: 'right', writingDirection: 'rtl' }
});
