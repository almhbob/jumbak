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
  const [nationalId, setNationalId] = useState('');
  const [cityIndex, setCityIndex] = useState(0);
  const [vehicleIndex, setVehicleIndex] = useState(0);
  const [plateNo, setPlateNo] = useState('');
  const [chassisNo, setChassisNo] = useState('');
  const [trafficId, setTrafficId] = useState('');
  const [color, setColor] = useState('');
  const [model, setModel] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [guarantorAddress, setGuarantorAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const t = dict[lang];
  const rtl = lang === 'ar';
  const city = cities[cityIndex];
  const vehicle = vehicleTypes[vehicleIndex];
  const draftValue = { lang, name, phone, nationalId, cityIndex, vehicleIndex, plateNo, chassisNo, trafficId, color, model, bankAccount, guarantorName, guarantorPhone, guarantorAddress };
  const autosave = useAutosave('jnbk.driver.register.draft', draftValue, (draft) => {
    if (draft.lang === 'ar' || draft.lang === 'en') setLang(draft.lang);
    if (typeof draft.name === 'string' && !params.name) setName(draft.name);
    if (typeof draft.phone === 'string' && !params.phone) setPhone(draft.phone);
    if (typeof draft.nationalId === 'string') setNationalId(draft.nationalId);
    if (typeof draft.cityIndex === 'number') setCityIndex(draft.cityIndex);
    if (typeof draft.vehicleIndex === 'number') setVehicleIndex(draft.vehicleIndex);
    if (typeof draft.plateNo === 'string') setPlateNo(draft.plateNo);
    if (typeof draft.chassisNo === 'string') setChassisNo(draft.chassisNo);
    if (typeof draft.trafficId === 'string') setTrafficId(draft.trafficId);
    if (typeof draft.color === 'string') setColor(draft.color);
    if (typeof draft.model === 'string') setModel(draft.model);
    if (typeof draft.bankAccount === 'string') setBankAccount(draft.bankAccount);
    if (typeof draft.guarantorName === 'string') setGuarantorName(draft.guarantorName);
    if (typeof draft.guarantorPhone === 'string') setGuarantorPhone(draft.guarantorPhone);
    if (typeof draft.guarantorAddress === 'string') setGuarantorAddress(draft.guarantorAddress);
  });

  async function submit() {
    if (!phone.trim() || !name.trim() || !plateNo.trim() || !guarantorName.trim() || !guarantorPhone.trim()) {
      Alert.alert('Jnbk', lang === 'ar' ? 'أكمل الاسم والهاتف ورقم اللوحة وبيانات الضامن' : 'Complete name, phone, plate number, and guarantor details');
      return;
    }
    setLoading(true);
    try {
      await registerDriver({ phone, name, cityId: city.id, vehicleTypeId: vehicle.id, plateNo, color, model, nationalId, chassisNo, trafficId, bankAccount, guarantorName, guarantorPhone, guarantorAddress });
      await autosave.clearDraft();
      Alert.alert('Jnbk', lang === 'ar' ? 'تم إرسال ملف الجوكي للمراجعة' : 'Driver file submitted for review');
      router.replace({ pathname: '/driver', params: { lang } });
    } catch {
      Alert.alert('Jnbk', lang === 'ar' ? 'تعذر الاتصال. تم حفظ البيانات تلقائيًا ويمكن إكمالها لاحقًا.' : 'Connection failed. Data is autosaved and can be completed later.');
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
          <Text style={[styles.title, rtl && styles.rtl]}>{lang === 'ar' ? 'ملف الجوكي' : 'Driver file'}</Text>
        </View>
        <Pressable style={styles.langButton} onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')}><Text style={styles.langText}>{t.language}</Text></Pressable>
      </View>
      <View style={styles.saveCard}><Text style={[styles.saveText, rtl && styles.rtl]}>{autosaveLabel(autosave.status, lang)}</Text></View>

      <Section title={lang === 'ar' ? 'بيانات الجوكي' : 'Driver details'} rtl={rtl} />
      <View style={styles.card}>
        <TextInput style={[styles.input, rtl && styles.rtl]} placeholder={lang === 'ar' ? 'اسم السائق' : 'Driver name'} value={name} onChangeText={setName} />
        <TextInput style={[styles.input, rtl && styles.rtl]} placeholder={lang === 'ar' ? 'رقم الهاتف' : 'Phone'} value={phone} onChangeText={setPhone} keyboardType='phone-pad' />
        <TextInput style={[styles.input, rtl && styles.rtl]} placeholder={lang === 'ar' ? 'الرقم الوطني / إثبات الشخصية' : 'National ID'} value={nationalId} onChangeText={setNationalId} />
        <TextInput style={[styles.input, rtl && styles.rtl]} placeholder={lang === 'ar' ? 'رقم الحساب البنكي / بنكك اختياري' : 'Bank/Bankak account optional'} value={bankAccount} onChangeText={setBankAccount} />
      </View>

      <Section title={lang === 'ar' ? 'بيانات المركبة' : 'Vehicle details'} rtl={rtl} />
      <View style={styles.card}>
        <TextInput style={[styles.input, rtl && styles.rtl]} placeholder={lang === 'ar' ? 'رقم اللوحة' : 'Plate number'} value={plateNo} onChangeText={setPlateNo} />
        <TextInput style={[styles.input, rtl && styles.rtl]} placeholder={lang === 'ar' ? 'رقم الشاسي' : 'Chassis number'} value={chassisNo} onChangeText={setChassisNo} />
        <TextInput style={[styles.input, rtl && styles.rtl]} placeholder={lang === 'ar' ? 'الرقم التعريفي / المباحث' : 'Traffic/security ID'} value={trafficId} onChangeText={setTrafficId} />
        <TextInput style={[styles.input, rtl && styles.rtl]} placeholder={lang === 'ar' ? 'لون المركبة' : 'Vehicle color'} value={color} onChangeText={setColor} />
        <TextInput style={[styles.input, rtl && styles.rtl]} placeholder={lang === 'ar' ? 'موديل المركبة' : 'Vehicle model'} value={model} onChangeText={setModel} />
      </View>

      <Text style={[styles.label, rtl && styles.rtl]}>{lang === 'ar' ? 'المدينة' : 'City'}</Text>
      <View style={[styles.wrap, rtl && styles.reverseWrap]}>{cities.map((item, index) => <Pressable key={item.id} onPress={() => setCityIndex(index)} style={[styles.chip, cityIndex === index && styles.active]}><Text style={[styles.chipText, cityIndex === index && styles.activeText]}>{lang === 'ar' ? item.nameAr : item.nameEn}</Text></Pressable>)}</View>
      <Text style={[styles.label, rtl && styles.rtl]}>{lang === 'ar' ? 'نوع المركبة' : 'Vehicle type'}</Text>
      <View style={[styles.wrap, rtl && styles.reverseWrap]}>{vehicleTypes.map((item, index) => <Pressable key={item.id} onPress={() => setVehicleIndex(index)} style={[styles.chip, vehicleIndex === index && styles.active]}><Text style={[styles.chipText, vehicleIndex === index && styles.activeText]}>{lang === 'ar' ? item.nameAr : item.nameEn}</Text></Pressable>)}</View>

      <Section title={lang === 'ar' ? 'بيانات الضامن' : 'Guarantor details'} rtl={rtl} />
      <View style={styles.card}>
        <TextInput style={[styles.input, rtl && styles.rtl]} placeholder={lang === 'ar' ? 'اسم الضامن الكامل' : 'Full guarantor name'} value={guarantorName} onChangeText={setGuarantorName} />
        <TextInput style={[styles.input, rtl && styles.rtl]} placeholder={lang === 'ar' ? 'هاتف الضامن' : 'Guarantor phone'} value={guarantorPhone} onChangeText={setGuarantorPhone} keyboardType='phone-pad' />
        <TextInput style={[styles.input, rtl && styles.rtl]} placeholder={lang === 'ar' ? 'عنوان الضامن في رفاعة' : 'Guarantor address'} value={guarantorAddress} onChangeText={setGuarantorAddress} />
      </View>

      <View style={styles.notice}><Text style={[styles.noticeText, rtl && styles.rtl]}>{lang === 'ar' ? 'ملاحظة: رفع الصور والمستندات سيتم في خطوة الاعتماد من لوحة الإدارة.' : 'Note: document/photo upload will be completed during admin approval.'}</Text></View>
      <Button title={loading ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'إرسال ملف الجوكي' : 'Submit driver file')} variant='gold' onPress={submit} />
    </ScrollView>
  );
}

function Section({ title, rtl }: { title: string; rtl: boolean }) { return <Text style={[styles.sectionTitle, rtl && styles.rtl]}>{title}</Text>; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg }, content: { padding: 22, paddingTop: 58, gap: 14 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, reverse: { flexDirection: 'row-reverse' }, kicker: { color: colors.gold, fontWeight: '900', letterSpacing: 2 }, title: { color: colors.navy, fontSize: 30, fontWeight: '900' }, langButton: { borderRadius: 18, backgroundColor: colors.navy, paddingVertical: 11, paddingHorizontal: 14 }, langText: { color: colors.white, fontWeight: '900' }, saveCard: { backgroundColor: '#E7F7EF', borderRadius: 18, padding: 12 }, saveText: { color: colors.teal, fontWeight: '900' }, sectionTitle: { color: colors.navy, fontWeight: '900', fontSize: 18, marginTop: 4 }, card: { backgroundColor: colors.white, borderRadius: 28, padding: 18, gap: 12 }, input: { backgroundColor: '#F1F5F9', borderRadius: 18, padding: 15, color: colors.text, fontWeight: '800' }, label: { color: colors.text, fontWeight: '900', fontSize: 16 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, reverseWrap: { flexDirection: 'row-reverse' }, chip: { paddingVertical: 11, paddingHorizontal: 15, borderRadius: 999, backgroundColor: '#E7EEF5' }, active: { backgroundColor: colors.navy }, chipText: { color: colors.navy, fontWeight: '900' }, activeText: { color: colors.white }, notice: { backgroundColor: '#FFF8E1', borderRadius: 18, padding: 14 }, noticeText: { color: colors.navy, fontWeight: '800', lineHeight: 22 }, rtl: { textAlign: 'right', writingDirection: 'rtl' }
});
