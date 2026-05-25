// Mutable runtime copies of the static config — used in memory-only mode
import { cities, vehicleTypes } from '../config.js';

export const memoryCities = [...cities] as { id: string; countryId: string; nameAr: string; nameEn: string; zonesAr: string[]; zonesEn: string[] }[];
export const memoryVehicleTypes = [...vehicleTypes] as { id: string; nameAr: string; nameEn: string; baseFare: number; perKmFare: number; minimumFare: number }[];
