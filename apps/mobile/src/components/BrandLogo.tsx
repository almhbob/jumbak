import React from 'react';
import { Image, View, StyleSheet } from 'react-native';

const logoSource = require('../../assets/logo-mark.png');
const LOGO_ASPECT = 383 / 364; // logo-mark.png height / width

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
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 5,
  },
});
