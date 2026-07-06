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
  return /[؀-ۿ]/.test(text);
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
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[
        styles.text,
        variant === 'ghost' && styles.ghostText,
        variant === 'gold' && styles.goldText,
        rtl && styles.rtl,
      ]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primary: {
    backgroundColor: colors.teal,
  },
  gold: {
    backgroundColor: colors.gold,
  },
  ghost: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  pressed: { opacity: 0.80, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.40 },
  text: { color: colors.white, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  ghostText: { color: 'rgba(255,255,255,0.85)' },
  goldText: { color: '#1A0E00' },
  rtl: { writingDirection: 'rtl', textAlign: 'center' },
});
