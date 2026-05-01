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
};

export const countries: Country[] = [
  { id: 'sd', nameAr: 'السودان', nameEn: 'Sudan', currency: 'SDG' },
  { id: 'sa', nameAr: 'السعودية', nameEn: 'Saudi Arabia', currency: 'SAR' }
];

export const cities: City[] = [
  { id: 'rufaa', countryId: 'sd', nameAr: 'رفاعة', nameEn: 'Rufaa', zonesAr: ['السوق', 'المستشفى', 'المواقف', 'المدارس', 'الأحياء', 'الجامعة'], zonesEn: ['Market', 'Hospital', 'Station', 'Schools', 'Residential', 'University'] },
  { id: 'khartoum', countryId: 'sd', nameAr: 'الخرطوم', nameEn: 'Khartoum', zonesAr: ['الخرطوم', 'بحري', 'أمدرمان', 'السوق العربي', 'المطار'], zonesEn: ['Khartoum', 'Bahri', 'Omdurman', 'Arab Market', 'Airport'] },
  { id: 'dammam', countryId: 'sa', nameAr: 'الدمام', nameEn: 'Dammam', zonesAr: ['وسط الدمام', 'الكورنيش', 'الشاطئ', 'الفيصلية', 'المطار'], zonesEn: ['Central Dammam', 'Corniche', 'Al Shati', 'Al Faisaliyah', 'Airport'] }
];

export const vehicleTypes: VehicleType[] = [
  { id: 'rickshaw', nameAr: 'ركشة', nameEn: 'Rickshaw', baseFare: 500, perKmFare: 300, minimumFare: 1000 },
  { id: 'car', nameAr: 'سيارة', nameEn: 'Car', baseFare: 900, perKmFare: 550, minimumFare: 1800 },
  { id: 'van', nameAr: 'حافلة صغيرة', nameEn: 'Van', baseFare: 1200, perKmFare: 700, minimumFare: 2500 }
];

export function findVehicleType(id?: string) {
  return vehicleTypes.find((item) => item.id === id) || vehicleTypes[0];
}

export function findCity(id?: string) {
  return cities.find((item) => item.id === id) || cities[0];
}

export function estimateFare(distanceKm: number, vehicleTypeId?: string) {
  const vehicle = findVehicleType(vehicleTypeId);
  return Math.max(Math.round(vehicle.baseFare + distanceKm * vehicle.perKmFare), vehicle.minimumFare);
}
