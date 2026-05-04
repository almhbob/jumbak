import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { brand, colors } from '../constants/theme';

type Props = {
  size?: 'sm' | 'md' | 'lg';
  onDark?: boolean;
  showTagline?: boolean;
};

const sizes = {
  sm: { mark: 58, car: 34, arabic: 20, english: 18, tagline: 9 },
  md: { mark: 96, car: 54, arabic: 34, english: 30, tagline: 12 },
  lg: { mark: 140, car: 78, arabic: 48, english: 42, tagline: 14 }
};

export function BrandLogo({ size = 'md', onDark = false, showTagline = true }: Props) {
  const s = sizes[size];
  const mainColor = onDark ? colors.white : colors.navy;
  return (
    <View style={styles.wrap}>
      <View style={[styles.mark, { width: s.mark, height: s.mark * 0.72 }]}> 
        <View style={[styles.speedLine, styles.lineTop]} />
        <View style={[styles.speedLine, styles.lineBottom]} />
        <View style={[styles.rickshawBody, { width: s.car, height: s.car * 0.62, borderColor: mainColor }]}>
          <View style={[styles.window, { borderColor: mainColor }]} />
          <Text style={[styles.jLetter, { color: mainColor, fontSize: s.car * 0.72 }]}>J</Text>
        </View>
        <View style={[styles.frontWheel, { borderColor: mainColor }]} />
        <View style={[styles.wave, { borderColor: colors.gold }]} />
        <View style={[styles.pin, styles.pinLarge]} />
        <View style={[styles.pin, styles.pinSmall]} />
      </View>
      <Text style={[styles.arabic, { color: mainColor, fontSize: s.arabic }]}>{brand.nameAr}</Text>
      <Text style={[styles.english, { color: mainColor, fontSize: s.english }]}>{brand.nameEn}</Text>
      {showTagline ? <Text style={[styles.tagline, { fontSize: s.tagline }]}>{brand.taglineEn.toUpperCase()}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  mark: { alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  rickshawBody: { borderWidth: 7, borderRadius: 18, borderTopRightRadius: 26, borderBottomLeftRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  window: { position: 'absolute', left: 5, top: 5, width: '31%', height: '42%', borderWidth: 4, borderRadius: 9 },
  jLetter: { fontWeight: '900', lineHeight: 54, marginTop: 2 },
  frontWheel: { position: 'absolute', left: '18%', bottom: 2, width: 22, height: 22, borderRadius: 11, borderWidth: 6 },
  wave: { position: 'absolute', width: '56%', height: '43%', right: '13%', bottom: '12%', borderBottomWidth: 7, borderRadius: 30, transform: [{ rotate: '-13deg' }] },
  pin: { position: 'absolute', backgroundColor: colors.gold, borderRadius: 999, borderWidth: 4, borderColor: colors.white },
  pinLarge: { width: 32, height: 40, right: '8%', bottom: '10%', transform: [{ rotate: '18deg' }] },
  pinSmall: { width: 24, height: 31, right: '26%', bottom: '0%', transform: [{ rotate: '-10deg' }] },
  speedLine: { position: 'absolute', right: 0, height: 5, borderRadius: 999, backgroundColor: colors.gold },
  lineTop: { top: 10, width: 50 },
  lineBottom: { top: 26, width: 34 },
  arabic: { fontWeight: '900', marginTop: -4, textAlign: 'center', writingDirection: 'rtl' },
  english: { fontWeight: '900', letterSpacing: 4, textAlign: 'center', marginTop: -3 },
  tagline: { color: colors.navy, fontWeight: '900', letterSpacing: 1, textAlign: 'center' }
});
