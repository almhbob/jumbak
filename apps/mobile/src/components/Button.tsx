import React from 'react';
import { Pressable, Text, StyleSheet, I18nManager } from 'react-native';
import { colors } from '../constants/theme';

type Props = {
  title: string;
  variant?: 'primary' | 'gold' | 'ghost';
  onPress?: () => void;
  disabled?: boolean;
};

function hasArabic(text: string) {
  return /[\u0600-\u06FF]/.test(text);
}

export function Button({ title, variant = 'primary', onPress, disabled = false }: Props) {
  const rtl = hasArabic(title) || I18nManager.isRTL;
  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={title}
      disabled={disabled}
      hitSlop={10}
      android_ripple={{ color: 'rgba(255,255,255,.22)' }}
      onPress={() => {
        if (!disabled && onPress) onPress();
      }}
      style={({ pressed }) => [styles.button, styles[variant], disabled && styles.disabled, pressed && !disabled && styles.pressed]}
    >
      <Text style={[styles.text, variant === 'ghost' && styles.ghostText, rtl && styles.rtl]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: 18, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  primary: { backgroundColor: colors.navy },
  gold: { backgroundColor: colors.gold },
  ghost: { backgroundColor: '#EAF6FA' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.45 },
  text: { color: colors.white, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  ghostText: { color: colors.navy },
  rtl: { writingDirection: 'rtl', textAlign: 'center' }
});
