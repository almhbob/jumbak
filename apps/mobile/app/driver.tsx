import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, Pressable, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Button } from '../src/components/Button';
import { colors } from '../src/constants/theme';
import { dict, Lang } from '../src/i18n';
import { getRides, updateRideStatus } from '../src/api';

type Ride={id:string;pickupLabel?:string;destinationLabel?:string;estimatedFare?:number;distanceKm?:number;status?:string;cityName?:string;vehicleName?:string};
const previewRide:Ride={id:'preview_ride',pickupLabel:'Market',destinationLabel:'Hospital',estimatedFare:1200,distanceKm:2,status:'REQUESTED',cityName:'Rufaa',vehicleName:'Rickshaw'};

export default function Driver() {
  const params = useLocalSearchParams<{ lang?: Lang }>();
  const [lang, setLang] = useState<Lang>(params.lang === 'en' ? 'en' : 'ar');
  const [online, setOnline] = useState(false);
  const [rides,setRides]=useState<Ride[]>([]);
  const [activeRide,setActiveRide]=useState<Ride|null>(null);
  const [source,setSource]=useState<'api'|'preview'>('preview');
  const [loading,setLoading]=useState(false);
  const t = dict[lang];
  const rtl = lang === 'ar';

  async function loadRides(){
    if(!online){setRides([]);return}
    setLoading(true);
    try{const data=await getRides();const open=(Array.isArray(data)?data:[]).filter((r:Ride)=>['REQUESTED','ACCEPTED','ARRIVING','ACTIVE'].includes(String(r.status||'REQUESTED')));setRides(open.length?open:[previewRide]);setSource('api')}
    catch{setRides([previewRide]);setSource('preview')}
    finally{setLoading(false)}
  }
  useEffect(()=>{loadRides()},[online]);
  function toggle(value: boolean) {setOnline(value);setActiveRide(null);if(!value)setRides([])}
  async function setStatus(ride:Ride,status:string){
    if(ride.id==='preview_ride'){const next={...ride,status};setActiveRide(next);setRides(rides.filter(r=>r.id!==ride.id));return}
    try{const updated=await updateRideStatus(ride.id,status);setActiveRide(updated);setRides(rides.filter(r=>r.id!==ride.id))}
    catch{Alert.alert('JUMBAK',lang==='ar'?'تعذر تحديث الرحلة من الخادم':'Could not update ride on backend')}
  }
  const current=activeRide;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={[styles.header, rtl && styles.reverse]}>
        <Text style={[styles.title, rtl && styles.rtl]}>{t.driverDashboard}</Text>
        <Pressable style={styles.langButton} onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')}><Text style={styles.langText}>{t.language}</Text></Pressable>
      </View>
      <View style={styles.profileCard}>
        <View style={[styles.profileTop, rtl && styles.reverse]}>
          <View style={styles.avatar}><Text style={styles.avatarText}>J</Text></View>
          <View style={styles.profileInfo}><Text style={[styles.name, rtl && styles.rtl]}>{lang === 'ar' ? 'سائق جنبك' : 'Jnbk Driver'}</Text><Text style={[styles.muted, rtl && styles.rtl]}>{source==='api'?(lang==='ar'?'متصل بالخادم':'Connected to backend'):(lang==='ar'?'وضع معاينة':'Preview mode')}</Text></View>
        </View>
        <View style={[styles.badges, rtl && styles.reverseWrap]}><Text style={styles.badge}>{lang === 'ar' ? 'تقييم 4.8' : 'Rating 4.8'}</Text><Text style={styles.badge}>{online?t.online:t.offline}</Text><Text style={styles.badge}>{source.toUpperCase()}</Text></View>
      </View>
      <View style={[styles.switchRow, rtl && styles.reverse]}>
        <View><Text style={styles.switchText}>{online ? t.online : t.offline}</Text><Text style={[styles.muted, rtl && styles.rtl]}>{online ? (lang === 'ar' ? 'جاهز لاستقبال الطلبات' : 'Ready to receive trips') : (lang === 'ar' ? 'لن تصلك طلبات الآن' : 'You will not receive requests now')}</Text></View>
        <Switch value={online} onValueChange={toggle} />
      </View>
      {online&&!current&&<View style={styles.request}><Text style={[styles.section, rtl && styles.rtl]}>{loading?(lang==='ar'?'جاري تحميل الطلبات...':'Loading requests...'):t.newRide}</Text>{rides.map(ride=><View key={ride.id} style={styles.rideCard}><Text style={[styles.route, rtl && styles.rtl]}>{ride.pickupLabel||'Pickup'} {t.to} {ride.destinationLabel||'Destination'}</Text><Text style={[styles.muted, rtl && styles.rtl]}>{lang==='ar'?'المسافة التقريبية':'Estimated distance'} {ride.distanceKm||2} km</Text><Text style={[styles.fare, rtl && styles.rtl]}>{ride.estimatedFare||1200} SDG</Text><Button title={t.acceptRide} variant='gold' onPress={()=>setStatus(ride,'ACCEPTED')} /><Button title={t.reject} variant='ghost' onPress={()=>setRides(rides.filter(r=>r.id!==ride.id))} /></View>)}<Button title={lang==='ar'?'تحديث الطلبات':'Refresh requests'} variant='ghost' onPress={loadRides}/></View>}
      {current && <View style={styles.activeTrip}><Text style={[styles.section, rtl && styles.rtl]}>{lang === 'ar' ? 'رحلة نشطة' : 'Active trip'}</Text><Text style={[styles.route, rtl && styles.rtl]}>{current.pickupLabel||'Pickup'} {t.to} {current.destinationLabel||'Destination'}</Text><Text style={[styles.muted, rtl && styles.rtl]}>{lang === 'ar' ? 'حدّث حالة الرحلة حسب تقدمك.' : 'Update trip status as you progress.'}</Text><Button title={lang==='ar'?'وصلت لنقطة الانطلاق':'Arrived at pickup'} variant='gold' onPress={()=>setStatus(current,'ARRIVING')}/><Button title={lang==='ar'?'بدء الرحلة':'Start trip'} variant='gold' onPress={()=>setStatus(current,'ACTIVE')}/><Button title={lang==='ar'?'إنهاء الرحلة':'Complete trip'} variant='gold' onPress={()=>setStatus(current,'COMPLETED')}/></View>}
      <View style={styles.earningsCard}><Text style={[styles.section, rtl && styles.rtl]}>{t.todayEarnings}</Text><Text style={[styles.fare, rtl && styles.rtl]}>0 SDG</Text><Text style={[styles.muted, rtl && styles.rtl]}>{lang === 'ar' ? 'تظهر الأرباح بعد إكمال الرحلات' : 'Earnings appear after completed trips'}</Text></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({screen:{flex:1,backgroundColor:colors.bg},content:{padding:22,paddingTop:60,gap:16},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},reverse:{flexDirection:'row-reverse'},reverseWrap:{flexDirection:'row-reverse',flexWrap:'wrap'},title:{fontSize:30,fontWeight:'900',color:colors.navy},langButton:{borderRadius:18,backgroundColor:colors.navy,paddingVertical:11,paddingHorizontal:14},langText:{color:colors.white,fontWeight:'900'},profileCard:{backgroundColor:colors.white,borderRadius:28,padding:18,gap:14},profileTop:{flexDirection:'row',gap:14,alignItems:'center'},profileInfo:{flex:1},avatar:{width:58,height:58,borderRadius:22,backgroundColor:colors.navy,alignItems:'center',justifyContent:'center'},avatarText:{color:colors.gold,fontSize:26,fontWeight:'900'},name:{fontSize:26,fontWeight:'900',color:colors.text},muted:{color:colors.muted,marginTop:5},badges:{flexDirection:'row',flexWrap:'wrap',gap:8},badge:{backgroundColor:'#EAF6FA',color:colors.navy,overflow:'hidden',borderRadius:999,paddingVertical:7,paddingHorizontal:11,fontWeight:'900'},switchRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:colors.white,padding:18,borderRadius:24},switchText:{color:colors.navy,fontWeight:'900'},request:{borderWidth:2,borderColor:colors.gold,borderRadius:28,padding:18,gap:12,backgroundColor:colors.white},rideCard:{borderWidth:1,borderColor:'#E7EEF5',borderRadius:20,padding:14,gap:9},activeTrip:{borderWidth:2,borderColor:colors.teal,borderRadius:28,padding:18,gap:10,backgroundColor:colors.white},earningsCard:{backgroundColor:colors.white,borderRadius:28,padding:18},section:{color:colors.muted,fontWeight:'800'},route:{color:colors.navy,fontSize:22,fontWeight:'900'},fare:{color:colors.gold,fontSize:30,fontWeight:'900'},rtl:{textAlign:'right',writingDirection:'rtl'}});
