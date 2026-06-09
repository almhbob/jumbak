import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Switch, Pressable, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../src/components/Button';
import { colors } from '../src/constants/theme';
import { dict, Lang } from '../src/i18n';
import { getRides, updateRideStatus, getWallet, walletEarn, toggleDriverOnline } from '../src/api';
import { getSocket, onRideUpdate, disconnectSocket } from '../src/socketClient';

type Ride = { id: string; pickupLabel?: string; destinationLabel?: string; estimatedFare?: number; distanceKm?: number; status?: string };

export default function Driver() {
  const params = useLocalSearchParams<{ lang?: Lang }>();
  const [lang, setLang] = useState<Lang>(params.lang === 'en' ? 'en' : 'ar');
  const [online, setOnline] = useState(false);
  const [rides, setRides] = useState<Ride[]>([]);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet(['jnbk_user_id', 'jnbk_driver_id']).then((pairs) => {
      const uid = pairs[0][1];
      const did = pairs[1][1];
      if (!uid) return;
      setUserId(uid);
      if (did) setDriverId(did);
      getWallet(uid).then((w) => setWalletBalance(w.balance)).catch(() => null);
    });

    // Listen for real-time ride updates via Socket.io
    const unsub = onRideUpdate((data) => {
      if (data.type === 'new_ride') {
        getRides().then((res) => {
          const pending = (Array.isArray(res) ? res : res.rides ?? []) as Ride[];
          setRides(pending.filter((r) => ['REQUESTED', 'ACCEPTED', 'ARRIVING', 'ACTIVE'].includes(r.status ?? '')));
        }).catch(() => null);
      }
    });

    return () => {
      unsub();
      disconnectSocket();
    };
  }, []);

  const t = dict[lang];
  const rtl = lang === 'ar';

  useEffect(() => {
    if (!online) return;

    async function fetchRides() {
      try {
        const data = await getRides();
        const pending = (Array.isArray(data) ? data : data.rides ?? []) as Ride[];
        setRides(pending.filter((r) => ['REQUESTED', 'ACCEPTED', 'ARRIVING', 'ACTIVE'].includes(r.status ?? '')));
      } catch {
        // network error — keep existing list
      }
    }

    fetchRides();
    pollRef.current = setInterval(fetchRides, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [online]);

  async function toggle(val: boolean) {
    setOnline(val);
    if (!val) {
      setRides([]);
      setActiveRide(null);
      if (pollRef.current) clearInterval(pollRef.current);
    }
    if (driverId && !toggleLoading) {
      setToggleLoading(true);
      toggleDriverOnline(driverId, val).catch(() => null).finally(() => setToggleLoading(false));
    }
  }

  async function handleStatus(ride: Ride, status: string) {
    try {
      await updateRideStatus(ride.id, status);
    } catch {
      Alert.alert('Jnbk', lang === 'ar' ? 'تعذر تحديث حالة الرحلة — يُرجى إعادة المحاولة' : 'Could not update ride status — please try again');
      return;
    }
    if (status === 'COMPLETED') {
      setActiveRide(null);
      // Credit driver earnings
      if (userId && ride.estimatedFare) {
        walletEarn(userId, ride.estimatedFare, ride.id, lang === 'ar' ? 'أرباح رحلة' : 'Ride earnings')
          .then((w) => setWalletBalance(w.balance))
          .catch(() => null);
      }
    } else {
      setActiveRide({ ...ride, status });
    }
    setRides((prev) => prev.filter((r) => r.id !== ride.id));
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={[styles.header, rtl && styles.reverse]}>
        <Text style={[styles.title, rtl && styles.rtl]}>{t.driverDashboard}</Text>
        <Pressable onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')} style={styles.langBtn}>
          <Text style={styles.langText}>{t.language}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.status}>{online ? t.online : t.offline}</Text>
        <Switch value={online} onValueChange={toggle} />
      </View>

      <Pressable style={[styles.earningsCard, rtl && styles.reverse]} onPress={() => router.push({ pathname: '/wallet', params: { lang, role: 'DRIVER' } })}>
        <View>
          <Text style={[styles.earningsLabel, rtl && styles.rtl]}>{t.walletEarnings}</Text>
          <Text style={styles.earningsAmount}>
            {walletBalance !== null ? walletBalance.toLocaleString('en') : '—'} SDG
          </Text>
        </View>
        <Text style={styles.earningsArrow}>{rtl ? '←' : '→'}</Text>
      </Pressable>

      {online && !activeRide && rides.map((ride) => (
        <View key={ride.id} style={styles.rideCard}>
          <Text style={styles.route}>{ride.pickupLabel} → {ride.destinationLabel}</Text>
          <Text style={styles.muted}>{ride.distanceKm} km</Text>
          <Text style={styles.fare}>{ride.estimatedFare} SDG</Text>
          <Button title={t.acceptRide} variant="gold" onPress={() => handleStatus(ride, 'ACCEPTED')} />
          <Button title={t.reject} variant="ghost" onPress={() => setRides((prev) => prev.filter((r) => r.id !== ride.id))} />
        </View>
      ))}

      {activeRide && (
        <View style={styles.active}>
          <Text style={styles.route}>{activeRide.pickupLabel} → {activeRide.destinationLabel}</Text>
          <Button title={lang === 'ar' ? 'وصلت' : 'Arrived'} variant="gold" onPress={() => handleStatus(activeRide, 'ARRIVING')} />
          <Button title={lang === 'ar' ? 'بدأ الرحلة' : 'Start ride'} variant="gold" onPress={() => handleStatus(activeRide, 'ACTIVE')} />
          <Button title={lang === 'ar' ? 'أنهيت الرحلة' : 'Complete'} variant="gold" onPress={() => handleStatus(activeRide, 'COMPLETED')} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reverse: { flexDirection: 'row-reverse' },
  title: { fontSize: 26, fontWeight: '900', color: colors.navy },
  langBtn: { backgroundColor: colors.navy, padding: 10, borderRadius: 12 },
  langText: { color: colors.white },
  card: { backgroundColor: colors.white, padding: 16, borderRadius: 20, flexDirection: 'row', justifyContent: 'space-between' },
  status: { fontWeight: '900', color: colors.navy },
  rideCard: { backgroundColor: colors.white, padding: 16, borderRadius: 20, gap: 8 },
  route: { fontWeight: '900', fontSize: 18 },
  muted: { color: colors.muted },
  fare: { color: colors.gold, fontWeight: '900', fontSize: 22 },
  active: { backgroundColor: colors.white, padding: 20, borderRadius: 20, gap: 10 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  earningsCard: {
    backgroundColor: colors.navy, borderRadius: 20, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  earningsLabel: { color: 'rgba(255,255,255,.75)', fontWeight: '800', fontSize: 13 },
  earningsAmount: { color: colors.gold, fontWeight: '900', fontSize: 26, marginTop: 2 },
  earningsArrow: { color: colors.gold, fontWeight: '900', fontSize: 20 },
});
