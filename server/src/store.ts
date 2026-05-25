// In-memory fallback store — used only when DATABASE_URL is not set (dev/preview)

export type MemUser = {
  id: string;
  phone: string;
  name: string | null;
  role: string;
  createdAt: string;
};

export type MemDriver = {
  id: string;
  name: string;
  phone: string;
  vehicleTypeId: string;
  vehicle: string;
  rating: number;
  online: boolean;
  cityId: string;
  plateNo?: string;
  verified?: boolean;
};

export type MemRide = {
  id: string;
  cityId: string;
  cityName: string;
  vehicleTypeId: string;
  vehicleName: string;
  driverId: string | null;
  driverName: string | null;
  pickupLabel: string;
  destinationLabel: string;
  distanceKm: number;
  estimatedFare: number;
  status: string;
  rating: number | null;
  createdAt: string;
  updatedAt?: string;
};

export type MemSupport = {
  id: string;
  category: string;
  message: string;
  lang: string;
  phone: string | null;
  name: string | null;
  status: string;
  createdAt: string;
  updatedAt?: string;
};

export type MemStaff = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  username: string;
  passwordHash: string;
  role: string;
  status: string;
  notes: string | null;
  createdAt: string;
  lastLoginAt: string | null;
};

export type MemLegalDoc = {
  key: string;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  status: string;
  updatedBy: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export const memoryUsers: MemUser[] = [];
export const memoryRides: MemRide[] = [];
export const memorySupportRequests: MemSupport[] = [];
export const memoryStaff: MemStaff[] = [];
export const memoryLegalDocuments: MemLegalDoc[] = [];

export const memoryDrivers: MemDriver[] = [
  { id: 'driver_1', name: 'Mohammed Ahmed', phone: '+249900000001', vehicleTypeId: 'rickshaw', vehicle: 'Blue rickshaw', rating: 4.8, online: true, cityId: 'rufaa', verified: true },
  { id: 'driver_2', name: 'Ali Altayeb', phone: '+249900000002', vehicleTypeId: 'car', vehicle: 'White car', rating: 4.7, online: true, cityId: 'rufaa', verified: true },
  { id: 'driver_3', name: 'Khalid Osman', phone: '+249900000003', vehicleTypeId: 'van', vehicle: 'Family van', rating: 4.6, online: false, cityId: 'khartoum', verified: false },
];
