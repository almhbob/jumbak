import React from 'react';
import { Image, View, StyleSheet } from 'react-native';

const logoSource = require('../../assets/logo-mark.png');
const LOGO_ASPECT = 383 / 364;

type Props = {
  size?: 'sm' | 'md' | 'lg';
  onDark?: boolean;
  showTagline?: boolean;
};

const widths = { sm: 140, md: 200, lg: 280 };

export function BrandLogo({ size = 'md' }: Props) {
  const w = widths[size];
  const h = Math.round(w * LOGO_ASPECT);
  const radius = Math.round(w * 0.1);
  return (
    <View style={[styles.card, { borderRadius: radius }]}>
      <Image source={logoSource} style={{ width: w, height: h }} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#13D5F0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },
});
