import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../src/components/Button';
import { colors } from '../src/constants/theme';
import { dict, Lang } from '../src/i18n';
import { cities, vehicleTypes } from '../src/serviceConfig';
import { registerDriver } from '../src/api';
import { autosaveLabel, useAutosave } from '../src/hooks/useAutosave';

export default function DriverRegister() {
  const params = useLocalSearchParams<{ lang?: Lang; phone?: string; name?: string }>();
  const [lang, setLang] = useState<Lang>(params.lang === 'en' ? 'en' : 'ar');
  const [name, setName] = useState(String(params.name || ''));
  const [phone, setPhone] = useState(String(params.phone || ''));
  const [cityIndex, setCityIndex] = useState(0);
  const [vehicleIndex, setVehicleIndex] = useState(0);
  const [plateNo, setPlateNo] = useState('');
  const [color, setColor] = useState('');
  const [model, setModel] = useState('');
  const [loading, setLoading] = useState(false);
  const t = dict[lang];
  const rtl = lang === 'ar';
  const city = cities[cityIndex];
  const vehicle = vehicleTypes[vehicleIndex];
  const autosave = useAutosave('jnbk.driver.register.draft', { lang, name, phone, cityIndex, vehicleIndex, plateNo, color, model }, (draft) => {
    if (draft.lang === 'ar' || draft.lang === 'en') setLang(draft.lang);
    if (typeof draft.name === 'string' && !params.name) setName(draft.name);
    if (typeof draft.phone === 'string' && !params.phone) setPhone(draft.phone);
    if (typeof draft.cityIndex === 'number') setCityIndex(draft.cityIndex);
    if (typeof draft.vehicleIndex === 'number') setVehicleIndex(draft.vehicleIndex);
    if (typeof draft.plateNo === 'string') setPlateNo(draft.plateNo);
    if (typeof draft.color === 'string') setColor(draft.color);
    if (typeof draft.model === 'string') setModel(draft.model);
  });

  async function submit() {
    if (!phone.trim() || !name.trim()) {
      Alert.alert('Jnbk', lang === 'ar' ? 'أدخل الاسم ورقم الهاتف' : 'Enter name and phone');
      return;
    }
    setLoading(true);
    try {
      await registerDriver({ phone, name, cityId: city.id, vehicleTypeId: vehicle.id, plateNo, color, model });
      await autosave.clearDraft();
      Alert.alert('Jnbk', lang === 'ar' ? 'تم إرسال طلب السائق للمراجعة' : 'Driver request submitted for review');
      router.replace({ pathname: '/driver', params: { lang } });
    } catch {
      Alert.alert('Jnbk', lang === 'ar' ? 'تعذر الاتصال بالخادم. تم حفظ البيانات تلقائيًا وسيتم فتح وضع السائق التجريبي.' : 'Backend offline. Data is autosaved and driver preview will open.');
      router.replace({ pathname: '/driver', params: { lang } });
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={[styles.header, rtl && styles.reverse]}>
        <View>
          <Text style={[styles.kicker, rtl && styles.rtl]}>Jnbk</Text>
          <Text style={[styles.title, rtl && styles.rtl]}>{lang === 'ar' ? 'تسجيل سائق' : 'Driver registration'}</Text>
        </View>
        <Pressable style={styles.langButton} onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
          <Text style={styles.langText}>{t.language}</Text>
        </Pressable>
      </View>

      <View style={styles.saveCard}>
        <Text style={[styles.saveText, rtl && styles.rtl]}>{autosaveLabel(autosave.status, lang)}</Text>
      </View>

      <View style={styles.card}>
        <TextInput style={[styles.input, rtl && styles.rtl]} placeholder={lang === 'ar' ? 'اسم السائق' : 'Driver name'} value={name} onChangeText={setName} />
        <TextInput style={[styles.input, rtl && styles.rtl]} placeholder={lang === 'ar' ? 'رقم الهاتف' : 'Phone'} value={phone} onChangeText={setPhone} keyboardType='phone-pad' />
        <TextInput style={[styles.input, rtl && styles.rtl]} placeholder={lang === 'ar' ? 'رقم اللوحة' : 'Plate number'} value={plateNo} onChangeText={setPlateNo} />
        <TextInput style={[styles.input, rtl && styles.rtl]} placeholder={lang === 'ar' ? 'لون المركبة' : 'Vehicle color'} value={color} onChangeText={setColor} />
        <TextInput style={[styles.input, rtl && styles.rtl]} placeholder={lang === 'ar' ? 'موديل المركبة' : 'Vehicle model'} value={model} onChangeText={setModel} />
      </View>

      <Text style={[styles.label, rtl && styles.rtl]}>{lang === 'ar' ? 'المدينة' : 'City'}</Text>
      <View style={[styles.wrap, rtl && styles.reverseWrap]}>
        {cities.map((item, index) => (
          <Pressable key={item.id} onPress={() => setCityIndex(index)} style={[styles.chip, cityIndex === index && styles.active]}>
            <Text style={[styles.chipText, cityIndex === index && styles.activeText]}>{lang === 'ar' ? item.nameAr : item.nameEn}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, rtl && styles.rtl]}>{lang === 'ar' ? 'نوع المركبة' : 'Vehicle type'}</Text>
      <View style={[styles.wrap, rtl && styles.reverseWrap]}>
        {vehicleTypes.map((item, index) => (
          <Pressable key={item.id} onPress={() => setVehicleIndex(index)} style={[styles.chip, vehicleIndex === index && styles.active]}>
            <Text style={[styles.chipText, vehicleIndex === index && styles.activeText]}>{lang === 'ar' ? item.nameAr : item.nameEn}</Text>
          </Pressable>
        ))}
      </View>

      <Button title={loading ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'إرسال الطلب' : 'Submit request')} variant='gold' onPress={submit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 22, paddingTop: 58, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reverse: { flexDirection: 'row-reverse' },
  kicker: { color: colors.gold, fontWeight: '900', letterSpacing: 2 },
  title: { color: colors.navy, fontSize: 30, fontWeight: '900' },
  langButton: { borderRadius: 18, backgroundColor: colors.navy, paddingVertical: 11, paddingHorizontal: 14 },
  langText: { color: colors.white, fontWeight: '900' },
  saveCard: { backgroundColor: '#E7F7EF', borderRadius: 18, padding: 12 },
  saveText: { color: colors.teal, fontWeight: '900' },
  card: { backgroundColor: colors.white, borderRadius: 28, padding: 18, gap: 12 },
  input: { backgroundColor: '#F1F5F9', borderRadius: 18, padding: 15, color: colors.text, fontWeight: '800' },
  label: { color: colors.text, fontWeight: '900', fontSize: 16 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  reverseWrap: { flexDirection: 'row-reverse' },
  chip: { paddingVertical: 11, paddingHorizontal: 15, borderRadius: 999, backgroundColor: '#E7EEF5' },
  active: { backgroundColor: colors.navy },
  chipText: { color: colors.navy, fontWeight: '900' },
  activeText: { color: colors.white },
  rtl: { textAlign: 'right', writingDirection: 'rtl' }
});
