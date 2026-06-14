import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, Switch, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '../src/components/Button';
import { colors } from '../src/constants/theme';
import { sw } from '../src/constants/responsive';
import { dict, Lang } from '../src/i18n';
import { cities, vehicleTypes } from '../src/serviceConfig';
import { setTokenCache } from '../src/api';
import { unregisterPushToken } from '../src/api';

const SETTINGS_KEYS = {
  lang: 'jnbk_lang',
  city: 'jnbk_settings_city',
  vehicle: 'jnbk_settings_vehicle',
  notifications: 'jnbk_settings_notif',
  cashOnly: 'jnbk_settings_cash',
};

export default function Settings() {
  const params = useLocalSearchParams<{ lang?: Lang }>();
  const [lang, setLangState] = useState<Lang>(params.lang === 'en' ? 'en' : 'ar');
  const [defaultCity, setDefaultCityState] = useState(0);
  const [defaultVehicle, setDefaultVehicleState] = useState(0);
  const [notifications, setNotificationsState] = useState(true);
  const [cashOnly, setCashOnlyState] = useState(true);
  const [loaded, setLoaded] = useState(false);

  const t = dict[lang];
  const rtl = lang === 'ar';

  // Load saved settings on mount
  useEffect(() => {
    AsyncStorage.multiGet(Object.values(SETTINGS_KEYS)).then((pairs) => {
      const m = Object.fromEntries(pairs.map(([k, v]) => [k, v]));
      if (m[SETTINGS_KEYS.lang] === 'en') setLangState('en');
      if (m[SETTINGS_KEYS.city]) setDefaultCityState(Number(m[SETTINGS_KEYS.city]) || 0);
      if (m[SETTINGS_KEYS.vehicle]) setDefaultVehicleState(Number(m[SETTINGS_KEYS.vehicle]) || 0);
      if (m[SETTINGS_KEYS.notifications] === 'false') setNotificationsState(false);
      if (m[SETTINGS_KEYS.cashOnly] === 'false') setCashOnlyState(false);
      setLoaded(true);
    });
  }, []);

  function changeLang(l: Lang) {
    setLangState(l);
    AsyncStorage.setItem(SETTINGS_KEYS.lang, l);
  }

  function setDefaultCity(i: number) {
    setDefaultCityState(i);
    AsyncStorage.setItem(SETTINGS_KEYS.city, String(i));
  }

  function setDefaultVehicle(i: number) {
    setDefaultVehicleState(i);
    AsyncStorage.setItem(SETTINGS_KEYS.vehicle, String(i));
  }

  function setNotifications(v: boolean) {
    setNotificationsState(v);
    AsyncStorage.setItem(SETTINGS_KEYS.notifications, String(v));
  }

  function setCashOnly(v: boolean) {
    setCashOnlyState(v);
    AsyncStorage.setItem(SETTINGS_KEYS.cashOnly, String(v));
  }

  async function handleLogout() {
    Alert.alert(
      lang === 'ar' ? 'تسجيل الخروج' : 'Sign out',
      lang === 'ar' ? 'هل أنت متأكد أنك تريد تسجيل الخروج؟' : 'Are you sure you want to sign out?',
      [
        { text: lang === 'ar' ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: lang === 'ar' ? 'خروج' : 'Sign out',
          style: 'destructive',
          onPress: async () => {
            // Unregister push token before clearing session
            const pushToken = await AsyncStorage.getItem('jnbk_push_token');
            if (pushToken) unregisterPushToken(pushToken).catch(() => null);

            await AsyncStorage.multiRemove([
              'jnbk_auth_token',
              'jnbk_refresh_token',
              'jnbk_user_id',
              'jnbk_user_role',
              'jnbk_driver_id',
              'jnbk_push_token',
            ]);
            setTokenCache(null);
            router.replace('/');
          },
        },
      ]
    );
  }

  if (!loaded) return null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={[styles.header, rtl && styles.reverse]}>
        <View>
          <Text style={[styles.kicker, rtl && styles.rtl]}>JNBK</Text>
          <Text style={[styles.title, rtl && styles.rtl]}>{t.settings}</Text>
        </View>
        <Pressable style={styles.langButton} onPress={() => changeLang(lang === 'ar' ? 'en' : 'ar')}>
          <Text style={styles.langText}>{t.language}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={[styles.cardTitle, rtl && styles.rtl]}>{lang === 'ar' ? 'تفضيلات جنبك' : 'JNBK preferences'}</Text>
        <Text style={[styles.cardText, rtl && styles.rtl]}>
          {lang === 'ar'
            ? 'اضبط المدينة الافتراضية، نوع الخدمة، والتنبيهات لتجربة أسرع.'
            : 'Set your default city, service type, and alerts for a faster experience.'}
        </Text>
      </View>

      <Text style={[styles.label, rtl && styles.rtl]}>{lang === 'ar' ? 'المدينة الافتراضية' : 'Default city'}</Text>
      <View style={[styles.wrap, rtl && styles.reverseWrap]}>
        {cities.map((item, index) => (
          <Pressable key={item.id} onPress={() => setDefaultCity(index)} style={[styles.chip, defaultCity === index && styles.active]}>
            <Text style={[styles.chipText, defaultCity === index && styles.activeText]}>{lang === 'ar' ? item.nameAr : item.nameEn}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, rtl && styles.rtl]}>{lang === 'ar' ? 'الخدمة الافتراضية' : 'Default service'}</Text>
      <View style={[styles.wrap, rtl && styles.reverseWrap]}>
        {vehicleTypes.map((item, index) => (
          <Pressable key={item.id} onPress={() => setDefaultVehicle(index)} style={[styles.chip, defaultVehicle === index && styles.active]}>
            <Text style={[styles.chipText, defaultVehicle === index && styles.activeText]}>{item.icon} {lang === 'ar' ? item.nameAr : item.nameEn}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.panel}>
        <SettingRow
          rtl={rtl}
          title={lang === 'ar' ? 'تنبيهات الرحلات' : 'Ride notifications'}
          subtitle={lang === 'ar' ? 'إشعارات قبول الرحلة وتحديث الحالة' : 'Trip acceptance and status updates'}
          value={notifications}
          onChange={setNotifications}
        />
        <SettingRow
          rtl={rtl}
          title={lang === 'ar' ? 'الدفع النقدي' : 'Cash payment'}
          subtitle={lang === 'ar' ? 'تفعيل النقد كطريقة دفع أساسية' : 'Keep cash as the primary payment method'}
          value={cashOnly}
          onChange={setCashOnly}
        />
      </View>

      <View style={styles.infoCard}>
        <Text style={[styles.infoTitle, rtl && styles.rtl]}>{lang === 'ar' ? 'معلومات التطبيق' : 'App info'}</Text>
        <Text style={[styles.infoText, rtl && styles.rtl]}>{lang === 'ar' ? 'الإصدار: 0.1.1' : 'Version: 0.1.1'}</Text>
      </View>

      <Button title={t.support} variant='ghost' onPress={() => router.push({ pathname: '/support', params: { lang } })} />
      <Button title={t.backHome} variant='gold' onPress={() => router.push({ pathname: '/home', params: { lang } })} />

      {/* Logout */}
      <Pressable style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>{lang === 'ar' ? 'تسجيل الخروج' : 'Sign out'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function SettingRow({ title, subtitle, value, onChange, rtl }: {
  title: string; subtitle: string; value: boolean; onChange: (v: boolean) => void; rtl: boolean;
}) {
  return (
    <View style={[styles.settingRow, rtl && styles.reverse]}>
      <View style={styles.settingCopy}>
        <Text style={[styles.settingTitle, rtl && styles.rtl]}>{title}</Text>
        <Text style={[styles.settingSubtitle, rtl && styles.rtl]}>{subtitle}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: sw(20), paddingTop: sw(52), gap: sw(14), paddingBottom: sw(40) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reverse: { flexDirection: 'row-reverse' },
  kicker: { color: colors.gold, fontWeight: '900', letterSpacing: 2 },
  title: { color: colors.navy, fontSize: sw(26), fontWeight: '900' },
  langButton: { borderRadius: 18, backgroundColor: colors.navy, paddingVertical: 10, paddingHorizontal: 13 },
  langText: { color: colors.white, fontWeight: '900', fontSize: sw(13) },
  card: { backgroundColor: colors.navy, borderRadius: 28, padding: sw(18) },
  cardTitle: { color: colors.white, fontSize: sw(20), fontWeight: '900' },
  cardText: { color: 'rgba(255,255,255,.78)', marginTop: 8, lineHeight: 23 },
  label: { color: colors.text, fontWeight: '900', fontSize: sw(15) },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  reverseWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap' },
  chip: { paddingVertical: 10, paddingHorizontal: 13, borderRadius: 999, backgroundColor: '#E7EEF5' },
  active: { backgroundColor: colors.navy },
  chipText: { color: colors.navy, fontWeight: '900', fontSize: sw(14) },
  activeText: { color: colors.white },
  panel: { backgroundColor: colors.white, borderRadius: 28, padding: sw(14), gap: 8 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, gap: 12 },
  settingCopy: { flex: 1 },
  settingTitle: { color: colors.text, fontSize: sw(15), fontWeight: '900' },
  settingSubtitle: { color: colors.muted, marginTop: 3, lineHeight: 20, fontSize: sw(13) },
  infoCard: { backgroundColor: '#EAF6FA', borderRadius: 24, padding: 16 },
  infoTitle: { color: colors.navy, fontWeight: '900', fontSize: 18 },
  infoText: { color: colors.muted, marginTop: 7, fontWeight: '700' },
  logoutBtn: {
    marginTop: sw(8), paddingVertical: sw(16), borderRadius: 28,
    borderWidth: 1.5, borderColor: '#E74C3C', alignItems: 'center',
  },
  logoutText: { color: '#E74C3C', fontWeight: '900', fontSize: sw(16) },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
});
