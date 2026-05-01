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

export const countries: Country[] = [
  { id: 'sd', nameAr: 'السودان', nameEn: 'Sudan', currency: 'SDG' },
  { id: 'sa', nameAr: 'السعودية', nameEn: 'Saudi Arabia', currency: 'SAR' }
];

export const cities: City[] = [
  {
    id: 'rufaa',
    countryId: 'sd',
    nameAr: 'رفاعة',
    nameEn: 'Rufaa',
    zonesAr: ['السوق', 'المستشفى', 'المواقف', 'المدارس', 'الأحياء', 'الجامعة'],
    zonesEn: ['Market', 'Hospital', 'Station', 'Schools', 'Residential', 'University']
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
  { id: 'car', nameAr: 'سيارة', nameEn: 'Car', baseFare: 900, perKmFare: 550, minimumFare: 1800, icon: 'C' },
  { id: 'van', nameAr: 'حافلة صغيرة', nameEn: 'Van', baseFare: 1200, perKmFare: 700, minimumFare: 2500, icon: 'V' }
];

export function estimateFare(distanceKm: number, vehicle: VehicleType) {
  return Math.max(Math.round(vehicle.baseFare + distanceKm * vehicle.perKmFare), vehicle.minimumFare);
}
