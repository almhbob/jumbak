import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, Switch } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../src/components/Button';
import { colors } from '../src/constants/theme';
import { dict, Lang } from '../src/i18n';
import { cities, vehicleTypes } from '../src/serviceConfig';

export default function Settings() {
  const params = useLocalSearchParams<{ lang?: Lang }>();
  const [lang, setLang] = useState<Lang>(params.lang === 'en' ? 'en' : 'ar');
  const [defaultCity, setDefaultCity] = useState(0);
  const [defaultVehicle, setDefaultVehicle] = useState(0);
  const [notifications, setNotifications] = useState(true);
  const [safetyAlerts, setSafetyAlerts] = useState(true);
  const [cashOnly, setCashOnly] = useState(true);
  const t = dict[lang];
  const rtl = lang === 'ar';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={[styles.header, rtl && styles.reverse]}>
        <View>
          <Text style={[styles.kicker, rtl && styles.rtl]}>JNBK</Text>
          <Text style={[styles.title, rtl && styles.rtl]}>{t.settings}</Text>
        </View>
        <Pressable style={styles.langButton} onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
          <Text style={styles.langText}>{t.language}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={[styles.cardTitle, rtl && styles.rtl]}>{lang === 'ar' ? 'تفضيلات جنبك' : 'JNBK preferences'}</Text>
        <Text style={[styles.cardText, rtl && styles.rtl]}>
          {lang === 'ar' ? 'اضبط المدينة الافتراضية، نوع الخدمة، والتنبيهات لتجربة أسرع داخل جنبك.' : 'Set your default city, service type, and alerts for a faster JNBK experience.'}
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
        <SettingRow rtl={rtl} title={lang === 'ar' ? 'تنبيهات الرحلات' : 'Ride notifications'} subtitle={lang === 'ar' ? 'إشعارات قبول الرحلة وتحديث الحالة' : 'Trip acceptance and status updates'} value={notifications} onChange={setNotifications} />
        <SettingRow rtl={rtl} title={lang === 'ar' ? 'تنبيهات السلامة' : 'Safety alerts'} subtitle={lang === 'ar' ? 'إظهار رسائل السلامة أثناء الرحلة' : 'Show safety reminders during trips'} value={safetyAlerts} onChange={setSafetyAlerts} />
        <SettingRow rtl={rtl} title={lang === 'ar' ? 'الدفع النقدي' : 'Cash payment'} subtitle={lang === 'ar' ? 'تفعيل النقد كطريقة دفع أساسية' : 'Keep cash as the primary payment method'} value={cashOnly} onChange={setCashOnly} />
      </View>

      <View style={styles.infoCard}>
        <Text style={[styles.infoTitle, rtl && styles.rtl]}>{lang === 'ar' ? 'معلومات التطبيق' : 'App information'}</Text>
        <Text style={[styles.infoText, rtl && styles.rtl]}>{lang === 'ar' ? 'الإصدار التجريبي: 0.1.0' : 'Preview version: 0.1.0'}</Text>
        <Text style={[styles.infoText, rtl && styles.rtl]}>{lang === 'ar' ? 'الحالة: جاهز للمعاينة والربط بالخادم' : 'Status: ready for preview and backend connection'}</Text>
      </View>

      <Button title={t.support} variant='ghost' onPress={() => router.push({ pathname: '/support', params: { lang } })} />
      <Button title={t.backHome} variant='gold' onPress={() => router.push({ pathname: '/home', params: { lang } })} />
    </ScrollView>
  );
}

function SettingRow({ title, subtitle, value, onChange, rtl }: { title: string; subtitle: string; value: boolean; onChange: (value: boolean) => void; rtl: boolean }) {
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
  content: { padding: 22, paddingTop: 58, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reverse: { flexDirection: 'row-reverse' },
  kicker: { color: colors.gold, fontWeight: '900', letterSpacing: 2 },
  title: { color: colors.navy, fontSize: 30, fontWeight: '900' },
  langButton: { borderRadius: 18, backgroundColor: colors.navy, paddingVertical: 11, paddingHorizontal: 14 },
  langText: { color: colors.white, fontWeight: '900' },
  card: { backgroundColor: colors.navy, borderRadius: 28, padding: 20 },
  cardTitle: { color: colors.white, fontSize: 23, fontWeight: '900' },
  cardText: { color: 'rgba(255,255,255,.78)', marginTop: 8, lineHeight: 23 },
  label: { color: colors.text, fontWeight: '900', fontSize: 16 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  reverseWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap' },
  chip: { paddingVertical: 11, paddingHorizontal: 15, borderRadius: 999, backgroundColor: '#E7EEF5' },
  active: { backgroundColor: colors.navy },
  chipText: { color: colors.navy, fontWeight: '900' },
  activeText: { color: colors.white },
  panel: { backgroundColor: colors.white, borderRadius: 28, padding: 16, gap: 10 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, gap: 12 },
  settingCopy: { flex: 1 },
  settingTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  settingSubtitle: { color: colors.muted, marginTop: 4, lineHeight: 20 },
  infoCard: { backgroundColor: '#EAF6FA', borderRadius: 24, padding: 18 },
  infoTitle: { color: colors.navy, fontWeight: '900', fontSize: 18 },
  infoText: { color: colors.muted, marginTop: 7, fontWeight: '700' },
  rtl: { textAlign: 'right', writingDirection: 'rtl' }
});
