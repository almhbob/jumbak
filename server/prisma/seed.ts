import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.country.upsert({
    where: { id: 'sd' },
    update: {},
    create: { id: 'sd', nameAr: 'السودان', nameEn: 'Sudan', currency: 'SDG' }
  });

  await prisma.country.upsert({
    where: { id: 'sa' },
    update: {},
    create: { id: 'sa', nameAr: 'السعودية', nameEn: 'Saudi Arabia', currency: 'SAR' }
  });

  const cities = [
    { id: 'rufaa', countryId: 'sd', nameAr: 'رفاعة', nameEn: 'Rufaa', zonesAr: ['السوق', 'المستشفى', 'المواقف', 'المدارس', 'الأحياء', 'الجامعة'], zonesEn: ['Market', 'Hospital', 'Station', 'Schools', 'Residential', 'University'] },
    { id: 'khartoum', countryId: 'sd', nameAr: 'الخرطوم', nameEn: 'Khartoum', zonesAr: ['الخرطوم', 'بحري', 'أمدرمان', 'السوق العربي', 'المطار'], zonesEn: ['Khartoum', 'Bahri', 'Omdurman', 'Arab Market', 'Airport'] },
    { id: 'dammam', countryId: 'sa', nameAr: 'الدمام', nameEn: 'Dammam', zonesAr: ['وسط الدمام', 'الكورنيش', 'الشاطئ', 'الفيصلية', 'المطار'], zonesEn: ['Central Dammam', 'Corniche', 'Al Shati', 'Al Faisaliyah', 'Airport'] }
  ];

  for (const city of cities) {
    await prisma.city.upsert({
      where: { id: city.id },
      update: { nameAr: city.nameAr, nameEn: city.nameEn, countryId: city.countryId },
      create: { id: city.id, countryId: city.countryId, nameAr: city.nameAr, nameEn: city.nameEn }
    });

    for (let i = 0; i < city.zonesAr.length; i++) {
      await prisma.zone.upsert({
        where: { id: `${city.id}_${i}` },
        update: { nameAr: city.zonesAr[i], nameEn: city.zonesEn[i] },
        create: { id: `${city.id}_${i}`, cityId: city.id, nameAr: city.zonesAr[i], nameEn: city.zonesEn[i] }
      });
    }
  }

  const vehicleTypes = [
    { id: 'rickshaw', nameAr: 'ركشة', nameEn: 'Rickshaw', baseFare: 500, perKmFare: 300, minimumFare: 1000 },
    { id: 'car', nameAr: 'سيارة', nameEn: 'Car', baseFare: 900, perKmFare: 550, minimumFare: 1800 },
    { id: 'van', nameAr: 'حافلة صغيرة', nameEn: 'Van', baseFare: 1200, perKmFare: 700, minimumFare: 2500 }
  ];

  for (const item of vehicleTypes) {
    await prisma.vehicleType.upsert({ where: { id: item.id }, update: item, create: item });
  }

  const demoDrivers = [
    { phone: '+249900000001', name: 'Mohammed Ahmed', cityId: 'rufaa', vehicleTypeId: 'rickshaw', plateNo: 'RF-001', color: 'Blue', model: 'Rickshaw' },
    { phone: '+249900000002', name: 'Ali Altayeb', cityId: 'rufaa', vehicleTypeId: 'car', plateNo: 'RF-002', color: 'White', model: 'Sedan' },
    { phone: '+249900000003', name: 'Khalid Osman', cityId: 'khartoum', vehicleTypeId: 'van', plateNo: 'KH-003', color: 'Silver', model: 'Van' }
  ];

  for (const item of demoDrivers) {
    const user = await prisma.user.upsert({
      where: { phone: item.phone },
      update: { name: item.name, role: UserRole.DRIVER },
      create: { phone: item.phone, name: item.name, role: UserRole.DRIVER }
    });

    const driver = await prisma.driver.upsert({
      where: { userId: user.id },
      update: { cityId: item.cityId, isOnline: true, isVerified: true },
      create: { userId: user.id, cityId: item.cityId, isOnline: true, isVerified: true }
    });

    await prisma.vehicle.upsert({
      where: { driverId: driver.id },
      update: { vehicleTypeId: item.vehicleTypeId, plateNo: item.plateNo, color: item.color, model: item.model },
      create: { driverId: driver.id, vehicleTypeId: item.vehicleTypeId, plateNo: item.plateNo, color: item.color, model: item.model }
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
