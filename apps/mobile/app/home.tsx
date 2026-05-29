import React, { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet, Pressable, View, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../src/components/Button';
import { BrandLogo } from '../src/components/BrandLogo';
import { brand, colors } from '../src/constants/theme';
import { dict, Lang } from '../src/i18n';
import { cities as fallbackCities, vehicleTypes as fallbackVehicleTypes, serviceModes, estimateFare, City, VehicleType } from '../src/serviceConfig';
import { createRide, estimatePrice, getAppConfig } from '../src/api';
import LocationPicker, { LocationItem } from '../src/components/LocationPicker';
import { sw } from '../src/constants/responsive';

function normalizeCity(item: any): City {
  const zones = Array.isArray(item.zones) ? item.zones : [];
  return {
    id: item.id,
    countryId: item.countryId || 'sd',
    nameAr: item.nameAr || item.nameEn || item.id,
    nameEn: item.nameEn || item.nameAr || item.id,
    zonesAr: item.zonesAr || zones.map((z: any) => z.nameAr).filter(Boolean) || item.zonesEn || ['السوق', 'المستشفى'],
    zonesEn: item.zonesEn || zones.map((z: any) => z.nameEn).filter(Boolean) || item.zonesAr || ['Market', 'Hospital']
  };
}

function normalizeVehicle(item: any): VehicleType {
  return {
    id: item.id,
    nameAr: item.nameAr || item.nameEn || item.id,
    nameEn: item.nameEn || item.nameAr || item.id,
    baseFare: Number(item.baseFare || 0),
    perKmFare: Number(item.perKmFare || 0),
    minimumFare: Number(item.minimumFare || 0),
    icon: item.icon || String(item.nameEn || item.id || 'V').slice(0, 1).toUpperCase()
  };
}

export default function Home() {
  const params = useLocalSearchParams<{ lang?: Lang }>();
  const [lang, setLang] = useState<Lang>(params.lang === 'en' ? 'en' : 'ar');
  const [appCities, setAppCities] = useState<City[]>(fallbackCities);
  const [appVehicles, setAppVehicles] = useState<VehicleType[]>(fallbackVehicleTypes);
  const [source, setSource] = useState<'api' | 'preview'>('preview');
  const [cityIndex, setCityIndex] = useState(0);
  const [vehicleIndex, setVehicleIndex] = useState(0);
  const [serviceIndex, setServiceIndex] = useState(0);
  const [pickupIndex, setPickupIndex] = useState(0);
  const [destinationIndex, setDestinationIndex] = useState(1);
  const [fareOverride, setFareOverride] = useState<number | null>(null);
  const [showPickupPicker, setShowPickupPicker] = useState(false);
  const [showDestinationPicker, setShowDestinationPicker] = useState(false);
  const [cityZoneItems, setCityZoneItems] = useState<LocationItem[]>([]);
  const [allCityZones, setAllCityZones] = useState<Record<string, LocationItem[]>>({});
  const [loading, setLoading] = useState(false);
  // Multi-stop open ride state
  const [openStops, setOpenStops] = useState<string[]>(['', '']);
  const [activeOpenStopIdx, setActiveOpenStopIdx] = useState<number | null>(null);

  const t = dict[lang];
  const city = appCities[cityIndex] || fallbackCities[0];
  const vehicle = appVehicles[vehicleIndex] || fallbackVehicleTypes[0];
  const mode = serviceModes[serviceIndex];
  const isOpenRide = mode.isMultiStop === true;
  const maxStops = mode.maxStops ?? 5;
  const zones = lang === 'ar' ? city.zonesAr : city.zonesEn;
  const safeZones = zones.length ? zones : (lang === 'ar' ? ['السوق', 'المستشفى'] : ['Market', 'Hospital']);

  // Use rich zone items with categories when available, fall back to plain list
  const locationItems: LocationItem[] = cityZoneItems.length > 0
    ? cityZoneItems
    : safeZones.map((name, i) => ({ id: String(i), name }));

  const distanceKm = pickupIndex === destinationIndex ? 1 : Math.max(2, Math.abs(destinationIndex - pickupIndex) + 1);
  const filledStops = openStops.filter(Boolean);
  const openRideDistanceKm = Math.max(filledStops.length * 2.5, 2);
  const localFare = isOpenRide
    ? estimateFare(openRideDistanceKm, vehicle, mode.fareMultiplier)
    : estimateFare(distanceKm, vehicle, mode.fareMultiplier);
  const fare = fareOverride !== null ? Math.round(fareOverride * mode.fareMultiplier) : localFare;
  const pickup = safeZones[pickupIndex] || safeZones[0];
  const destination = safeZones[destinationIndex] || safeZones[1] || safeZones[0];
  const cityName = lang === 'ar' ? city.nameAr : city.nameEn;
  const vehicleName = lang === 'ar' ? vehicle.nameAr : vehicle.nameEn;
  const modeName = lang === 'ar' ? mode.nameAr : mode.nameEn;
  const rtl = lang === 'ar';

  useEffect(() => {
    getAppConfig()
      .then((config) => {
        const nextCities = Array.isArray(config.cities) && config.cities.length ? config.cities.map(normalizeCity) : fallbackCities;
        const nextVehicles = Array.isArray(config.vehicleTypes) && config.vehicleTypes.length ? config.vehicleTypes.map(normalizeVehicle) : fallbackVehicleTypes;
        setAppCities(nextCities);
        setAppVehicles(nextVehicles);
        setSource('api');
        // Build a zones map for all cities so city-change works correctly
        const zonesMap: Record<string, LocationItem[]> = {};
        if (Array.isArray(config.cities)) {
          config.cities.forEach((c: any) => {
            if (Array.isArray(c.zones) && c.zones.length) {
              zonesMap[c.id] = c.zones.map((z: any, i: number) => ({
                id: String(z.id || i),
                name: z.nameAr || z.nameEn || String(i),
                category: z.category || undefined,
              }));
            }
          });
        }
        setAllCityZones(zonesMap);
        const firstCity = Array.isArray(config.cities) ? config.cities[0] : null;
        if (firstCity && zonesMap[firstCity.id]) {
          setCityZoneItems(zonesMap[firstCity.id]);
        }
      })
      .catch(() => setSource('preview'));
  }, []);

  useEffect(() => {
    setFareOverride(null);
    estimatePrice({ cityId: city.id, vehicleTypeId: vehicle.id, distanceKm })
      .then((result) => setFareOverride(Number(result.estimatedFare || localFare)))
      .catch(() => setFareOverride(null));
  }, [city.id, vehicle.id, distanceKm]);

  function changeCity(index: number) {
    const newCity = appCities[index];
    setCityIndex(index);
    setPickupIndex(0);
    setDestinationIndex(1);
    setFareOverride(null);
    setOpenStops(['', '']);
    setCityZoneItems(newCity && allCityZones[newCity.id] ? allCityZones[newCity.id] : []);
  }

  function changeVehicle(index: number) {
    setVehicleIndex(index);
    setFareOverride(null);
  }

  function rideParams(extra: Record<string, string> = {}) {
    return { pickup, destination, fare: String(fare), lang, city: cityName, vehicle: vehicleName, serviceMode: modeName, cityId: city.id, vehicleTypeId: vehicle.id, distanceKm: String(distanceKm), ...extra };
  }

  async function requestRide() {
    if (mode.id === 'offline_sms') {
      Alert.alert('Jnbk', lang === 'ar' ? 'سيتم تجهيز طلب SMS عند ربط رقم السنتر وخدمة الرسائل.' : 'SMS request will be enabled after hotline and SMS provider setup.');
      router.push({ pathname: '/support', params: { lang } });
      return;
    }
    if (isOpenRide) {
      const filled = openStops.filter(Boolean);
      if (filled.length < 2) {
        Alert.alert('Jnbk', lang === 'ar' ? 'أضف توقفين على الأقل لبدء المشوار المفتوح' : 'Add at least 2 stops to start an open ride');
        return;
      }
    }
    setLoading(true);
    try {
      const ridePickup = isOpenRide ? (openStops[0] || pickup) : `${pickup} - ${modeName}`;
      const rideDest = isOpenRide ? (openStops[openStops.length - 1] || destination) : destination;
      const rideDistance = isOpenRide ? openRideDistanceKm : distanceKm;
      const rideStops = isOpenRide ? openStops.filter(Boolean) : undefined;
      const ride = await createRide({ cityId: city.id, vehicleTypeId: vehicle.id, pickupLabel: ridePickup, destinationLabel: rideDest, distanceKm: rideDistance, stops: rideStops });
      router.push({ pathname: '/ride', params: rideParams({ fare: String(ride.estimatedFare || fare), rideId: ride.id }) });
    } catch {
      Alert.alert('Jnbk', lang === 'ar' ? 'الخادم غير متصل الآن. سيتم تشغيل الرحلة كتجربة محلية.' : 'Backend is offline. Starting local preview ride.');
      router.push({ pathname: '/ride', params: rideParams() });
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <LinearGradient colors={brand.gradient} style={styles.heroCard}>
        <View style={[styles.header, rtl && styles.reverse]}>
          <View>
            <Text style={[styles.hello, rtl && styles.rtl]}>{brand.nameEn}</Text>
            <Text style={[styles.heroTitle, rtl && styles.rtl]}>{lang === 'ar' ? brand.productAr : brand.productEn}</Text>
          </View>
          <Pressable style={styles.langButton} onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
            <Text style={styles.langText}>{t.language}</Text>
          </Pressable>
        </View>
        <View style={styles.logoWrap}><BrandLogo size='sm' onDark showTagline={false} /></View>
        <Text style={[styles.heroPromise, rtl && styles.rtl]}>{lang === 'ar' ? brand.promiseAr : brand.promiseEn}</Text>
        <Text style={[styles.heroSub, rtl && styles.rtl]}>{lang === 'ar' ? brand.serviceAr : brand.serviceEn}</Text>
      </LinearGradient>

      <View style={[styles.quickRow, rtl && styles.reverse]}>
        <Pressable style={styles.quickCard} onPress={() => router.push({ pathname: '/settings', params: { lang } })}>
          <Text style={styles.quickIcon}>SET</Text>
          <Text style={[styles.quickText, rtl && styles.rtl]}>{t.settings}</Text>
        </Pressable>
        <Pressable style={styles.quickCard} onPress={() => router.push({ pathname: '/support', params: { lang } })}>
          <Text style={styles.quickIcon}>24/7</Text>
          <Text style={[styles.quickText, rtl && styles.rtl]}>{t.support}</Text>
        </Pressable>
      </View>

      <View style={styles.sourceCard}>
        <Text style={[styles.sourceText, rtl && styles.rtl]}>{source === 'api' ? (lang === 'ar' ? 'متصل بالخادم: المدن والأسعار من لوحة الإدارة' : 'Connected: cities and prices from admin') : (lang === 'ar' ? 'وضع المعاينة: بيانات محلية حتى ربط الخادم' : 'Preview mode: local data until backend is connected')}</Text>
      </View>

      <Text style={[styles.label, rtl && styles.rtl]}>{lang === 'ar' ? 'اختر نوع الطلب' : 'Choose request type'}</Text>
      <View style={styles.modeGrid}>
        {serviceModes.map((item, index) => (
          <Pressable key={item.id} onPress={() => { setServiceIndex(index); if (!item.isMultiStop) setOpenStops(['', '']); }} style={[styles.modeCard, serviceIndex === index && styles.modeActive]}>
            <Text style={[styles.modeIcon, serviceIndex === index && styles.activeText]}>{item.icon}</Text>
            <Text style={[styles.modeTitle, serviceIndex === index && styles.activeText, rtl && styles.rtl]}>{lang === 'ar' ? item.nameAr : item.nameEn}</Text>
            <Text style={[styles.modeDescription, serviceIndex === index && styles.activeDescription, rtl && styles.rtl]}>{lang === 'ar' ? item.descriptionAr : item.descriptionEn}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, rtl && styles.rtl]}>{lang === 'ar' ? 'المدينة' : 'City'}</Text>
      <View style={[styles.wrap, rtl && styles.reverseWrap]}>
        {appCities.map((item, index) => (
          <Pressable key={item.id} onPress={() => changeCity(index)} style={[styles.chip, cityIndex === index && styles.active]}>
            <Text style={[styles.chipText, cityIndex === index && styles.activeText]}>{lang === 'ar' ? item.nameAr : item.nameEn}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, rtl && styles.rtl]}>{lang === 'ar' ? 'نوع المركبة' : 'Vehicle type'}</Text>
      <View style={[styles.wrap, rtl && styles.reverseWrap]}>
        {appVehicles.map((item, index) => (
          <Pressable key={item.id} onPress={() => changeVehicle(index)} style={[styles.serviceChip, vehicleIndex === index && styles.active]}>
            <Text style={[styles.serviceIcon, vehicleIndex === index && styles.activeText]}>{item.icon}</Text>
            <Text style={[styles.chipText, vehicleIndex === index && styles.activeText]}>{lang === 'ar' ? item.nameAr : item.nameEn}</Text>
          </Pressable>
        ))}
      </View>

      {isOpenRide ? (
        /* ── Open Ride: multi-stop builder ─────────────────────────────── */
        <View style={styles.openRideCard}>
          <View style={[styles.openRideHeader, rtl && styles.reverse]}>
            <View>
              <Text style={[styles.mapTitle, rtl && styles.rtl]}>{lang === 'ar' ? 'مشوار مفتوح' : 'Open Ride'}</Text>
              <Text style={[styles.mapSub, rtl && styles.rtl]}>{cityName} · {vehicleName}</Text>
            </View>
            <View style={styles.stopBadge}>
              <Text style={styles.stopBadgeText}>{filledStops.length}/{maxStops}</Text>
            </View>
          </View>

          {openStops.map((stop, idx) => (
            <View key={idx} style={[styles.stopRow, rtl && styles.reverse]}>
              <View style={styles.stopDotWrap}>
                <View style={[styles.stopDot, idx === 0 && styles.stopDotFirst, idx === openStops.length - 1 && styles.stopDotLast]} />
                {idx < openStops.length - 1 && <View style={styles.stopConnector} />}
              </View>
              <Pressable
                style={[styles.stopButton, rtl && styles.rowRev]}
                onPress={() => setActiveOpenStopIdx(idx)}
              >
                <View style={styles.pickerContent}>
                  <Text style={[styles.stopLabel, rtl && styles.rtl]}>
                    {idx === 0
                      ? (lang === 'ar' ? 'نقطة الانطلاق' : 'Pickup')
                      : idx === openStops.length - 1
                      ? (lang === 'ar' ? 'الوجهة الأخيرة' : 'Final stop')
                      : (lang === 'ar' ? `توقف ${idx + 1}` : `Stop ${idx + 1}`)}
                  </Text>
                  <Text style={[styles.stopValue, rtl && styles.rtl]}>
                    {stop || (lang === 'ar' ? 'اضغط للاختيار' : 'Tap to select')}
                  </Text>
                </View>
                {idx >= 2 && (
                  <Pressable
                    hitSlop={12}
                    onPress={() => {
                      const next = openStops.filter((_, i) => i !== idx);
                      setOpenStops(next);
                    }}
                    style={styles.removeStop}
                  >
                    <Text style={styles.removeStopText}>✕</Text>
                  </Pressable>
                )}
              </Pressable>
            </View>
          ))}

          {openStops.length < maxStops && (
            <Pressable
              style={[styles.addStopBtn, rtl && styles.rowRev]}
              onPress={() => setOpenStops([...openStops, ''])}
            >
              <Text style={styles.addStopIcon}>＋</Text>
              <Text style={styles.addStopText}>
                {lang === 'ar' ? 'أضف توقفًا' : 'Add stop'}
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        /* ── Standard: single pickup + destination ─────────────────────── */
        <>
          <View style={styles.mapCard}>
            <View style={[styles.mapHeader, rtl && styles.reverse]}>
              <View>
                <Text style={[styles.mapTitle, rtl && styles.rtl]}>{cityName}</Text>
                <Text style={[styles.mapSub, rtl && styles.rtl]}>{modeName} - {vehicleName}</Text>
              </View>
              <View style={styles.etaBadge}><Text style={styles.etaText}>{distanceKm + 3} min</Text></View>
            </View>
            <View style={styles.routeLine}><View style={styles.pin} /><View style={styles.line} /><View style={[styles.pin, styles.pinGold]} /></View>
            <View style={styles.routeCards}>
              <View style={styles.routeCard}><Text style={styles.routeLabel}>{t.pickup}</Text><Text style={[styles.routeValue, rtl && styles.rtl]}>{pickup}</Text></View>
              <View style={styles.routeCard}><Text style={styles.routeLabel}>{t.destination}</Text><Text style={[styles.routeValue, rtl && styles.rtl]}>{destination}</Text></View>
            </View>
          </View>

          <Text style={[styles.label, rtl && styles.rtl]}>{t.pickup}</Text>
          <Pressable style={[styles.pickerButton, rtl && styles.rowRev]} onPress={() => setShowPickupPicker(true)}>
            <Text style={styles.pickerIcon}>📍</Text>
            <View style={styles.pickerContent}>
              <Text style={[styles.pickerValue, rtl && styles.rtl]}>{pickup}</Text>
              <Text style={[styles.pickerHint, rtl && styles.rtl]}>{lang === 'ar' ? 'اضغط للتغيير' : 'Tap to change'}</Text>
            </View>
            <Text style={styles.pickerArrow}>{rtl ? '←' : '→'}</Text>
          </Pressable>

          <Text style={[styles.label, rtl && styles.rtl]}>{t.destination}</Text>
          <Pressable style={[styles.pickerButton, styles.pickerButtonGold, rtl && styles.rowRev]} onPress={() => setShowDestinationPicker(true)}>
            <Text style={styles.pickerIcon}>🎯</Text>
            <View style={styles.pickerContent}>
              <Text style={[styles.pickerValue, rtl && styles.rtl]}>{destination}</Text>
              <Text style={[styles.pickerHint, rtl && styles.rtl]}>{lang === 'ar' ? 'اضغط للتغيير' : 'Tap to change'}</Text>
            </View>
            <Text style={styles.pickerArrow}>{rtl ? '←' : '→'}</Text>
          </Pressable>
        </>
      )}

      {/* Pickup modal (standard mode) */}
      <LocationPicker
        visible={showPickupPicker}
        title={lang === 'ar' ? 'اختر نقطة الانطلاق' : 'Select Pickup'}
        items={locationItems}
        selected={pickup}
        lang={lang}
        onSelect={(name) => {
          const idx = locationItems.findIndex((item) => item.name === name);
          if (idx >= 0) { setPickupIndex(idx); setFareOverride(null); }
        }}
        onClose={() => setShowPickupPicker(false)}
      />

      {/* Destination modal (standard mode) */}
      <LocationPicker
        visible={showDestinationPicker}
        title={lang === 'ar' ? 'اختر الوجهة' : 'Select Destination'}
        items={locationItems}
        selected={destination}
        lang={lang}
        onSelect={(name) => {
          const idx = locationItems.findIndex((item) => item.name === name);
          if (idx >= 0) { setDestinationIndex(idx); setFareOverride(null); }
        }}
        onClose={() => setShowDestinationPicker(false)}
      />

      {/* Open ride stop picker modal */}
      <LocationPicker
        visible={activeOpenStopIdx !== null}
        title={
          activeOpenStopIdx === 0
            ? (lang === 'ar' ? 'اختر نقطة الانطلاق' : 'Select Pickup')
            : activeOpenStopIdx === openStops.length - 1
            ? (lang === 'ar' ? 'اختر الوجهة الأخيرة' : 'Select Final Stop')
            : (lang === 'ar' ? `اختر التوقف ${(activeOpenStopIdx ?? 0) + 1}` : `Select Stop ${(activeOpenStopIdx ?? 0) + 1}`)
        }
        items={locationItems}
        selected={activeOpenStopIdx !== null ? openStops[activeOpenStopIdx] : ''}
        lang={lang}
        onSelect={(name) => {
          if (activeOpenStopIdx === null) return;
          const next = [...openStops];
          next[activeOpenStopIdx] = name;
          setOpenStops(next);
          setActiveOpenStopIdx(null);
        }}
        onClose={() => setActiveOpenStopIdx(null)}
      />

      <View style={styles.fareCard}>
        <Text style={[styles.fareLabel, rtl && styles.rtl]}>{t.estimatedFare}</Text>
        <Text style={[styles.fare, rtl && styles.rtl]}>{fare} {city.countryId === 'sa' ? 'SAR' : 'SDG'}</Text>
        {isOpenRide ? (
          <Text style={[styles.note, rtl && styles.rtl]}>
            {lang === 'ar'
              ? `${filledStops.length} ${filledStops.length === 1 ? 'توقف' : 'توقفات'} · دفعة واحدة للمشوار كاملاً`
              : `${filledStops.length} stop${filledStops.length !== 1 ? 's' : ''} · Single payment for the full trip`}
          </Text>
        ) : (
          <Text style={[styles.note, rtl && styles.rtl]}>{lang === 'ar' ? 'يشمل نوع الطلب والمسافة المحلية. الأسعار قابلة للضبط من الإدارة حسب الوقود.' : 'Includes service mode and local distance. Admin can adjust pricing based on fuel.'}</Text>
        )}
      </View>
      <Button title={loading ? (lang === 'ar' ? 'جاري الطلب...' : 'Requesting...') : t.requestRickshaw} onPress={requestRide} />
      <Button title={t.tripHistory} variant='ghost' onPress={() => router.push({ pathname: '/trips', params: { lang } })} />
      <Button title={t.support} variant='ghost' onPress={() => router.push({ pathname: '/support', params: { lang } })} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: sw(20), paddingTop: sw(50), gap: sw(12) },
  heroCard: { borderRadius: 34, padding: sw(18), gap: sw(10), overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reverse: { flexDirection: 'row-reverse' },
  hello: { color: colors.gold, fontWeight: '900', letterSpacing: 2 },
  heroTitle: { fontSize: sw(26), fontWeight: '900', color: colors.white },
  heroPromise: { color: colors.gold, fontWeight: '900', fontSize: sw(18), textAlign: 'center' },
  heroSub: { color: 'rgba(255,255,255,.82)', fontWeight: '800', textAlign: 'center', lineHeight: 22, fontSize: sw(13) },
  logoWrap: { alignItems: 'center', paddingTop: 2 },
  langButton: { borderRadius: 18, backgroundColor: 'rgba(255,255,255,.14)', paddingVertical: 10, paddingHorizontal: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,.18)' },
  langText: { color: colors.white, fontWeight: '900', fontSize: sw(13) },
  quickRow: { flexDirection: 'row', gap: 10 },
  quickCard: { flex: 1, backgroundColor: colors.white, borderRadius: 24, padding: sw(13), borderWidth: 1, borderColor: colors.border },
  quickIcon: { color: colors.gold, fontSize: sw(13), fontWeight: '900', letterSpacing: 1 },
  quickText: { color: colors.navy, fontWeight: '900', marginTop: 5, fontSize: sw(13) },
  sourceCard: { backgroundColor: '#E7F7EF', borderRadius: 20, padding: 12 },
  sourceText: { color: colors.teal, fontWeight: '900', fontSize: sw(13) },
  modeGrid: { gap: 8 },
  modeCard: { backgroundColor: colors.white, borderRadius: 24, padding: sw(14), borderWidth: 1, borderColor: colors.border },
  modeActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  modeIcon: { color: colors.gold, fontSize: sw(20), fontWeight: '900' },
  modeTitle: { color: colors.navy, fontSize: sw(15), fontWeight: '900', marginTop: 3 },
  modeDescription: { color: colors.muted, marginTop: 3, lineHeight: 20, fontWeight: '700', fontSize: sw(13) },
  activeDescription: { color: 'rgba(255,255,255,.76)' },
  mapCard: { borderRadius: 32, padding: sw(16), gap: sw(12), backgroundColor: colors.sky, borderWidth: 1, borderColor: colors.border },
  mapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  mapTitle: { color: colors.navy, fontSize: sw(22), fontWeight: '900' },
  mapSub: { color: colors.teal, fontSize: sw(13), fontWeight: '900', marginTop: 3 },
  etaBadge: { backgroundColor: colors.white, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border },
  etaText: { color: colors.gold, fontWeight: '900', fontSize: sw(13) },
  routeLine: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  pin: { width: sw(16), height: sw(16), borderRadius: 9, backgroundColor: colors.teal },
  pinGold: { backgroundColor: colors.gold },
  line: { flex: 1, height: 4, backgroundColor: colors.white, marginHorizontal: 8, borderRadius: 999 },
  routeCards: { gap: 8 },
  routeCard: { backgroundColor: colors.white, borderRadius: 16, padding: sw(12), borderWidth: 1, borderColor: colors.border },
  routeLabel: { color: colors.muted, fontWeight: '800', fontSize: sw(12) },
  routeValue: { color: colors.navy, fontWeight: '900', marginTop: 3, fontSize: sw(14) },
  label: { color: colors.text, fontWeight: '900', fontSize: sw(15), marginTop: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  reverseWrap: { flexDirection: 'row-reverse' },
  chip: { paddingVertical: 10, paddingHorizontal: 13, borderRadius: 999, backgroundColor: '#E7EEF5' },
  serviceChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 13, borderRadius: 999, backgroundColor: '#E7EEF5' },
  serviceIcon: { color: colors.gold, fontWeight: '900', fontSize: sw(14) },
  active: { backgroundColor: colors.navy },
  chipText: { color: colors.navy, fontWeight: '900', fontSize: sw(14) },
  activeText: { color: colors.white },
  fareCard: { backgroundColor: colors.white, borderRadius: 30, padding: sw(16), borderWidth: 1, borderColor: colors.border },
  fareLabel: { color: colors.muted, fontWeight: '800' },
  fare: { color: colors.gold, fontSize: sw(34), fontWeight: '900' },
  note: { color: colors.muted, marginTop: 4, fontSize: sw(13) },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  pickerButton: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.white, borderRadius: 22, padding: sw(14),
    borderWidth: 1.5, borderColor: colors.border,
    shadowColor: colors.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  pickerButtonGold: { borderColor: colors.gold, backgroundColor: '#FFFDF5' },
  rowRev: { flexDirection: 'row-reverse' },
  pickerIcon: { fontSize: sw(20) },
  pickerContent: { flex: 1 },
  pickerValue: { color: colors.navy, fontWeight: '900', fontSize: sw(15) },
  pickerHint: { color: colors.muted, fontWeight: '700', fontSize: sw(12), marginTop: 2 },
  pickerArrow: { color: colors.muted, fontSize: sw(16), fontWeight: '900' },
  // Open ride styles
  openRideCard: { borderRadius: 32, padding: sw(16), gap: sw(10), backgroundColor: '#EEF5FF', borderWidth: 1.5, borderColor: colors.navy },
  openRideHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 4 },
  stopBadge: { backgroundColor: colors.navy, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12 },
  stopBadgeText: { color: colors.gold, fontWeight: '900', fontSize: sw(13) },
  stopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stopDotWrap: { alignItems: 'center', width: sw(20), paddingTop: 14 },
  stopDot: { width: sw(12), height: sw(12), borderRadius: 99, backgroundColor: colors.teal, borderWidth: 2, borderColor: colors.white },
  stopDotFirst: { backgroundColor: colors.teal },
  stopDotLast: { backgroundColor: colors.gold },
  stopConnector: { width: 2, flex: 1, backgroundColor: '#C5D8F0', minHeight: sw(18) },
  stopButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.white, borderRadius: 18, padding: sw(12),
    borderWidth: 1, borderColor: colors.border,
  },
  stopLabel: { color: colors.muted, fontWeight: '800', fontSize: sw(11) },
  stopValue: { color: colors.navy, fontWeight: '900', fontSize: sw(14), marginTop: 2 },
  removeStop: { padding: 6, borderRadius: 99, backgroundColor: '#FDECEA' },
  removeStopText: { color: '#C0392B', fontWeight: '900', fontSize: sw(12) },
  addStopBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.navy, borderRadius: 18, paddingVertical: sw(11), paddingHorizontal: sw(14),
    alignSelf: 'flex-start', marginTop: 4,
  },
  addStopIcon: { color: colors.gold, fontWeight: '900', fontSize: sw(16) },
  addStopText: { color: colors.white, fontWeight: '900', fontSize: sw(14) },
});
