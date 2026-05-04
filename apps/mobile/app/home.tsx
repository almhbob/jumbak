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
  const [loading, setLoading] = useState(false);
  const t = dict[lang];
  const city = appCities[cityIndex] || fallbackCities[0];
  const vehicle = appVehicles[vehicleIndex] || fallbackVehicleTypes[0];
  const mode = serviceModes[serviceIndex];
  const zones = lang === 'ar' ? city.zonesAr : city.zonesEn;
  const safeZones = zones.length ? zones : (lang === 'ar' ? ['السوق', 'المستشفى'] : ['Market', 'Hospital']);
  const distanceKm = pickupIndex === destinationIndex ? 1 : Math.max(2, Math.abs(destinationIndex - pickupIndex) + 1);
  const localFare = estimateFare(distanceKm, vehicle, mode.fareMultiplier);
  const fare = fareOverride ? Math.round(fareOverride * mode.fareMultiplier) : localFare;
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
    setCityIndex(index);
    setPickupIndex(0);
    setDestinationIndex(1);
    setFareOverride(null);
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
    setLoading(true);
    try {
      const ride = await createRide({ cityId: city.id, vehicleTypeId: vehicle.id, pickupLabel: `${pickup} - ${modeName}`, destinationLabel: destination, distanceKm });
      router.push({ pathname: '/ride', params: rideParams({ fare: String(ride.estimatedFare || fare), rideId: ride.id }) });
    } catch (error) {
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
          <Pressable key={item.id} onPress={() => setServiceIndex(index)} style={[styles.modeCard, serviceIndex === index && styles.modeActive]}>
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
      <View style={[styles.wrap, rtl && styles.reverseWrap]}>
        {safeZones.slice(0, 10).map((z, index) => (
          <Pressable key={`${z}-${index}`} onPress={() => setPickupIndex(index)} style={[styles.chip, pickupIndex === index && styles.active]}>
            <Text style={[styles.chipText, pickupIndex === index && styles.activeText]}>{z}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, rtl && styles.rtl]}>{t.destination}</Text>
      <View style={[styles.wrap, rtl && styles.reverseWrap]}>
        {safeZones.map((z, index) => (
          <Pressable key={`${z}-${index}`} onPress={() => setDestinationIndex(index)} style={[styles.chip, destinationIndex === index && styles.active]}>
            <Text style={[styles.chipText, destinationIndex === index && styles.activeText]}>{z}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.fareCard}>
        <Text style={[styles.fareLabel, rtl && styles.rtl]}>{t.estimatedFare}</Text>
        <Text style={[styles.fare, rtl && styles.rtl]}>{fare} {city.countryId === 'sa' ? 'SAR' : 'SDG'}</Text>
        <Text style={[styles.note, rtl && styles.rtl]}>{lang === 'ar' ? 'يشمل نوع الطلب والمسافة المحلية. الأسعار قابلة للضبط من الإدارة حسب الوقود.' : 'Includes service mode and local distance. Admin can adjust pricing based on fuel.'}</Text>
      </View>
      <Button title={loading ? (lang === 'ar' ? 'جاري الطلب...' : 'Requesting...') : t.requestRickshaw} onPress={requestRide} />
      <Button title={t.tripHistory} variant='ghost' onPress={() => router.push({ pathname: '/trips', params: { lang } })} />
      <Button title={t.support} variant='ghost' onPress={() => router.push({ pathname: '/support', params: { lang } })} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 22, paddingTop: 54, gap: 14 },
  heroCard: { borderRadius: 34, padding: 20, gap: 12, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reverse: { flexDirection: 'row-reverse' },
  hello: { color: colors.gold, fontWeight: '900', letterSpacing: 2 },
  heroTitle: { fontSize: 32, fontWeight: '900', color: colors.white },
  heroPromise: { color: colors.gold, fontWeight: '900', fontSize: 20, textAlign: 'center' },
  heroSub: { color: 'rgba(255,255,255,.82)', fontWeight: '800', textAlign: 'center', lineHeight: 22 },
  logoWrap: { alignItems: 'center', paddingTop: 2 },
  langButton: { borderRadius: 18, backgroundColor: 'rgba(255,255,255,.14)', paddingVertical: 11, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,.18)' },
  langText: { color: colors.white, fontWeight: '900' },
  quickRow: { flexDirection: 'row', gap: 12 },
  quickCard: { flex: 1, backgroundColor: colors.white, borderRadius: 24, padding: 15, borderWidth: 1, borderColor: colors.border },
  quickIcon: { color: colors.gold, fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  quickText: { color: colors.navy, fontWeight: '900', marginTop: 6 },
  sourceCard: { backgroundColor: '#E7F7EF', borderRadius: 20, padding: 12 },
  sourceText: { color: colors.teal, fontWeight: '900' },
  modeGrid: { gap: 10 },
  modeCard: { backgroundColor: colors.white, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: colors.border },
  modeActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  modeIcon: { color: colors.gold, fontSize: 22, fontWeight: '900' },
  modeTitle: { color: colors.navy, fontSize: 17, fontWeight: '900', marginTop: 4 },
  modeDescription: { color: colors.muted, marginTop: 4, lineHeight: 20, fontWeight: '700' },
  activeDescription: { color: 'rgba(255,255,255,.76)' },
  mapCard: { borderRadius: 32, padding: 20, gap: 16, backgroundColor: colors.sky, borderWidth: 1, borderColor: colors.border },
  mapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  mapTitle: { color: colors.navy, fontSize: 28, fontWeight: '900' },
  mapSub: { color: colors.teal, fontSize: 15, fontWeight: '900', marginTop: 3 },
  etaBadge: { backgroundColor: colors.white, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border },
  etaText: { color: colors.gold, fontWeight: '900' },
  routeLine: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  pin: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.teal },
  pinGold: { backgroundColor: colors.gold },
  line: { flex: 1, height: 5, backgroundColor: colors.white, marginHorizontal: 8, borderRadius: 999 },
  routeCards: { gap: 10 },
  routeCard: { backgroundColor: colors.white, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.border },
  routeLabel: { color: colors.muted, fontWeight: '800' },
  routeValue: { color: colors.navy, fontWeight: '900', marginTop: 4 },
  label: { color: colors.text, fontWeight: '900', fontSize: 16, marginTop: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  reverseWrap: { flexDirection: 'row-reverse' },
  chip: { paddingVertical: 11, paddingHorizontal: 15, borderRadius: 999, backgroundColor: '#E7EEF5' },
  serviceChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 15, borderRadius: 999, backgroundColor: '#E7EEF5' },
  serviceIcon: { color: colors.gold, fontWeight: '900' },
  active: { backgroundColor: colors.navy },
  chipText: { color: colors.navy, fontWeight: '900' },
  activeText: { color: colors.white },
  fareCard: { backgroundColor: colors.white, borderRadius: 30, padding: 18, borderWidth: 1, borderColor: colors.border },
  fareLabel: { color: colors.muted, fontWeight: '800' },
  fare: { color: colors.gold, fontSize: 38, fontWeight: '900' },
  note: { color: colors.muted, marginTop: 4 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' }
});
