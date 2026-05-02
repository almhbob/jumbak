export type Country = {
  id: string;
  nameAr: string;
  nameEn: string;
  currency: string;
};

export type City = {
  id: string;
  countryId: string;
  nameAr: string;
  nameEn: string;
  zonesAr: string[];
  zonesEn: string[];
};

export type VehicleType = {
  id: string;
  nameAr: string;
  nameEn: string;
  baseFare: number;
  perKmFare: number;
  minimumFare: number;
  icon: string;
};

export type ServiceMode = {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  fareMultiplier: number;
  icon: string;
};

export const countries: Country[] = [
  { id: 'sd', nameAr: 'السودان', nameEn: 'Sudan', currency: 'SDG' },
  { id: 'sa', nameAr: 'السعودية', nameEn: 'Saudi Arabia', currency: 'SAR' }
];

export const rufaaZonesAr = [
  'سوق رفاعة', 'المستشفى', 'المواقف', 'ديم لطفي', 'حي 2', 'حي 3', 'حي 4', 'حي 5', 'حي 6', 'حي 7', 'حي 8', 'حي 9', 'حي 10',
  'حي 11', 'حي 12', 'حي 13', 'حي 14', 'حي 15', 'حي 16', 'حي 17', 'حي 18', 'حي 19', 'حي 20', 'حي 21', 'حي 22', 'حي 23', 'حي 24',
  'حي الجنينة', 'الحلة الجديدة', 'التضامن', 'بانت', 'العمارة', 'ود رحوم', 'العريبات', 'الهبيكات', 'الرفاعين', 'دلوات', 'السيال', 'التكلة', 'التراجمة', 'أم حريزات', 'قرفة'
];

export const rufaaZonesEn = [
  'Rufaa Market', 'Hospital', 'Station', 'Deim Lutfi', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Block 6', 'Block 7', 'Block 8', 'Block 9', 'Block 10',
  'Block 11', 'Block 12', 'Block 13', 'Block 14', 'Block 15', 'Block 16', 'Block 17', 'Block 18', 'Block 19', 'Block 20', 'Block 21', 'Block 22', 'Block 23', 'Block 24',
  'Al Janina', 'New Hilla', 'Al Tadamun', 'Bant', 'Al Amara', 'Wad Rahoom', 'Al Araybat', 'Al Hubaikat', 'Al Rifaeen', 'Dalawat', 'Al Sayal', 'Al Takla', 'Al Tarajma', 'Um Harizat', 'Qarfa'
];

export const cities: City[] = [
  {
    id: 'rufaa',
    countryId: 'sd',
    nameAr: 'رفاعة',
    nameEn: 'Rufaa',
    zonesAr: rufaaZonesAr,
    zonesEn: rufaaZonesEn
  },
  {
    id: 'khartoum',
    countryId: 'sd',
    nameAr: 'الخرطوم',
    nameEn: 'Khartoum',
    zonesAr: ['الخرطوم', 'بحري', 'أمدرمان', 'السوق العربي', 'المطار'],
    zonesEn: ['Khartoum', 'Bahri', 'Omdurman', 'Arab Market', 'Airport']
  },
  {
    id: 'dammam',
    countryId: 'sa',
    nameAr: 'الدمام',
    nameEn: 'Dammam',
    zonesAr: ['وسط الدمام', 'الكورنيش', 'الشاطئ', 'الفيصلية', 'المطار'],
    zonesEn: ['Central Dammam', 'Corniche', 'Al Shati', 'Al Faisaliyah', 'Airport']
  }
];

export const vehicleTypes: VehicleType[] = [
  { id: 'rickshaw', nameAr: 'ركشة', nameEn: 'Rickshaw', baseFare: 500, perKmFare: 300, minimumFare: 1000, icon: 'R' },
  { id: 'car', nameAr: 'جنبك تاكسي', nameEn: 'Jnbk Taxi', baseFare: 900, perKmFare: 550, minimumFare: 1800, icon: 'T' },
  { id: 'van', nameAr: 'حافلة صغيرة', nameEn: 'Van', baseFare: 1200, perKmFare: 700, minimumFare: 2500, icon: 'V' }
];

export const serviceModes: ServiceMode[] = [
  {
    id: 'fast',
    nameAr: 'ركشة سريعة',
    nameEn: 'Fast ride',
    descriptionAr: 'أقرب ركشة متاحة بأقل زمن انتظار.',
    descriptionEn: 'Nearest available rickshaw with the shortest wait.',
    fareMultiplier: 1,
    icon: '↯'
  },
  {
    id: 'waqar',
    nameAr: 'ركشة الوقار',
    nameEn: 'Waqar ride',
    descriptionAr: 'سائقون كبار السن أو عالي التقييم لطمأنة العائلات.',
    descriptionEn: 'Senior or highly rated drivers for families and safety.',
    fareMultiplier: 1.15,
    icon: '✓'
  },
  {
    id: 'delivery',
    nameAr: 'جنبك دليفري',
    nameEn: 'Jnbk Delivery',
    descriptionAr: 'استلام أغراض من السوق وتوصيلها للمنزل.',
    descriptionEn: 'Pickup items from market and deliver home.',
    fareMultiplier: 1.2,
    icon: '□'
  },
  {
    id: 'emergency',
    nameAr: 'ركشة الطوارئ',
    nameEn: 'Emergency ride',
    descriptionAr: 'طلب عاجل مع أولوية تشغيل وتنبيه دعم.',
    descriptionEn: 'Urgent request with priority dispatch and support alert.',
    fareMultiplier: 1.25,
    icon: '!'
  },
  {
    id: 'offline_sms',
    nameAr: 'طلب أوفلاين SMS',
    nameEn: 'Offline SMS',
    descriptionAr: 'خيار بديل عند ضعف الإنترنت في الأحياء والقرى.',
    descriptionEn: 'Fallback request option for weak internet areas.',
    fareMultiplier: 1,
    icon: 'SMS'
  }
];

export function estimateFare(distanceKm: number, vehicle: VehicleType, multiplier = 1) {
  return Math.max(Math.round((vehicle.baseFare + distanceKm * vehicle.perKmFare) * multiplier), vehicle.minimumFare);
}
