import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { colors } from '../src/constants/theme';

export default function LegalScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>الشروط والسياسة</Text>
      <Text style={styles.text}>باستخدامك لتطبيق جنبك، فإنك توافق على استخدام الخدمة بطريقة آمنة وقانونية.</Text>
      <Text style={styles.text}>نستخدم بيانات الحساب والرحلات لتشغيل الخدمة وتحسين الجودة والدعم.</Text>
      <Text style={styles.text}>للدعم: jnbk2003@gmail.com</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingTop: 60, gap: 14 },
  title: { color: colors.navy, fontSize: 26, fontWeight: '900', textAlign: 'right' },
  text: { color: colors.text, fontSize: 16, lineHeight: 26, fontWeight: '700', textAlign: 'right' }
});
