import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

type Props = {
  title: string;
  variant?: 'primary' | 'gold' | 'ghost';
  onPress?: () => void;
};

export function Button({ title, variant = 'primary', onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.button, styles[variant]]}>
      <Text style={[styles.text, variant === 'ghost' && styles.ghostText]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: 18, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center' },
  primary: { backgroundColor: colors.navy },
  gold: { backgroundColor: colors.gold },
  ghost: { backgroundColor: '#EAF6FA' },
  text: { color: colors.white, fontSize: 16, fontWeight: '800' },
  ghostText: { color: colors.navy }
});
