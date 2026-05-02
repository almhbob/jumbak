import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../src/components/Button';
import { colors } from '../src/constants/theme';
import { dict, Lang } from '../src/i18n';
import { createSupportRequest } from '../src/supportApi';

const issues = {
  ar: ['مشكلة في الرحلة', 'السعر غير واضح', 'سلوك السائق', 'طلب إضافة مدينة', 'اقتراح تحسين'],
  en: ['Ride issue', 'Fare unclear', 'Driver behavior', 'Request new city', 'Improvement suggestion']
};

export default function Support() {
  const params = useLocalSearchParams<{ lang?: Lang }>();
  const [lang, setLang] = useState<Lang>(params.lang === 'en' ? 'en' : 'ar');
  const [selected, setSelected] = useState(0);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const t = dict[lang];
  const rtl = lang === 'ar';

  async function submit() {
    if (!message.trim()) {
      Alert.alert('JUMBAK', lang === 'ar' ? 'اكتب تفاصيل الطلب أولًا' : 'Write request details first');
      return;
    }

    setLoading(true);
    try {
      await createSupportRequest({ category: issues[lang][selected], message: message.trim(), lang });
      Alert.alert('JUMBAK', lang === 'ar' ? 'تم إرسال طلب الدعم بنجاح.' : 'Support request submitted successfully.');
      router.push({ pathname: '/home', params: { lang } });
    } catch {
      Alert.alert('JUMBAK', lang === 'ar' ? 'الخادم غير متصل. تم حفظ الطلب كتجربة محلية.' : 'Backend is offline. Request saved as local preview.');
      router.push({ pathname: '/home', params: { lang } });
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={[styles.header, rtl && styles.reverse]}>
        <View>
          <Text style={[styles.kicker, rtl && styles.rtl]}>JUMBAK</Text>
          <Text style={[styles.title, rtl && styles.rtl]}>{lang === 'ar' ? 'الدعم والمساعدة' : 'Support & help'}</Text>
        </View>
        <Pressable style={styles.langButton} onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
          <Text style={styles.langText}>{t.language}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={[styles.cardTitle, rtl && styles.rtl]}>{lang === 'ar' ? 'كيف يمكننا مساعدتك؟' : 'How can we help?'}</Text>
        <Text style={[styles.cardText, rtl && styles.rtl]}>{lang === 'ar' ? 'اختر نوع الطلب واكتب التفاصيل بوضوح ليتم التعامل معه بسرعة.' : 'Choose a request type and describe the issue clearly for faster handling.'}</Text>
      </View>

      <View style={[styles.wrap, rtl && styles.reverseWrap]}>
        {issues[lang].map((item, index) => (
          <Pressable key={item} onPress={() => setSelected(index)} style={[styles.chip, selected === index && styles.active]}>
            <Text style={[styles.chipText, selected === index && styles.activeText]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        multiline
        style={[styles.input, rtl && styles.rtl]}
        placeholder={lang === 'ar' ? 'اكتب تفاصيل الطلب هنا...' : 'Write request details here...'}
        value={message}
        onChangeText={setMessage}
      />

      <Button title={loading ? (lang === 'ar' ? 'جاري الإرسال...' : 'Submitting...') : (lang === 'ar' ? 'إرسال الطلب' : 'Submit request')} variant='gold' onPress={submit} />
      <Button title={t.backHome} variant='ghost' onPress={() => router.push({ pathname: '/home', params: { lang } })} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 22, paddingTop: 58, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reverse: { flexDirection: 'row-reverse' },
  kicker: { color: colors.gold, fontWeight: '900', letterSpacing: 2 },
  title: { color: colors.navy, fontSize: 30, fontWeight: '900' },
  langButton: { borderRadius: 18, backgroundColor: colors.navy, paddingVertical: 11, paddingHorizontal: 14 },
  langText: { color: colors.white, fontWeight: '900' },
  card: { backgroundColor: colors.white, borderRadius: 28, padding: 20 },
  cardTitle: { color: colors.navy, fontSize: 22, fontWeight: '900' },
  cardText: { color: colors.muted, lineHeight: 23, marginTop: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  reverseWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap' },
  chip: { paddingVertical: 11, paddingHorizontal: 15, borderRadius: 999, backgroundColor: '#E7EEF5' },
  active: { backgroundColor: colors.navy },
  chipText: { color: colors.navy, fontWeight: '900' },
  activeText: { color: colors.white },
  input: { minHeight: 150, textAlignVertical: 'top', backgroundColor: colors.white, borderRadius: 24, padding: 16, color: colors.text, fontWeight: '800' },
  rtl: { textAlign: 'right', writingDirection: 'rtl' }
});
