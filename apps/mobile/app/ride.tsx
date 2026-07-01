import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, Image, Alert } from 'react-native';

const logoSource = require('../assets/logo-mark.png');
import { useLocalSearchParams, router } from 'expo-router';
import { Button } from '../src/components/Button';
import { colors } from '../src/constants/theme';
import { dict, Lang } from '../src/i18n';
import { sw } from '../src/constants/responsive';
import { getDrivers, getRide } from '../src/api';
import { joinRide, leaveRide, onRideUpdate, onNoDrivers } from '../src/socketClient';

type Driver = { id: string; name: string; vehicle: string; rating: number; online?: boolean };
type RideDetails = { id: string; pickupLabel?: string; destinationLabel?: string; estimatedFare?: number; finalFare?: number; status?: string; driver?: { user?: { name?: string; phone?: string }; vehicle?: { vehicleType?: { nameAr?: string; nameEn?: string } } }; vehicleType?: { nameAr?: string; nameEn?: string }; city?: { nameAr?: string; nameEn?: string } };
const order = ['REQUESTED', 'ACCEPTED', 'ARRIVING', 'ACTIVE', 'COMPLETED'];
function step(status?: string) { if (status === 'CANCELLED') return -1; const i = order.indexOf(String(status || 'REQUESTED')); return i < 0 ? 0 : Math.min(i, 3); }
function titleFor(status: string | undefined, t: any, lang: Lang) { const ar = lang === 'ar'; const m: Record<string, string> = { REQUESTED: t.searching, ACCEPTED: t.accepted, ARRIVING: t.arriving, ACTIVE: t.started, COMPLETED: ar ? 'تم إكمال الرحلة' : 'Trip completed', CANCELLED: ar ? 'تم إلغاء الرحلة' : 'Trip cancelled' }; return m[String(status || 'REQUESTED')] || t.searching; }

export default function Ride() {
  const params = useLocalSearchParams<{ pickup?: string; destination?: string; fare?: string; lang?: Lang; cityId?: string; vehicleTypeId?: string; rideId?: string; city?: string; vehicle?: string }>();
  const [ride, setRide] = useState<RideDetails | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [source, setSource] = useState<'api' | 'local'>('local');
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const lang: Lang = params.lang === 'en' ? 'en' : 'ar';
  const t = dict[lang];
  const rtl = lang === 'ar';
  const currentStatus = ride?.status || 'REQUESTED';
  const currentStep = step(currentStatus);
  const states = [t.searching, t.accepted, t.arriving, t.started];
  const pickup = ride?.pickupLabel || params.pickup || (lang === 'ar' ? 'السوق' : 'Market');
  const destination = ride?.destinationLabel || params.destination || (lang === 'ar' ? 'المستشفى' : 'Hospital');
  const fare = String(ride?.finalFare || ride?.estimatedFare || params.fare || '1200');
  const driverName = ride?.driver?.user?.name || ride?.driver?.user?.phone;
  const driverVehicle = lang === 'ar' ? (ride?.driver?.vehicle?.vehicleType?.nameAr || ride?.vehicleType?.nameAr) : (ride?.driver?.vehicle?.vehicleType?.nameEn || ride?.vehicleType?.nameEn);
  const selectedDriver = driverName ? { id: 'api_driver', name: driverName, vehicle: driverVehicle || params.vehicle || 'Vehicle', rating: 4.8 } : drivers[0] || { id: 'local_driver', name: lang === 'ar' ? 'محمد أحمد' : 'Mohammed Ahmed', vehicle: lang === 'ar' ? 'ركشة زرقاء' : 'Blue rickshaw', rating: 4.8 };
  const completed = currentStatus === 'COMPLETED';
  const cancelled = currentStatus === 'CANCELLED';
  async function loadRide(silent = false) { if (!params.rideId) return; if (!silent) setLoading(true); try { const data = await getRide(String(params.rideId)); setRide(data); setSource('api'); } catch { setSource('local'); } finally { if (!silent) setLoading(false); } }
  useEffect(() => { async function loadDrivers() { try { const result = await getDrivers(params.cityId, params.vehicleTypeId); if (Array.isArray(result) && result.length > 0) setDrivers(result); } catch { setDrivers([]); } } loadDrivers(); loadRide(true); }, [params.cityId, params.vehicleTypeId, params.rideId]);

  // Real-time ride updates via Socket.io (fallback to polling if socket unavailable)
  useEffect(() => {
    if (!params.rideId) return;
    const rideId = String(params.rideId);

    // Join ride room for real-time updates
    joinRide(rideId);
    const unsub = onRideUpdate((data) => {
      if (data.rideId === rideId) loadRide(true);
    });

    const unsubNoDrivers = onNoDrivers((data) => {
      if (data.rideId !== rideId) return;
      Alert.alert(
        lang === 'ar' ? 'لا يوجد سائقون' : 'No Drivers Available',
        lang === 'ar'
          ? 'لا يوجد سائقون متاحون في منطقتك الآن. يرجى المحاولة مرة أخرى لاحقاً.'
          : 'No available drivers in your area right now. Please try again later.'
      );
    });

    // Fallback polling (every 30s) in case socket is not connected
    const isFinal = completed || currentStatus === 'CANCELLED';
    const fallbackTimer = autoRefresh && !isFinal ? setInterval(() => loadRide(true), 30000) : null;

    return () => {
      leaveRide(rideId);
      unsub();
      unsubNoDrivers();
      if (fallbackTimer) clearInterval(fallbackTimer);
    };
  }, [params.rideId, autoRefresh, completed]);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View style={[styles.topLine, rtl && styles.reverse]}>
          <View><Text style={[styles.kicker, rtl && styles.rtl]}>{t.liveTrip}</Text><Text style={[styles.title, rtl && styles.rtl]}>{titleFor(currentStatus, t, lang)}</Text></View>
          <Pressable style={styles.refreshButton} onPress={() => loadRide()}><Text style={styles.refreshText}>{loading ? '...' : (lang === 'ar' ? 'تحديث' : 'Refresh')}</Text></Pressable>
        </View>
        {!!params.rideId && <Text style={[styles.rideId, rtl && styles.rtl]}>#{params.rideId}</Text>}
      </View>
      <View style={styles.mapCard}>
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />
        <View style={styles.progressRow}>{states.map((item, index) => <View key={item} style={[styles.dot, index <= currentStep && styles.dotActive]} />)}</View>
        <Text style={[styles.route, rtl && styles.rtl]}>{pickup} {t.to} {destination}</Text>
        <Text style={[styles.muted, rtl && styles.rtl]}>{source === 'api' ? (lang === 'ar' ? 'الحالة من الخادم' : 'Live backend status') : (lang === 'ar' ? 'وضع معاينة' : 'Preview mode')}</Text>
      </View>
      {(currentStep > 0 || ride?.driver) && <View style={[styles.driverCard, rtl && styles.driverCardRtl]}><View style={styles.driverAvatar}><Text style={styles.driverInitial}>{selectedDriver.name.slice(0, 1)}</Text></View><View style={styles.driverInfo}><Text style={[styles.section, rtl && styles.rtl]}>{t.driver}</Text><Text style={[styles.name, rtl && styles.rtl]}>{selectedDriver.name}</Text><Text style={[styles.muted, rtl && styles.rtl]}>{selectedDriver.vehicle} - rating {selectedDriver.rating}</Text></View></View>}
      <View style={styles.fareCard}>
        <Text style={[styles.section, rtl && styles.rtl]}>{t.fare}</Text>
        <Text style={[styles.fare, rtl && styles.rtl]}>{fare} SDG</Text>
        <Text style={[styles.muted, rtl && styles.rtl]}>
          {completed
            ? (lang === 'ar' ? 'يمكنك الآن تقييم الرحلة' : 'You can now rate this trip')
            : t.cashNote}
        </Text>
        {completed && (
          <View style={styles.payCard}>
            <Text style={[styles.payHint, rtl && styles.rtl]}>
              {lang === 'ar'
                ? 'ادفع للسائق نقداً أو حوّل لحساب جنبك'
                : 'Pay driver in cash or transfer to Jnbk account'}
            </Text>
            <View style={[styles.payRow, rtl && styles.reverse]}>
              <Text style={styles.payIcon}>🏦</Text>
              <View>
                <Text style={[styles.payLabel, rtl && styles.rtl]}>
                  {lang === 'ar' ? 'رقم حساب جنبك' : 'Jnbk Account'}
                </Text>
                <Text style={styles.payNumber}>1791344</Text>
              </View>
            </View>
          </View>
        )}
      </View>
      {!cancelled && (completed ? <Button title={t.completeRate} variant='gold' onPress={() => router.push({ pathname: '/rating', params: { lang, rideId: params.rideId } })} /> : <Button title={loading ? (lang === 'ar' ? 'جاري التحديث...' : 'Refreshing...') : (lang === 'ar' ? 'تحديث حالة الرحلة' : 'Refresh trip status')} variant='gold' onPress={() => loadRide()} />)}
      <Button title={completed || cancelled ? t.tripHistory : t.cancel} variant='ghost' onPress={() => completed || cancelled ? router.push({ pathname: '/trips', params: { lang } }) : router.back()} />
      <Pressable style={styles.autoToggle} onPress={() => setAutoRefresh(!autoRefresh)}><Text style={styles.autoText}>{autoRefresh ? (lang === 'ar' ? 'التحديث التلقائي مفعل' : 'Auto-refresh on') : (lang === 'ar' ? 'التحديث التلقائي متوقف' : 'Auto-refresh off')}</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: sw(20), paddingTop: sw(52), gap: sw(14) },
  header: { gap: 2 }, topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, reverse: { flexDirection: 'row-reverse' },
  kicker: { color: colors.gold, fontWeight: '900', letterSpacing: 2 }, title: { fontSize: sw(26), fontWeight: '900', color: colors.navy }, rideId: { color: colors.muted, fontWeight: '800' },
  refreshButton: { backgroundColor: colors.navy, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12 }, refreshText: { color: colors.white, fontWeight: '900', fontSize: sw(13) },
  mapCard: { height: sw(220), borderRadius: 32, padding: sw(18), alignItems: 'center', justifyContent: 'center', backgroundColor: '#DDF3FA' }, logo: { width: sw(120), height: sw(126) }, progressRow: { flexDirection: 'row', gap: 8, marginVertical: sw(14) }, dot: { width: sw(36), height: 7, borderRadius: 999, backgroundColor: colors.white }, dotActive: { backgroundColor: colors.navy }, route: { color: colors.navy, fontSize: sw(17), fontWeight: '900', textAlign: 'center' },
  driverCard: { backgroundColor: colors.white, borderRadius: 28, padding: sw(16), flexDirection: 'row', gap: 12, alignItems: 'center' }, driverCardRtl: { flexDirection: 'row-reverse' }, driverAvatar: { width: sw(48), height: sw(48), borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy }, driverInitial: { color: colors.gold, fontSize: sw(22), fontWeight: '900' }, driverInfo: { flex: 1 },
  fareCard: { backgroundColor: colors.white, borderRadius: 28, padding: sw(16), gap: sw(6) }, section: { color: colors.muted, fontWeight: '800' }, name: { color: colors.text, fontSize: sw(20), fontWeight: '900' }, muted: { color: colors.muted, marginTop: 4 }, fare: { color: colors.gold, fontSize: sw(32), fontWeight: '900' }, autoToggle: { alignItems: 'center', padding: 10 }, autoText: { color: colors.teal, fontWeight: '900' }, rtl: { textAlign: 'right', writingDirection: 'rtl' },
  payCard: { backgroundColor: '#F0F9FF', borderRadius: 16, padding: sw(13), borderWidth: 1.5, borderColor: '#BAE6FD', gap: 8, marginTop: 6 },
  payHint: { color: '#0369A1', fontWeight: '800', fontSize: sw(12) },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  payIcon: { fontSize: sw(24) },
  payLabel: { color: colors.muted, fontWeight: '700', fontSize: sw(11) },
  payNumber: { color: colors.navy, fontWeight: '900', fontSize: sw(24), letterSpacing: 3 },
});
