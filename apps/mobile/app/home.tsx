import React, { useState } from 'react';
import { ScrollView, Text, StyleSheet, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../src/components/Button';
import { colors } from '../src/constants/theme';
import { dict, Lang } from '../src/i18n';
import { cities, vehicleTypes, estimateFare } from '../src/serviceConfig';

export default function Home() {
  const params = useLocalSearchParams<{ lang?: Lang }>();
  const [lang, setLang] = useState<Lang>(params.lang === 'en' ? 'en' : 'ar');
  const [cityIndex, setCityIndex] = useState(0);
  const [vehicleIndex, setVehicleIndex] = useState(0);
  const [pickupIndex, setPickupIndex] = useState(0);
  const [destinationIndex, setDestinationIndex] = useState(1);
  const t = dict[lang];
  const city = cities[cityIndex];
  const vehicle = vehicleTypes[vehicleIndex];
  const zones = lang === 'ar' ? city.zonesAr : city.zonesEn;
  const fare = estimateFare(pickupIndex === destinationIndex ? 1 : 2, vehicle);
  const pickup = zones[pickupIndex] || zones[0];
  const destination = zones[destinationIndex] || zones[1];
  const cityName = lang === 'ar' ? city.nameAr : city.nameEn;
  const vehicleName = lang === 'ar' ? vehicle.nameAr : vehicle.nameEn;
  const rtl = lang === 'ar';

  function changeCity(index: number) {
    setCityIndex(index);
    setPickupIndex(0);
    setDestinationIndex(1);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={[styles.header, rtl && styles.reverse]}>
        <View>
          <Text style={[styles.hello, rtl && styles.rtl]}>{t.appNameEn}</Text>
          <Text style={[styles.title, rtl && styles.rtl]}>{t.whereTo}</Text>
        </View>
        <Pressable style={styles.langButton} onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
          <Text style={styles.langText}>{t.language}</Text>
        </Pressable>
      </View>

      <Text style={[styles.label, rtl && styles.rtl]}>{lang === 'ar' ? 'المدينة' : 'City'}</Text>
      <View style={[styles.wrap, rtl && styles.reverseWrap]}>
        {cities.map((item, index) => (
          <Pressable key={item.id} onPress={() => changeCity(index)} style={[styles.chip, cityIndex === index && styles.active]}>
            <Text style={[styles.chipText, cityIndex === index && styles.activeText]}>{lang === 'ar' ? item.nameAr : item.nameEn}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, rtl && styles.rtl]}>{lang === 'ar' ? 'نوع الخدمة' : 'Service type'}</Text>
      <View style={[styles.wrap, rtl && styles.reverseWrap]}>
        {vehicleTypes.map((item, index) => (
          <Pressable key={item.id} onPress={() => setVehicleIndex(index)} style={[styles.serviceChip, vehicleIndex === index && styles.active]}>
            <Text style={[styles.serviceIcon, vehicleIndex === index && styles.activeText]}>{item.icon}</Text>
            <Text style={[styles.chipText, vehicleIndex === index && styles.activeText]}>{lang === 'ar' ? item.nameAr : item.nameEn}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.mapCard}>
        <Text style={[styles.mapTitle, rtl && styles.rtl]}>{cityName}</Text>
        <Text style={[styles.mapSub, rtl && styles.rtl]}>{vehicleName} - {pickup} {t.to} {destination}</Text>
        <View style={styles.routeLine}>
          <View style={styles.pin} />
          <View style={styles.line} />
          <View style={[styles.pin, styles.pinGold]} />
        </View>
      </View>

      <Text style={[styles.label, rtl && styles.rtl]}>{t.pickup}</Text>
      <View style={[styles.wrap, rtl && styles.reverseWrap]}>
        {zones.slice(0, 5).map((z, index) => (
          <Pressable key={z} onPress={() => setPickupIndex(index)} style={[styles.chip, pickupIndex === index && styles.active]}>
            <Text style={[styles.chipText, pickupIndex === index && styles.activeText]}>{z}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, rtl && styles.rtl]}>{t.destination}</Text>
      <View style={[styles.wrap, rtl && styles.reverseWrap]}>
        {zones.map((z, index) => (
          <Pressable key={z} onPress={() => setDestinationIndex(index)} style={[styles.chip, destinationIndex === index && styles.active]}>
            <Text style={[styles.chipText, destinationIndex === index && styles.activeText]}>{z}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.fareCard}>
        <Text style={[styles.fareLabel, rtl && styles.rtl]}>{t.estimatedFare}</Text>
        <Text style={[styles.fare, rtl && styles.rtl]}>{fare} {city.countryId === 'sa' ? 'SAR' : 'SDG'}</Text>
        <Text style={[styles.note, rtl && styles.rtl]}>{t.fareNote}</Text>
      </View>
      <Button title={t.requestRickshaw} onPress={() => router.push({ pathname: '/ride', params: { pickup, destination, fare, lang, city: cityName, vehicle: vehicleName } })} />
      <Button title={t.tripHistory} variant='ghost' onPress={() => router.push({ pathname: '/trips', params: { lang } })} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 22, paddingTop: 58, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reverse: { flexDirection: 'row-reverse' },
  hello: { color: colors.gold, fontWeight: '900', letterSpacing: 2 },
  title: { fontSize: 30, fontWeight: '900', color: colors.navy },
  langButton: { borderRadius: 18, backgroundColor: colors.navy, paddingVertical: 11, paddingHorizontal: 14 },
  langText: { color: colors.white, fontWeight: '900' },
  mapCard: { height: 235, borderRadius: 30, padding: 22, justifyContent: 'space-between', backgroundColor: '#DDF3FA' },
  mapTitle: { color: colors.teal, fontSize: 28, fontWeight: '900' },
  mapSub: { color: colors.navy, fontSize: 16, fontWeight: '800' },
  routeLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  pin: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.teal },
  pinGold: { backgroundColor: colors.gold },
  line: { flex: 1, height: 4, backgroundColor: colors.white, marginHorizontal: 8, borderRadius: 999 },
  label: { color: colors.text, fontWeight: '900', fontSize: 16, marginTop: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  reverseWrap: { flexDirection: 'row-reverse' },
  chip: { paddingVertical: 11, paddingHorizontal: 15, borderRadius: 999, backgroundColor: '#E7EEF5' },
  serviceChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 15, borderRadius: 999, backgroundColor: '#E7EEF5' },
  serviceIcon: { color: colors.gold, fontWeight: '900' },
  active: { backgroundColor: colors.navy },
  chipText: { color: colors.navy, fontWeight: '900' },
  activeText: { color: colors.white },
  fareCard: { backgroundColor: colors.white, borderRadius: 28, padding: 18 },
  fareLabel: { color: colors.muted, fontWeight: '800' },
  fare: { color: colors.gold, fontSize: 38, fontWeight: '900' },
  note: { color: colors.muted, marginTop: 4 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' }
});
