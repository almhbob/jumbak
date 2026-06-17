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
  passengerId?: string | null;
  driverId: string | null;
  driverName: string | null;
  pickupLabel: string;
  destinationLabel: string;
  stops?: string | null;
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

export type MemDeviceToken = {
  token: string;
  userId: string;
  platform: string;
};

export const memoryUsers: MemUser[] = [];
export const memoryTokens: MemDeviceToken[] = [];
export const memoryRides: MemRide[] = [];
export const memorySupportRequests: MemSupport[] = [];
export const memoryStaff: MemStaff[] = [];

const privacyContent = JSON.stringify([
  { titleEn: 'Data We Collect', bodyEn: 'Phone number, name, city, trip details, support messages, driver and vehicle details when applicable.', titleAr: 'البيانات التي نجمعها', bodyAr: 'رقم الهاتف، الاسم، المدينة، بيانات الرحلات، رسائل الدعم، وبيانات السائق والمركبة عند الحاجة.' },
  { titleEn: 'How We Use Data', bodyEn: 'To operate rides, support users, manage drivers, calculate pricing, improve safety, and produce operational reports.', titleAr: 'كيف نستخدم البيانات', bodyAr: 'تشغيل الرحلات، دعم المستخدمين، إدارة السائقين، حساب الأسعار، تحسين السلامة، وإصدار التقارير التشغيلية.' },
  { titleEn: 'Location Data', bodyEn: 'Location may be used to select pickup and destination points, calculate distance, and match nearby drivers when maps are enabled.', titleAr: 'بيانات الموقع', bodyAr: 'قد تُستخدم بيانات الموقع لاختيار نقطة الانطلاق والوجهة وحساب المسافة وربط السائقين القريبين عند تفعيل الخرائط.' },
  { titleEn: 'Data Security', bodyEn: 'Access is restricted by role. Production deployment uses secure backend sessions, encrypted transport, and limited admin permissions.', titleAr: 'أمن البيانات', bodyAr: 'يتم تقييد الوصول حسب الصلاحية. في الإنتاج يُستخدم اتصال مشفر وجلسات آمنة وصلاحيات محدودة.' },
  { titleEn: 'Contact', bodyEn: 'Users can contact support through the app or official support channels published by Jnbk.', titleAr: 'التواصل', bodyAr: 'يمكن للمستخدمين التواصل عبر التطبيق أو قنوات الدعم الرسمية المنشورة من جنبك.' },
]);

const termsContent = JSON.stringify([
  { titleEn: 'Service Scope', bodyEn: 'Jnbk provides a technology platform to connect passengers with available transport providers according to supported cities and vehicle services.', titleAr: 'نطاق الخدمة', bodyAr: 'يوفر جنبك منصة تقنية لربط الركاب بمقدمي خدمات النقل المتاحين حسب المدن والخدمات المدعومة.' },
  { titleEn: 'User Responsibilities', bodyEn: 'Users must provide accurate information, respect drivers and passengers, and avoid misuse of the platform.', titleAr: 'مسؤوليات المستخدم', bodyAr: 'يلتزم المستخدم بتقديم بيانات صحيحة واحترام السائقين والركاب وعدم إساءة استخدام المنصة.' },
  { titleEn: 'Driver Responsibilities', bodyEn: 'Drivers must provide valid information, comply with local regulations, maintain vehicle safety, and follow accepted ride standards.', titleAr: 'مسؤوليات السائق', bodyAr: 'يلتزم السائق بتقديم بيانات صحيحة والامتثال للأنظمة المحلية والحفاظ على سلامة المركبة ومعايير الرحلة.' },
  { titleEn: 'Pricing', bodyEn: 'Estimated pricing may change based on distance, city, service type, promotions, or operational adjustments.', titleAr: 'الأسعار', bodyAr: 'قد يتغير السعر التقديري حسب المسافة والمدينة ونوع الخدمة والعروض أو التعديلات التشغيلية.' },
  { titleEn: 'Suspension', bodyEn: 'Jnbk may suspend accounts involved in fraud, unsafe behavior, repeated complaints, or violation of platform rules.', titleAr: 'إيقاف الحساب', bodyAr: 'يمكن لجنبك إيقاف الحسابات المرتبطة بالاحتيال أو السلوك غير الآمن أو الشكاوى المتكررة أو مخالفة القواعد.' },
]);

export const memoryLegalDocuments: MemLegalDoc[] = [
  {
    key: 'privacy',
    titleAr: 'سياسة الخصوصية',
    titleEn: 'Privacy Policy',
    contentAr: privacyContent,
    contentEn: privacyContent,
    status: 'draft',
    updatedBy: null,
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    key: 'terms',
    titleAr: 'شروط الاستخدام',
    titleEn: 'Terms of Use',
    contentAr: termsContent,
    contentEn: termsContent,
    status: 'draft',
    updatedBy: null,
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

export const memoryDrivers: MemDriver[] = [
  { id: 'driver_1', name: 'Mohammed Ahmed', phone: '+249900000001', vehicleTypeId: 'rickshaw', vehicle: 'Blue rickshaw', rating: 4.8, online: true, cityId: 'rufaa', verified: true },
  { id: 'driver_2', name: 'Ali Altayeb', phone: '+249900000002', vehicleTypeId: 'car', vehicle: 'White car', rating: 4.7, online: true, cityId: 'rufaa', verified: true },
  { id: 'driver_3', name: 'Khalid Osman', phone: '+249900000003', vehicleTypeId: 'van', vehicle: 'Family van', rating: 4.6, online: false, cityId: 'khartoum', verified: false },
];