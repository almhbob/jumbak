import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../src/components/Button';
import { brand, colors } from '../src/constants/theme';
import { dict, Lang } from '../src/i18n';
import { getWallet, walletTopup } from '../src/api';
import { createSupportRequest } from '../src/supportApi';
import { sw } from '../src/constants/responsive';

type Transaction = {
  id: string;
  amount: number;
  type: string;
  description?: string | null;
  rideId?: string | null;
  createdAt: string;
};

type WalletData = {
  balance: number;
  currency: string;
  transactions: Transaction[];
};

const TOPUP_AMOUNTS = [5000, 10000, 20000, 50000];

function fmt(n: number) {
  return n.toLocaleString('en');
}

function txIcon(type: string) {
  if (type === 'TOPUP') return '＋';
  if (type === 'DRIVER_EARNING') return '＋';
  if (type === 'REFUND') return '↩';
  return '－';
}

function txColor(amount: number) {
  return amount >= 0 ? colors.teal : '#E74C3C';
}

export default function Wallet() {
  const params = useLocalSearchParams<{ lang?: Lang; role?: string }>();
  const [lang, setLang] = useState<Lang>(params.lang === 'en' ? 'en' : 'ar');
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [topupLoading, setTopupLoading] = useState(false);

  const t = dict[lang];
  const rtl = lang === 'ar';
  const currency = wallet?.currency ?? 'SDG';
  const isDriver = params.role === 'DRIVER';

  const loadWallet = useCallback(async (uid: string) => {
    try {
      const data = await getWallet(uid);
      setWallet(data);
    } catch {
      setWallet({ balance: 0, currency: 'SDG', transactions: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('jnbk_user_id').then((uid) => {
      if (uid) {
        setUserId(uid);
        loadWallet(uid);
      } else {
        setLoading(false);
      }
    });
  }, [loadWallet]);

  async function requestTopup(amount: number) {
    if (!userId) {
      Alert.alert('Jnbk', lang === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Please log in first');
      return;
    }
    setTopupLoading(true);
    try {
      await createSupportRequest({
        category: 'wallet_topup',
        message: `طلب شحن محفظة: ${fmt(amount)} ${currency} — userId: ${userId}`,
        lang,
      });
      Alert.alert(
        'Jnbk',
        lang === 'ar'
          ? `${t.walletTopupSent} — ${fmt(amount)} ${currency}`
          : `${t.walletTopupSent} — ${fmt(amount)} ${currency}`,
      );
    } catch {
      // Fallback: call topup directly (for dev/demo)
      try {
        const updated = await walletTopup(userId, amount, lang === 'ar' ? 'شحن رصيد' : 'Wallet top-up');
        setWallet(updated);
        Alert.alert('Jnbk', lang === 'ar' ? `تم إضافة ${fmt(amount)} ${currency}` : `Added ${fmt(amount)} ${currency}`);
      } catch {
        Alert.alert('Jnbk', lang === 'ar' ? 'تعذر إرسال الطلب' : 'Could not send request');
      }
    } finally {
      setTopupLoading(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <LinearGradient colors={brand.gradient} style={styles.hero}>
        <View style={[styles.heroTop, rtl && styles.reverse]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>{rtl ? '→' : '←'}</Text>
          </Pressable>
          <Pressable onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')} style={styles.langBtn}>
            <Text style={styles.langText}>{t.language}</Text>
          </Pressable>
        </View>

        <View style={styles.balanceWrap}>
          <Text style={[styles.walletLabel, rtl && styles.rtl]}>
            {isDriver ? t.walletEarnings : t.walletBalance}
          </Text>
          {loading ? (
            <ActivityIndicator color={colors.gold} size="large" style={{ marginTop: 12 }} />
          ) : (
            <Text style={styles.balanceAmount}>{fmt(wallet?.balance ?? 0)}</Text>
          )}
          <Text style={styles.currencyLabel}>{currency}</Text>
        </View>
      </LinearGradient>

      {/* Top-up section */}
      {!isDriver && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, rtl && styles.rtl]}>{t.walletTopup}</Text>
          <View style={[styles.amountsRow, rtl && styles.reverseRow]}>
            {TOPUP_AMOUNTS.map((amount) => (
              <Pressable
                key={amount}
                style={styles.amountChip}
                onPress={() => requestTopup(amount)}
                disabled={topupLoading}
              >
                <Text style={styles.amountText}>{fmt(amount)}</Text>
                <Text style={styles.amountCurrency}>{currency}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.topupNote, rtl && styles.rtl]}>
            {lang === 'ar'
              ? 'اختر مبلغاً لإرسال طلب شحن للإدارة. سيتم تفعيل الرصيد خلال دقائق.'
              : 'Select an amount to send a top-up request to admin. Balance is activated within minutes.'}
          </Text>
        </View>
      )}

      {/* Transaction history */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, rtl && styles.rtl]}>{t.walletHistory}</Text>

        {!loading && (!wallet?.transactions || wallet.transactions.length === 0) && (
          <View style={styles.emptyCard}>
            <Text style={[styles.emptyText, rtl && styles.rtl]}>{t.walletNoHistory}</Text>
          </View>
        )}

        {wallet?.transactions?.map((tx) => (
          <View key={tx.id} style={[styles.txRow, rtl && styles.reverse]}>
            <View style={[styles.txIconWrap, { backgroundColor: tx.amount >= 0 ? '#E7F7EF' : '#FDECEA' }]}>
              <Text style={[styles.txIconText, { color: txColor(tx.amount) }]}>{txIcon(tx.type)}</Text>
            </View>
            <View style={styles.txContent}>
              <Text style={[styles.txDesc, rtl && styles.rtl]}>
                {tx.description || (tx.amount >= 0 ? t.walletCreditLabel : t.walletDebitLabel)}
              </Text>
              <Text style={[styles.txDate, rtl && styles.rtl]}>
                {new Date(tx.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SD' : 'en-GB')}
              </Text>
            </View>
            <Text style={[styles.txAmount, { color: txColor(tx.amount) }]}>
              {tx.amount >= 0 ? '+' : ''}{fmt(tx.amount)} {currency}
            </Text>
          </View>
        ))}
      </View>

      {/* Withdrawal request (driver) */}
      {isDriver && (
        <Button
          title={t.walletWithdraw}
          variant="ghost"
          onPress={() =>
            Alert.alert(
              'Jnbk',
              lang === 'ar'
                ? 'سيتم إضافة خيار السحب قريباً. تواصل مع الدعم للمساعدة.'
                : 'Withdrawal option coming soon. Contact support for assistance.',
            )
          }
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 40 },
  hero: { padding: sw(22), paddingTop: sw(52), gap: sw(8) },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reverse: { flexDirection: 'row-reverse' },
  backBtn: { backgroundColor: 'rgba(255,255,255,.15)', borderRadius: 12, padding: 10 },
  backText: { color: colors.white, fontWeight: '900', fontSize: sw(16) },
  langBtn: { backgroundColor: 'rgba(255,255,255,.15)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 13 },
  langText: { color: colors.white, fontWeight: '900', fontSize: sw(13) },
  balanceWrap: { alignItems: 'center', paddingVertical: sw(18) },
  walletLabel: { color: 'rgba(255,255,255,.8)', fontWeight: '800', fontSize: sw(14), letterSpacing: 1 },
  balanceAmount: { color: colors.gold, fontSize: sw(54), fontWeight: '900', letterSpacing: -1, marginTop: 4 },
  currencyLabel: { color: 'rgba(255,255,255,.7)', fontWeight: '900', fontSize: sw(16), marginTop: -4 },
  section: { margin: sw(16), marginTop: sw(12), gap: sw(10) },
  sectionTitle: { color: colors.navy, fontWeight: '900', fontSize: sw(16) },
  amountsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  reverseRow: { flexDirection: 'row-reverse' },
  amountChip: {
    flex: 1, minWidth: sw(70), alignItems: 'center',
    backgroundColor: colors.white, borderRadius: 20, paddingVertical: sw(14),
    borderWidth: 1.5, borderColor: colors.navy,
    shadowColor: colors.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  amountText: { color: colors.navy, fontWeight: '900', fontSize: sw(17) },
  amountCurrency: { color: colors.muted, fontWeight: '800', fontSize: sw(11), marginTop: 2 },
  topupNote: { color: colors.muted, fontWeight: '700', fontSize: sw(12), lineHeight: 19 },
  emptyCard: { backgroundColor: colors.white, borderRadius: 20, padding: sw(20), alignItems: 'center' },
  emptyText: { color: colors.muted, fontWeight: '800', fontSize: sw(14) },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.white, borderRadius: 18, padding: sw(13),
    borderWidth: 1, borderColor: colors.border,
  },
  txIconWrap: { width: sw(40), height: sw(40), borderRadius: 99, alignItems: 'center', justifyContent: 'center' },
  txIconText: { fontWeight: '900', fontSize: sw(17) },
  txContent: { flex: 1 },
  txDesc: { color: colors.navy, fontWeight: '900', fontSize: sw(14) },
  txDate: { color: colors.muted, fontWeight: '700', fontSize: sw(12), marginTop: 2 },
  txAmount: { fontWeight: '900', fontSize: sw(15), textAlign: 'right' },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
});
