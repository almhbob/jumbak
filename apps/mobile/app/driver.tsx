import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Switch, Pressable, ScrollView,
  Alert, BackHandler, Modal, Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { Button } from '../src/components/Button';
import { colors } from '../src/constants/theme';
import { dict, Lang } from '../src/i18n';
import { getRides, updateRideStatus, rejectRide, getWallet, toggleDriverOnline } from '../src/api';
import {
  getSocket, onRideUpdate, onRideOffer, onRideTaken, onDriverSuspended,
  joinDriverRoom, leaveDriverRoom, disconnectSocket, emitDriverLocation,
  type RideOfferPayload, type SuspensionPayload,
} from '../src/socketClient';
import { getCurrentDriverProfile } from '../src/driverProfile';

type ActiveRide = { id: string; pickupLabel?: string; destinationLabel?: string; estimatedFare?: number; distanceKm?: number; status?: string };

const OFFER_TIMEOUT = 60; // seconds

export default function Driver() {
  const params = useLocalSearchParams<{ lang?: Lang }>();
  const [lang, setLang] = useState<Lang>(params.lang === 'en' ? 'en' : 'ar');
  const [online, setOnline] = useState(false);
  const [rides, setRides] = useState<ActiveRide[]>([]);
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [suspendedUntil, setSuspendedUntil] = useState<Date | null>(null);

  // Incoming ride offer modal state
  const [offer, setOffer] = useState<RideOfferPayload | null>(null);
  const [offerCountdown, setOfferCountdown] = useState(OFFER_TIMEOUT);
  const [offerLoading, setOfferLoading] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const driverIdRef = useRef<string | null>(null);

  const t = dict[lang];
  const rtl = lang === 'ar';

  // ─── Boot: load stored profile ──────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.multiGet(['jnbk_user_id', 'jnbk_driver_id', 'jnbk_driver_verified']).then((pairs) => {
      const uid = pairs[0][1];
      const did = pairs[1][1];
      const verified = pairs[2][1];
      if (!uid) return;
      setUserId(uid);
      if (did) { setDriverId(did); driverIdRef.current = did; }
      setIsVerified(verified === 'true');
      getWallet(uid).then((w) => setWalletBalance(w.balance)).catch(() => null);
    });

    getCurrentDriverProfile().then((profile) => {
      if (!profile) return;
      setDriverId(profile.id);
      driverIdRef.current = profile.id;
      setIsVerified(profile.verified === true);
      setOnline(profile.online === true);
      // Join personal driver room regardless of online status
      joinDriverRoom(profile.id);
    }).catch(() => null);

    const backSub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => {
      backSub.remove();
      if (driverIdRef.current) leaveDriverRoom(driverIdRef.current);
      disconnectSocket();
    };
  }, []);

  // ─── Re-join driver room whenever driverId resolves ──────────────────────────
  useEffect(() => {
    if (!driverId) return;
    driverIdRef.current = driverId;
    joinDriverRoom(driverId);
  }, [driverId]);

  // ─── Socket listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    // Generic ride_update: refresh active ride list
    const unsubUpdate = onRideUpdate((data) => {
      if (data.type === 'new_ride' || data.type === 'ride_update') {
        refreshRideList();
      }
    });

    // Incoming dispatch offer
    const unsubOffer = onRideOffer((incoming) => {
      if (!online) return; // ignore if driver went offline
      showOffer(incoming);
    });

    // Another driver accepted — dismiss our offer for this ride
    const unsubTaken = onRideTaken(({ rideId }) => {
      setOffer((prev) => {
        if (prev?.rideId === rideId) {
          clearCountdown();
          return null;
        }
        return prev;
      });
    });

    // Account suspended event
    const unsubSuspend = onDriverSuspended((data: SuspensionPayload) => {
      setSuspendedUntil(new Date(data.suspendedUntil));
      setOnline(false);
      setOffer(null);
      clearCountdown();
      const msg = data.deducted
        ? (lang === 'ar'
          ? `تجاوزت حد الرفض اليومي. تم تعليق حسابك ${data.hours} ساعة وخصم ${data.deductedAmount} SDG من محفظتك.`
          : `Daily rejection limit reached. Account suspended for ${data.hours}h, ${data.deductedAmount} SDG deducted.`)
        : (lang === 'ar'
          ? `تجاوزت حد الرفض اليومي. تم تعليق حسابك لمدة ${data.hours} ساعة.`
          : `Daily rejection limit reached. Account suspended for ${data.hours}h.`);
      Alert.alert('Jnbk', msg);
    });

    return () => {
      unsubUpdate();
      unsubOffer();
      unsubTaken();
      unsubSuspend();
    };
  }, [online, lang]);

  // ─── Polling when online ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!online) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    refreshRideList();
    pollRef.current = setInterval(refreshRideList, 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [online]);

  // ─── GPS tracking when online ─────────────────────────────────────────────
  useEffect(() => {
    if (!online || !driverId) return;
    let locationSub: Location.LocationSubscription | null = null;

    Location.requestForegroundPermissionsAsync()
      .then(({ status }) => {
        if (status !== 'granted') return;
        Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 50, timeInterval: 30_000 },
          (loc) => {
            if (driverId) {
              emitDriverLocation(driverId, loc.coords.latitude, loc.coords.longitude);
            }
          }
        ).then((sub) => { locationSub = sub; }).catch(() => null);
      })
      .catch(() => null);

    return () => { locationSub?.remove(); };
  }, [online, driverId]);

  // ─── Offer countdown ─────────────────────────────────────────────────────────
  function showOffer(incoming: RideOfferPayload) {
    // Don't stack offers; ignore if already viewing one
    if (offer) return;

    setOffer(incoming);
    setOfferCountdown(incoming.expiresIn ?? OFFER_TIMEOUT);
    progressAnim.setValue(1);

    Animated.timing(progressAnim, {
      toValue: 0,
      duration: (incoming.expiresIn ?? OFFER_TIMEOUT) * 1000,
      useNativeDriver: false,
    }).start();

    let remaining = incoming.expiresIn ?? OFFER_TIMEOUT;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setOfferCountdown(remaining);
      if (remaining <= 0) {
        clearCountdown();
        setOffer(null);
        // Auto-reject on timeout (fire-and-forget)
        if (incoming.rideId) rejectRide(incoming.rideId).catch(() => null);
      }
    }, 1000);
  }

  function clearCountdown() {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    progressAnim.stopAnimation();
  }

  // ─── Accept offer ─────────────────────────────────────────────────────────────
  async function acceptOffer() {
    if (!offer || offerLoading) return;
    setOfferLoading(true);
    clearCountdown();
    try {
      await updateRideStatus(offer.rideId, 'ACCEPTED');
      const accepted = offer;
      setOffer(null);
      setActiveRide({ id: accepted.rideId, ...accepted, status: 'ACCEPTED' });
      setRides([]);
    } catch {
      Alert.alert('Jnbk', lang === 'ar' ? 'تعذر قبول الرحلة — ربما قبلها سائق آخر' : 'Could not accept — another driver may have taken it');
      setOffer(null);
    } finally {
      setOfferLoading(false);
    }
  }

  // ─── Reject offer ─────────────────────────────────────────────────────────────
  async function rejectOffer() {
    if (!offer || offerLoading) return;
    setOfferLoading(true);
    clearCountdown();
    const rideId = offer.rideId;
    setOffer(null);
    try {
      const result = await rejectRide(rideId);
      if (result?.suspended) {
        setSuspendedUntil(result.suspendedUntil ? new Date(result.suspendedUntil) : null);
        setOnline(false);
      }
    } catch {
      // Rejection acknowledged — no action needed on error
    } finally {
      setOfferLoading(false);
    }
  }

  // ─── Active ride actions ──────────────────────────────────────────────────────
  async function handleStatus(ride: ActiveRide, status: string) {
    try {
      await updateRideStatus(ride.id, status);
    } catch {
      Alert.alert('Jnbk', lang === 'ar' ? 'تعذر تحديث حالة الرحلة' : 'Could not update ride status');
      return;
    }
    if (status === 'COMPLETED') {
      setActiveRide(null);
      if (userId) getWallet(userId).then((w) => setWalletBalance(w.balance)).catch(() => null);
    } else {
      setActiveRide({ ...ride, status });
    }
  }

  async function refreshRideList() {
    try {
      const data = await getRides();
      const list = (Array.isArray(data) ? data : data.rides ?? []) as ActiveRide[];
      setRides(list.filter((r) => ['REQUESTED', 'ACCEPTED', 'ARRIVING', 'ACTIVE'].includes(r.status ?? '')));
    } catch {
      // keep existing list on transient errors
    }
  }

  // ─── Toggle online ────────────────────────────────────────────────────────────
  async function toggle(val: boolean) {
    if (!driverId) {
      Alert.alert('Jnbk', lang === 'ar' ? 'لم يتم العثور على ملف السائق' : 'Driver profile not found');
      return;
    }
    if (suspendedUntil && suspendedUntil > new Date()) {
      const until = suspendedUntil.toLocaleTimeString('ar-SD', { hour: '2-digit', minute: '2-digit' });
      Alert.alert('Jnbk', lang === 'ar' ? `حسابك معلق حتى ${until}` : `Account suspended until ${until}`);
      return;
    }
    setOnline(val);
    if (!val) { setRides([]); setActiveRide(null); }
    if (!toggleLoading) {
      setToggleLoading(true);
      toggleDriverOnline(driverId, val)
        .catch(() => {
          setOnline(!val);
          Alert.alert('Jnbk', lang === 'ar' ? 'تعذر تغيير الحالة' : 'Could not update status');
        })
        .finally(() => setToggleLoading(false));
    }
  }

  const isSuspended = suspendedUntil !== null && suspendedUntil > new Date();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={[styles.header, rtl && styles.reverse]}>
        <Text style={[styles.title, rtl && styles.rtl]}>{t.driverDashboard}</Text>
        <View style={[styles.headerRight, rtl && styles.reverse]}>
          <Pressable onPress={() => router.push({ pathname: '/settings', params: { lang } })} style={styles.settingsBtn}>
            <Text style={styles.settingsBtnText}>{lang === 'ar' ? 'الإعدادات' : 'Settings'}</Text>
          </Pressable>
          <Pressable onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')} style={styles.langBtn}>
            <Text style={styles.langText}>{t.language}</Text>
          </Pressable>
        </View>
      </View>

      {/* Verification pending */}
      {isVerified === false && (
        <View style={styles.pendingBadge}>
          <Text style={[styles.pendingText, rtl && styles.rtl]}>
            {lang === 'ar'
              ? 'طلبك قيد المراجعة — ستتمكن من العمل بعد موافقة الإدارة'
              : 'Application under review — you can drive once admin approves'}
          </Text>
        </View>
      )}

      {/* Suspension badge */}
      {isSuspended && (
        <View style={styles.suspendedBadge}>
          <Text style={[styles.suspendedText, rtl && styles.rtl]}>
            {lang === 'ar'
              ? `⛔ حسابك معلق حتى ${suspendedUntil!.toLocaleString('ar-SD')} بسبب تجاوز حد الرفض اليومي`
              : `⛔ Account suspended until ${suspendedUntil!.toLocaleString('en-US')} due to excessive rejections`}
          </Text>
        </View>
      )}

      {/* Online toggle */}
      <View style={styles.card}>
        <Text style={styles.status}>{online ? t.online : t.offline}</Text>
        <Switch
          value={online}
          onValueChange={toggle}
          disabled={isVerified === false || toggleLoading || isSuspended}
        />
      </View>

      {/* Wallet earnings */}
      <Pressable
        style={[styles.earningsCard, rtl && styles.reverse]}
        onPress={() => router.push({ pathname: '/wallet', params: { lang, role: 'DRIVER' } })}
      >
        <View>
          <Text style={[styles.earningsLabel, rtl && styles.rtl]}>{t.walletEarnings}</Text>
          <Text style={styles.earningsAmount}>
            {walletBalance !== null ? walletBalance.toLocaleString('en') : '—'} SDG
          </Text>
        </View>
        <Text style={styles.earningsArrow}>{rtl ? '←' : '→'}</Text>
      </Pressable>

      {/* Active ride steps */}
      {activeRide && (
        <View style={styles.activeCard}>
          <Text style={[styles.activeTitle, rtl && styles.rtl]}>
            {lang === 'ar' ? 'رحلة جارية' : 'Active ride'}
          </Text>
          <Text style={[styles.route, rtl && styles.rtl]}>
            {activeRide.pickupLabel} → {activeRide.destinationLabel}
          </Text>
          <Text style={[styles.fare, rtl && styles.rtl]}>{activeRide.estimatedFare} SDG</Text>
          <View style={styles.actionRow}>
            {activeRide.status !== 'ARRIVING' && activeRide.status !== 'ACTIVE' && (
              <Button title={lang === 'ar' ? 'وصلت' : 'Arrived'} variant="gold" onPress={() => handleStatus(activeRide, 'ARRIVING')} />
            )}
            {activeRide.status === 'ARRIVING' && (
              <Button title={lang === 'ar' ? 'بدأ الرحلة' : 'Start ride'} variant="gold" onPress={() => handleStatus(activeRide, 'ACTIVE')} />
            )}
            {activeRide.status === 'ACTIVE' && (
              <Button title={lang === 'ar' ? 'أنهيت الرحلة' : 'Complete'} variant="gold" onPress={() => handleStatus(activeRide, 'COMPLETED')} />
            )}
          </View>
        </View>
      )}

      {/* Ride queue (while online and no active ride) */}
      {online && !activeRide && rides.length === 0 && (
        <View style={styles.waitingCard}>
          <Text style={[styles.waitingText, rtl && styles.rtl]}>
            {lang === 'ar' ? 'في انتظار طلبات جديدة...' : 'Waiting for ride requests...'}
          </Text>
        </View>
      )}

      {online && !activeRide && rides.map((ride) => (
        <View key={ride.id} style={styles.rideCard}>
          <Text style={[styles.route, rtl && styles.rtl]}>{ride.pickupLabel} → {ride.destinationLabel}</Text>
          <Text style={styles.muted}>{ride.distanceKm} km</Text>
          <Text style={styles.fare}>{ride.estimatedFare} SDG</Text>
          <Button title={t.acceptRide} variant="gold" onPress={() => handleStatus(ride, 'ACCEPTED').then(() => setActiveRide({ ...ride, status: 'ACCEPTED' })).catch(() => null)} />
        </View>
      ))}

      {/* ─── Incoming Offer Modal ─── */}
      <Modal
        visible={!!offer}
        transparent
        animationType="slide"
        onRequestClose={() => {/* prevent accidental close */}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {lang === 'ar' ? '🚗 طلب رحلة جديد' : '🚗 New Ride Request'}
            </Text>

            {/* Countdown progress bar */}
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.countdown}>
              {lang === 'ar' ? `ينتهي خلال ${offerCountdown}ث` : `Expires in ${offerCountdown}s`}
            </Text>

            {/* Route */}
            <View style={styles.routeBlock}>
              <View style={styles.routeRow}>
                <Text style={styles.routeDot}>🟢</Text>
                <Text style={styles.routeText}>{offer?.pickupLabel}</Text>
              </View>
              <View style={[styles.routeRow, { marginTop: 8 }]}>
                <Text style={styles.routeDot}>🔴</Text>
                <Text style={styles.routeText}>{offer?.destinationLabel}</Text>
              </View>
            </View>

            {/* Fare / distance */}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>{lang === 'ar' ? 'المسافة' : 'Distance'}</Text>
                <Text style={styles.metaValue}>{offer?.distanceKm} km</Text>
              </View>
              <View style={styles.metaSep} />
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>{lang === 'ar' ? 'الأجرة' : 'Fare'}</Text>
                <Text style={[styles.metaValue, { color: colors.gold }]}>{offer?.estimatedFare} SDG</Text>
              </View>
            </View>

            {/* Rejection warning */}
            <Text style={styles.warningText}>
              {lang === 'ar'
                ? '⚠️ الرفض يُحتسب ضمن حدك اليومي (2 رفض → تعليق)'
                : '⚠️ Rejection counts toward your daily limit (2 rejections → suspension)'}
            </Text>

            {/* Action buttons */}
            <View style={styles.modalButtons}>
              <Pressable style={[styles.btnReject, offerLoading && styles.btnDisabled]} onPress={rejectOffer} disabled={offerLoading}>
                <Text style={styles.btnRejectText}>{lang === 'ar' ? 'رفض' : 'Reject'}</Text>
              </Pressable>
              <Pressable style={[styles.btnAccept, offerLoading && styles.btnDisabled]} onPress={acceptOffer} disabled={offerLoading}>
                <Text style={styles.btnAcceptText}>{lang === 'ar' ? 'قبول' : 'Accept'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  reverse: { flexDirection: 'row-reverse' },
  title: { fontSize: 26, fontWeight: '900', color: colors.navy },
  settingsBtn: { backgroundColor: '#F1F5F9', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#DCE6EF' },
  settingsBtnText: { color: colors.navy, fontWeight: '900', fontSize: 13 },
  langBtn: { backgroundColor: colors.navy, padding: 10, borderRadius: 12 },
  langText: { color: colors.white },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },

  pendingBadge: { backgroundColor: '#FFF8E7', borderRadius: 20, padding: 14, borderWidth: 1.5, borderColor: colors.gold },
  pendingText: { color: '#7A5C00', fontWeight: '800', fontSize: 14, lineHeight: 21 },

  suspendedBadge: { backgroundColor: '#FEE2E2', borderRadius: 20, padding: 14, borderWidth: 1.5, borderColor: '#FCA5A5' },
  suspendedText: { color: '#991B1B', fontWeight: '800', fontSize: 13, lineHeight: 20 },

  card: { backgroundColor: colors.white, padding: 16, borderRadius: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  status: { fontWeight: '900', color: colors.navy, fontSize: 16 },

  earningsCard: { backgroundColor: colors.navy, borderRadius: 20, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  earningsLabel: { color: 'rgba(255,255,255,.75)', fontWeight: '800', fontSize: 13 },
  earningsAmount: { color: colors.gold, fontWeight: '900', fontSize: 26, marginTop: 2 },
  earningsArrow: { color: colors.gold, fontWeight: '900', fontSize: 20 },

  activeCard: { backgroundColor: colors.white, borderRadius: 24, padding: 18, gap: 10, borderWidth: 2, borderColor: colors.teal },
  activeTitle: { color: colors.teal, fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  actionRow: { gap: 8 },

  waitingCard: { backgroundColor: colors.white, borderRadius: 20, padding: 24, alignItems: 'center' },
  waitingText: { color: colors.muted, fontWeight: '800', fontSize: 15 },

  rideCard: { backgroundColor: colors.white, padding: 16, borderRadius: 20, gap: 8 },
  route: { fontWeight: '900', fontSize: 17, color: colors.navy },
  muted: { color: colors.muted },
  fare: { color: colors.gold, fontWeight: '900', fontSize: 22 },

  // ─── Offer modal ───────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, gap: 16 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: colors.navy, textAlign: 'center' },

  progressTrack: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 99, overflow: 'hidden' },
  progressBar: { height: 6, backgroundColor: colors.teal, borderRadius: 99 },
  countdown: { color: colors.muted, fontWeight: '800', fontSize: 13, textAlign: 'center' },

  routeBlock: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, gap: 4 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeDot: { fontSize: 14 },
  routeText: { color: colors.navy, fontWeight: '800', fontSize: 15, flex: 1 },

  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 0 },
  metaItem: { flex: 1, alignItems: 'center' },
  metaSep: { width: 1, height: 32, backgroundColor: '#E2E8F0' },
  metaLabel: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  metaValue: { color: colors.navy, fontWeight: '900', fontSize: 20, marginTop: 2 },

  warningText: { color: '#92400E', backgroundColor: '#FFFBEB', borderRadius: 10, padding: 10, fontWeight: '700', fontSize: 12, textAlign: 'center' },

  modalButtons: { flexDirection: 'row', gap: 12 },
  btnReject: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#CBD5E1' },
  btnRejectText: { color: '#64748B', fontWeight: '900', fontSize: 16 },
  btnAccept: { flex: 2, backgroundColor: colors.teal, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  btnAcceptText: { color: colors.white, fontWeight: '900', fontSize: 18 },
  btnDisabled: { opacity: 0.5 },
});
