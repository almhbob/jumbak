import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Button } from '../src/components/Button';
import { colors } from '../src/constants/theme';
import { dict, Lang } from '../src/i18n';
import { getDrivers, getRide } from '../src/api';

type Driver = { id: string; name: string; vehicle: string; rating: number; online?: boolean };
type RideDetails = { id: string; pickupLabel?: string; destinationLabel?: string; estimatedFare?: number; finalFare?: number; status?: string; driver?: { user?: { name?: string; phone?: string }; vehicle?: { vehicleType?: { nameAr?: string; nameEn?: string } } }; vehicleType?: { nameAr?: string; nameEn?: string }; city?: { nameAr?: string; nameEn?: string } };
const order = ['REQUESTED', 'ACCEPTED', 'ARRIVING', 'ACTIVE', 'COMPLETED'];
function step(status?: string) { const i = order.indexOf(String(status || 'REQUESTED')); return i < 0 ? 0 : Math.min(i, 3); }
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
  async function loadRide(silent = false) { if (!params.rideId) return; if (!silent) setLoading(true); try { const data = await getRide(String(params.rideId)); setRide(data); setSource('api'); } catch { setSource('local'); } finally { if (!silent) setLoading(false); } }
  useEffect(() => { async function loadDrivers() { try { const result = await getDrivers(params.cityId, params.vehicleTypeId); if (Array.isArray(result) && result.length > 0) setDrivers(result); } catch { setDrivers([]); } } loadDrivers(); loadRide(true); }, [params.cityId, params.vehicleTypeId, params.rideId]);
  useEffect(() => { if (!params.rideId || !autoRefresh || completed) return; const timer = setInterval(() => loadRide(true), 5000); return () => clearInterval(timer); }, [params.rideId, autoRefresh, completed]);
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={[styles.topLine, rtl && styles.reverse]}>
          <View><Text style={[styles.kicker, rtl && styles.rtl]}>{t.liveTrip}</Text><Text style={[styles.title, rtl && styles.rtl]}>{titleFor(currentStatus, t, lang)}</Text></View>
          <Pressable style={styles.refreshButton} onPress={() => loadRide()}><Text style={styles.refreshText}>{loading ? '...' : (lang === 'ar' ? 'تحديث' : 'Refresh')}</Text></Pressable>
        </View>
        {!!params.rideId && <Text style={[styles.rideId, rtl && styles.rtl]}>#{params.rideId}</Text>}
      </View>
      <View style={styles.mapCard}>
        <Text style={styles.logo}>J</Text>
        <View style={styles.progressRow}>{states.map((item, index) => <View key={item} style={[styles.dot, index <= currentStep && styles.dotActive]} />)}</View>
        <Text style={[styles.route, rtl && styles.rtl]}>{pickup} {t.to} {destination}</Text>
        <Text style={[styles.muted, rtl && styles.rtl]}>{source === 'api' ? (lang === 'ar' ? 'الحالة من الخادم' : 'Live backend status') : (lang === 'ar' ? 'وضع معاينة' : 'Preview mode')}</Text>
      </View>
      {(currentStep > 0 || ride?.driver) && <View style={[styles.driverCard, rtl && styles.driverCardRtl]}><View style={styles.driverAvatar}><Text style={styles.driverInitial}>{selectedDriver.name.slice(0, 1)}</Text></View><View style={styles.driverInfo}><Text style={[styles.section, rtl && styles.rtl]}>{t.driver}</Text><Text style={[styles.name, rtl && styles.rtl]}>{selectedDriver.name}</Text><Text style={[styles.muted, rtl && styles.rtl]}>{selectedDriver.vehicle} - rating {selectedDriver.rating}</Text></View></View>}
      <View style={styles.fareCard}><Text style={[styles.section, rtl && styles.rtl]}>{t.fare}</Text><Text style={[styles.fare, rtl && styles.rtl]}>{fare} SDG</Text><Text style={[styles.muted, rtl && styles.rtl]}>{completed ? (lang === 'ar' ? 'يمكنك الآن تقييم الرحلة' : 'You can now rate this trip') : t.cashNote}</Text></View>
      {completed ? <Button title={t.completeRate} variant='gold' onPress={() => router.push({ pathname: '/rating', params: { lang, rideId: params.rideId } })} /> : <Button title={loading ? (lang === 'ar' ? 'جاري التحديث...' : 'Refreshing...') : (lang === 'ar' ? 'تحديث حالة الرحلة' : 'Refresh trip status')} variant='gold' onPress={() => loadRide()} />}
      <Button title={completed ? t.tripHistory : t.cancel} variant='ghost' onPress={() => completed ? router.push({ pathname: '/trips', params: { lang } }) : router.back()} />
      <Pressable style={styles.autoToggle} onPress={() => setAutoRefresh(!autoRefresh)}><Text style={styles.autoText}>{autoRefresh ? (lang === 'ar' ? 'التحديث التلقائي مفعل' : 'Auto-refresh on') : (lang === 'ar' ? 'التحديث التلقائي متوقف' : 'Auto-refresh off')}</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 22, paddingTop: 58, gap: 16, backgroundColor: colors.bg },
  header: { gap: 2 }, topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, reverse: { flexDirection: 'row-reverse' },
  kicker: { color: colors.gold, fontWeight: '900', letterSpacing: 2 }, title: { fontSize: 32, fontWeight: '900', color: colors.navy }, rideId: { color: colors.muted, fontWeight: '800' },
  refreshButton: { backgroundColor: colors.navy, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12 }, refreshText: { color: colors.white, fontWeight: '900' },
  mapCard: { height: 275, borderRadius: 32, padding: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DDF3FA' }, logo: { color: colors.gold, fontSize: 72, fontWeight: '900' }, progressRow: { flexDirection: 'row', gap: 8, marginVertical: 22 }, dot: { width: 42, height: 7, borderRadius: 999, backgroundColor: colors.white }, dotActive: { backgroundColor: colors.navy }, route: { color: colors.navy, fontSize: 20, fontWeight: '900' },
  driverCard: { backgroundColor: colors.white, borderRadius: 28, padding: 18, flexDirection: 'row', gap: 14, alignItems: 'center' }, driverCardRtl: { flexDirection: 'row-reverse' }, driverAvatar: { width: 54, height: 54, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy }, driverInitial: { color: colors.gold, fontSize: 26, fontWeight: '900' }, driverInfo: { flex: 1 },
  fareCard: { backgroundColor: colors.white, borderRadius: 28, padding: 18 }, section: { color: colors.muted, fontWeight: '800' }, name: { color: colors.text, fontSize: 24, fontWeight: '900' }, muted: { color: colors.muted, marginTop: 4 }, fare: { color: colors.gold, fontSize: 36, fontWeight: '900' }, autoToggle: { alignItems: 'center', padding: 10 }, autoText: { color: colors.teal, fontWeight: '900' }, rtl: { textAlign: 'right', writingDirection: 'rtl' }
});
