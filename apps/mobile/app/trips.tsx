import React, { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet, View, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '../src/constants/theme';
import { dict, Lang } from '../src/i18n';
import { getRides } from '../src/api';

type Ride={id:string;pickupLabel?:string;destinationLabel?:string;estimatedFare?:number;finalFare?:number;status?:string;createdAt?:string;city?:{nameAr?:string;nameEn?:string};cityName?:string;vehicleType?:{nameAr?:string;nameEn?:string};vehicleName?:string};
const previewTrips:Ride[]=[{id:'preview_1',pickupLabel:'Market',destinationLabel:'Hospital',estimatedFare:1200,status:'COMPLETED',cityName:'Rufaa',vehicleName:'Rickshaw'},{id:'preview_2',pickupLabel:'Station',destinationLabel:'Residential',estimatedFare:1500,status:'COMPLETED',cityName:'Rufaa',vehicleName:'Rickshaw'},{id:'preview_3',pickupLabel:'University',destinationLabel:'Market',estimatedFare:1800,status:'ACTIVE',cityName:'Rufaa',vehicleName:'Car'}];
function statusLabel(status:string|undefined,lang:Lang){const s=String(status||'REQUESTED');const ar=lang==='ar';const map:any={REQUESTED:ar?'مطلوبة':'Requested',ACCEPTED:ar?'مقبولة':'Accepted',ARRIVING:ar?'السائق في الطريق':'Driver arriving',ACTIVE:ar?'جارية':'Active',COMPLETED:ar?'مكتملة':'Completed',CANCELLED:ar?'ملغاة':'Cancelled'};return map[s]||s}
export default function Trips() {
  const params = useLocalSearchParams<{ lang?: Lang }>();
  const [lang, setLang] = useState<Lang>(params.lang === 'en' ? 'en' : 'ar');
  const [trips,setTrips]=useState<Ride[]>(previewTrips);
  const [source,setSource]=useState<'api'|'preview'>('preview');
  const [loading,setLoading]=useState(false);
  const t = dict[lang];
  const rtl = lang === 'ar';
  async function load(){setLoading(true);try{const data=await getRides();if(Array.isArray(data)&&data.length){setTrips(data);setSource('api')}else{setTrips(previewTrips);setSource('preview')}}catch{setTrips(previewTrips);setSource('preview')}finally{setLoading(false)}}
  useEffect(()=>{load()},[]);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={[styles.header, rtl && styles.reverse]}>
        <View>
          <Text style={[styles.kicker, rtl && styles.rtl]}>Jnbk جنبك</Text>
          <Text style={[styles.title, rtl && styles.rtl]}>{t.tripHistory}</Text>
        </View>
        <Pressable style={styles.langButton} onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')}><Text style={styles.langText}>{t.language}</Text></Pressable>
      </View>
      <View style={styles.sourceCard}><Text style={[styles.sourceText, rtl && styles.rtl]}>{source==='api'?(lang==='ar'?'السجل من الخادم':'History from backend'):(lang==='ar'?'سجل معاينة حتى ربط الخادم':'Preview history until backend is connected')}</Text></View>
      <View style={[styles.quickRow, rtl && styles.reverse]}>
        <View style={styles.stat}><Text style={styles.statValue}>{trips.length}</Text><Text style={[styles.statLabel, rtl && styles.rtl]}>{lang==='ar'?'كل الرحلات':'All trips'}</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>{trips.filter(x=>x.status==='COMPLETED').length}</Text><Text style={[styles.statLabel, rtl && styles.rtl]}>{lang==='ar'?'مكتملة':'Completed'}</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>{trips.filter(x=>['REQUESTED','ACCEPTED','ARRIVING','ACTIVE'].includes(String(x.status))).length}</Text><Text style={[styles.statLabel, rtl && styles.rtl]}>{lang==='ar'?'نشطة':'Active'}</Text></View>
      </View>
      <Pressable style={styles.refresh} onPress={load}><Text style={styles.refreshText}>{loading?(lang==='ar'?'جاري التحديث...':'Refreshing...'):(lang==='ar'?'تحديث السجل':'Refresh history')}</Text></Pressable>
      {trips.map((trip) => {
        const city=lang==='ar'?(trip.city?.nameAr||trip.cityName):(trip.city?.nameEn||trip.cityName);
        const vehicle=lang==='ar'?(trip.vehicleType?.nameAr||trip.vehicleName):(trip.vehicleType?.nameEn||trip.vehicleName);
        return <View key={trip.id} style={styles.card}>
          <Text style={[styles.route, rtl && styles.rtl]}>{trip.pickupLabel || 'Pickup'} {t.to} {trip.destinationLabel || 'Destination'}</Text>
          <Text style={[styles.meta, rtl && styles.rtl]}>{trip.finalFare||trip.estimatedFare||0} SDG - {statusLabel(trip.status,lang)}</Text>
          <Text style={[styles.meta, rtl && styles.rtl]}>{city||'-'} • {vehicle||'-'}</Text>
          {trip.status&&trip.status!=='COMPLETED'?<Pressable style={styles.details} onPress={()=>router.push({pathname:'/ride',params:{lang,rideId:trip.id,pickup:trip.pickupLabel||'',destination:trip.destinationLabel||'',fare:String(trip.estimatedFare||0),city:city||'',vehicle:vehicle||''}})}><Text style={styles.detailsText}>{lang==='ar'?'متابعة الرحلة':'Track ride'}</Text></Pressable>:null}
        </View>
      })}
    </ScrollView>
  );
}
const styles = StyleSheet.create({screen:{flex:1,backgroundColor:colors.bg},content:{padding:22,paddingTop:60,gap:14},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},reverse:{flexDirection:'row-reverse'},kicker:{color:colors.gold,fontWeight:'900',letterSpacing:2},title:{fontSize:30,fontWeight:'900',color:colors.navy},langButton:{borderRadius:18,backgroundColor:colors.navy,paddingVertical:11,paddingHorizontal:14},langText:{color:colors.white,fontWeight:'900'},sourceCard:{backgroundColor:'#E7F7EF',borderRadius:20,padding:12},sourceText:{color:colors.teal,fontWeight:'900'},quickRow:{flexDirection:'row',gap:10},stat:{flex:1,backgroundColor:colors.white,borderRadius:20,padding:14},statValue:{color:colors.gold,fontSize:26,fontWeight:'900'},statLabel:{color:colors.muted,fontWeight:'800'},refresh:{backgroundColor:colors.navy,borderRadius:18,padding:14,alignItems:'center'},refreshText:{color:colors.white,fontWeight:'900'},card:{backgroundColor:colors.white,borderRadius:28,padding:18,gap:6},route:{color:colors.text,fontSize:20,fontWeight:'900'},meta:{color:colors.muted,marginTop:4},details:{alignSelf:'flex-start',backgroundColor:colors.gold,borderRadius:14,paddingVertical:9,paddingHorizontal:12,marginTop:8},detailsText:{color:colors.navy,fontWeight:'900'},rtl:{textAlign:'right',writingDirection:'rtl'}});
