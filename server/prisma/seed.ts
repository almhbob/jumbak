import { PrismaClient, UserRole, StaffRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { rufaaZones } from '../src/data/rufaaZones.js';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 10;

async function main() {
  // ─── Countries ────────────────────────────────────────────────────────────────
  await prisma.country.upsert({ where: { id: 'sd' }, update: {}, create: { id: 'sd', nameAr: 'السودان',    nameEn: 'Sudan',        currency: 'SDG' } });
  await prisma.country.upsert({ where: { id: 'sa' }, update: {}, create: { id: 'sa', nameAr: 'السعودية',   nameEn: 'Saudi Arabia', currency: 'SAR' } });

  // ─── Cities ───────────────────────────────────────────────────────────────────
  const cities = [
    { id: 'rufaa',    countryId: 'sd', nameAr: 'رفاعة',   nameEn: 'Rufaa'    },
    { id: 'khartoum', countryId: 'sd', nameAr: 'الخرطوم', nameEn: 'Khartoum' },
    { id: 'dammam',   countryId: 'sa', nameAr: 'الدمام',   nameEn: 'Dammam'   },
  ];
  for (const city of cities) {
    await prisma.city.upsert({
      where: { id: city.id },
      update: { nameAr: city.nameAr, nameEn: city.nameEn, countryId: city.countryId },
      create: { id: city.id, countryId: city.countryId, nameAr: city.nameAr, nameEn: city.nameEn },
    });
  }

  // ─── Rufaa zones — full list from rufaaZones.ts ───────────────────────────────
  for (const zone of rufaaZones) {
    await prisma.zone.upsert({
      where: { id: zone.id },
      update: { nameAr: zone.nameAr, nameEn: zone.nameEn, category: zone.category, fixedFare: zone.fixedFare ?? null },
      create: { id: zone.id, cityId: zone.cityId, nameAr: zone.nameAr, nameEn: zone.nameEn, category: zone.category, fixedFare: zone.fixedFare ?? null },
    });
  }

  // ─── Khartoum zones ───────────────────────────────────────────────────────────
  const khartoumZones = [
    { id: 'kh-wsat',    nameAr: 'وسط الخرطوم',   nameEn: 'Central Khartoum' },
    { id: 'kh-bahri',   nameAr: 'بحري',            nameEn: 'Bahri'            },
    { id: 'kh-omdrm',   nameAr: 'أمدرمان',         nameEn: 'Omdurman'         },
    { id: 'kh-arabisuq',nameAr: 'السوق العربي',    nameEn: 'Arab Market'      },
    { id: 'kh-airport', nameAr: 'المطار',           nameEn: 'Airport'          },
  ];
  for (const zone of khartoumZones) {
    await prisma.zone.upsert({
      where: { id: zone.id },
      update: { nameAr: zone.nameAr, nameEn: zone.nameEn },
      create: { id: zone.id, cityId: 'khartoum', nameAr: zone.nameAr, nameEn: zone.nameEn },
    });
  }

  // ─── Dammam zones ─────────────────────────────────────────────────────────────
  const dammamZones = [
    { id: 'dm-central',   nameAr: 'وسط الدمام',    nameEn: 'Central Dammam'  },
    { id: 'dm-corniche',  nameAr: 'الكورنيش',       nameEn: 'Corniche'        },
    { id: 'dm-shati',     nameAr: 'الشاطئ',          nameEn: 'Al Shati'        },
    { id: 'dm-faisalia',  nameAr: 'الفيصلية',        nameEn: 'Al Faisaliyah'   },
    { id: 'dm-airport',   nameAr: 'المطار',           nameEn: 'Airport'         },
  ];
  for (const zone of dammamZones) {
    await prisma.zone.upsert({
      where: { id: zone.id },
      update: { nameAr: zone.nameAr, nameEn: zone.nameEn },
      create: { id: zone.id, cityId: 'dammam', nameAr: zone.nameAr, nameEn: zone.nameEn },
    });
  }

  // ─── Vehicle types ────────────────────────────────────────────────────────────
  const vehicleTypes = [
    { id: 'rickshaw', nameAr: 'ركشة',         nameEn: 'Rickshaw', baseFare: 500,  perKmFare: 300, minimumFare: 1000, isVisible: true  },
    { id: 'car',      nameAr: 'سيارة',         nameEn: 'Car',      baseFare: 900,  perKmFare: 550, minimumFare: 1800, isVisible: false },
    { id: 'van',      nameAr: 'حافلة صغيرة',  nameEn: 'Van',      baseFare: 1200, perKmFare: 700, minimumFare: 2500, isVisible: false },
  ];
  for (const item of vehicleTypes) {
    await prisma.vehicleType.upsert({ where: { id: item.id }, update: item, create: item });
  }

  // ─── Demo drivers ─────────────────────────────────────────────────────────────
  const demoDrivers = [
    { phone: '+249900000001', name: 'محمد أحمد',   cityId: 'rufaa',    vehicleTypeId: 'rickshaw', plateNo: 'RF-001', color: 'أزرق',   model: 'ركشة'  },
    { phone: '+249900000002', name: 'علي الطيب',    cityId: 'rufaa',    vehicleTypeId: 'car',      plateNo: 'RF-002', color: 'أبيض',   model: 'سيدان' },
    { phone: '+249900000003', name: 'خالد عثمان',   cityId: 'khartoum', vehicleTypeId: 'van',      plateNo: 'KH-003', color: 'فضي',    model: 'فان'   },
  ];
  for (const item of demoDrivers) {
    const user = await prisma.user.upsert({
      where: { phone: item.phone },
      update: { name: item.name, role: UserRole.DRIVER },
      create: { phone: item.phone, name: item.name, role: UserRole.DRIVER },
    });
    const driver = await prisma.driver.upsert({
      where: { userId: user.id },
      update: { cityId: item.cityId, isOnline: true, isVerified: true },
      create: { userId: user.id, cityId: item.cityId, isOnline: true, isVerified: true },
    });
    await prisma.vehicle.upsert({
      where: { driverId: driver.id },
      update: { vehicleTypeId: item.vehicleTypeId, plateNo: item.plateNo, color: item.color, model: item.model },
      create: { driverId: driver.id, vehicleTypeId: item.vehicleTypeId, plateNo: item.plateNo, color: item.color, model: item.model },
    });
  }

  // ─── Staff accounts ───────────────────────────────────────────────────────────
  const defaultPasswordHash = await bcrypt.hash('123456', BCRYPT_ROUNDS);
  const staffAccounts = [
    { username: 'operations.manager', name: 'مدير العمليات',    role: StaffRole.OPERATIONS },
    { username: 'shift.supervisor',   name: 'مشرف الوردية',     role: StaffRole.SUPERVISOR },
    { username: 'customer.support',   name: 'دعم العملاء',       role: StaffRole.SUPPORT    },
    { username: 'accountant',         name: 'المحاسب',            role: StaffRole.ACCOUNTANT },
    { username: 'finance.officer',    name: 'مسؤول المالية',     role: StaffRole.FINANCE    },
    { username: 'business.admin',     name: 'إدارة الأعمال',    role: StaffRole.BUSINESS   },
  ];
  for (const account of staffAccounts) {
    await prisma.staffMember.upsert({
      where: { username: account.username },
      update: { name: account.name, role: account.role, passwordHash: defaultPasswordHash },
      create: { username: account.username, name: account.name, role: account.role, passwordHash: defaultPasswordHash },
    });
  }

  const devPassword = process.env.DEV_STAFF_PASSWORD || '123456';
  const devPasswordHash = await bcrypt.hash(devPassword, BCRYPT_ROUNDS);
  await prisma.staffMember.upsert({
    where: { username: 'developer' },
    update: { name: 'Developer', role: StaffRole.DEVELOPER, passwordHash: devPasswordHash },
    create: { username: 'developer', name: 'Developer', role: StaffRole.DEVELOPER, passwordHash: devPasswordHash },
  });

  console.log(`Seed completed — ${rufaaZones.length} Rufaa zones seeded.`);
  if (devPassword === '123456') {
    console.warn('WARNING: Developer account uses default password. Set DEV_STAFF_PASSWORD env var.');
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
