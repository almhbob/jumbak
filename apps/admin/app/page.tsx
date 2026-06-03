import Image from 'next/image';
import { getFirebaseCollection, isFirebaseConfigured } from './lib/firebase';

export const dynamic = 'force-static';

type Lang = 'ar' | 'en';
type AppConfig = { countries: { id: string; nameEn: string; currency: string }[]; cities: { id: string; countryId: string; nameEn: string; zones?: unknown[]; zonesEn?: string[] }[]; vehicleTypes: { id: string; nameEn: string; baseFare: number; perKmFare: number; minimumFare: number }[] };
type Driver = { id: string; name?: string; online?: boolean; verified?: boolean; cityId?: string; status?: string };
type Ride = { id: string; status?: string; estimatedFare?: number };
type SupportRequest = { id: string; category?: string; message?: string; lang?: string; status?: string };

const fallbackConfig: AppConfig = { countries: [{ id: 'sd', nameEn: 'Sudan', currency: 'SDG' }], cities: [{ id: 'rufaa', countryId: 'sd', nameEn: 'Rufaa', zonesEn: ['Market', 'Hospital', 'Station'] }], vehicleTypes: [{ id: 'rickshaw', nameEn: 'Rickshaw', baseFare: 500, perKmFare: 300, minimumFare: 1000 }] };
const fallbackDrivers: Driver[] = [{ id: 'driver_1', name: 'Preview Driver', online: true, verified: true, cityId: 'rufaa' }];
const fallbackSupport: SupportRequest[] = [{ id: 'support_preview_1', category: 'Preview', message: 'Firebase/backend requests appear here.', lang: 'en', status: 'OPEN' }];

const copy = {
  ar: { cc: 'مركز التحكم', dash: 'بوابة التحكم الموحدة', hero: 'رابط موحد لكل لوحات العمل مع تسجيل دخول منفصل حسب الصلاحية.', portal: 'تسجيل الدخول', portalDesc: 'اختر حساب الموظف المناسب من البوابة الموحدة.', operations: 'التشغيل', settings: 'لوحة المطور', zones: 'إدارة المناطق', business: 'الإدارة', staff: 'الموظفون', workflow: 'تنسيق العمل', finance: 'المحاسبة', launch: 'جاهزية الإطلاق', trips: 'إجمالي الرحلات', active: 'السائقون النشطون', open: 'طلبات الدعم', cities: 'المدن', summary: 'ملخص سريع', done: 'الرحلات المكتملة', revenue: 'الإيراد التقديري', source: 'مصدر البيانات', firebase: 'Firebase Firestore', backend: 'Backend API', preview: 'وضع المعاينة', toggle: 'English' },
  en: { cc: 'CONTROL CENTER', dash: 'Unified Control Portal', hero: 'One link for all workspaces with separate login per role.', portal: 'Login Portal', portalDesc: 'Choose the right staff account from the unified portal.', operations: 'Operations', settings: 'Developer Panel', zones: 'Zone Management', business: 'Business', staff: 'Staff', workflow: 'Workflow', finance: 'Finance', launch: 'Launch', trips: 'Total Trips', active: 'Active Drivers', open: 'Support Open', cities: 'Cities', summary: 'Quick Summary', done: 'Completed Rides', revenue: 'Est. Revenue', source: 'Data Source', firebase: 'Firebase Firestore', backend: 'Backend API', preview: 'Preview Mode', toggle: 'العربية' },
};

async function apiGet<T>(path: string, fallback: T): Promise<T> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return fallback;
  try {
    const r = await fetch(`${apiUrl}${path}`, { cache: 'no-store' });
    return r.ok ? await r.json() : fallback;
  } catch { return fallback; }
}

async function loadList<T>(collectionName: string, apiPath: string, fallback: T[]): Promise<T[]> {
  return isFirebaseConfigured()
    ? getFirebaseCollection<T>(collectionName, fallback)
    : apiGet<T[]>(apiPath, fallback);
}

const workspaces = [
  { key: 'operations', path: '/portal' },
  { key: 'settings',   path: '/portal' },
  { key: 'zones',      path: '/zones' },
  { key: 'business',   path: '/portal' },
  { key: 'staff',      path: '/staff' },
  { key: 'finance',    path: '/finance' },
  { key: 'workflow',   path: '/workflow' },
  { key: 'launch',     path: '/launch' },
] as const;

export default async function Dashboard({ searchParams }: { searchParams?: { lang?: string } }) {
  const lang: Lang = searchParams?.lang === 'en' ? 'en' : 'ar';
  const t = copy[lang];
  const rtl = lang === 'ar';

  const config   = await apiGet<AppConfig>('/api/config', fallbackConfig);
  const drivers  = await loadList<Driver>('driverApplications', '/api/drivers', fallbackDrivers);
  const rides    = await loadList<Ride>('rides', '/api/rides', []);
  const support  = await loadList<SupportRequest>('supportRequests', '/api/support', fallbackSupport);

  const source        = isFirebaseConfigured() ? t.firebase : (process.env.NEXT_PUBLIC_API_URL ? t.backend : t.preview);
  const activeDrivers = drivers.filter((d) => d.online || d.status === 'approved').length;
  const completedRides= rides.filter((r) => r.status === 'COMPLETED' || r.status === 'completed').length;
  const openSupport   = support.filter((x) => !x.status || x.status === 'OPEN' || x.status === 'IN_REVIEW' || x.status === 'open').length;
  const totalRevenue  = rides.reduce((s, r) => s + Number(r.estimatedFare || 0), 0);

  const metrics: [string, string][] = [
    [t.trips,  String(rides.length)],
    [t.active, String(activeDrivers)],
    [t.open,   String(openSupport)],
    [t.cities, String(config.cities.length)],
  ];

  return (
    <main dir={rtl ? 'rtl' : 'ltr'} style={{ textAlign: rtl ? 'right' : 'left' }}>

      {/* Header Bar with Logo */}
      <header className="site-header">
        <Image src="/logo.png" alt="Jnbk جنبك" width={120} height={52} className="site-logo" priority />
        <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 8 }}>
          <a className="languageSwitch" href={`?lang=${lang === 'ar' ? 'en' : 'ar'}`}>{t.toggle}</a>
          <a className="languageSwitch" href={`/portal?lang=${lang}`}>{t.portal}</a>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="heroTop">
          <div>
            <div className="hero-logo">
              <Image src="/logo.png" alt="Jnbk" width={64} height={64} style={{ filter: 'brightness(0) invert(1)', height: 56, width: 'auto' }} />
            </div>
            <p className="kicker">Jnbk جنبك — {t.cc}</p>
            <h1>{t.dash}</h1>
            <p>{t.hero}</p>
          </div>
          <div className="topActions">
            <a className="languageSwitch" href={`/system?lang=${lang}`}>System</a>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid">
        {metrics.map(([label, value]) => (
          <div className="card" key={label}>
            <p>{label}</p>
            <strong>{value}</strong>
          </div>
        ))}
      </section>

      {/* Data Source */}
      <section className="panel">
        <h2>{t.source}</h2>
        <p className="muted">{source}</p>
      </section>

      {/* Quick Summary */}
      <section className="panel">
        <h2>{t.summary}</h2>
        <div className="table">
          <div className="row">
            <span>{t.done}</span>
            <strong style={{ color: '#063B63', fontSize: 18 }}>{completedRides}</strong>
            <span>{t.revenue}</span>
            <strong style={{ color: '#0E8FB3', fontSize: 18 }}>{totalRevenue.toLocaleString()} SDG</strong>
          </div>
        </div>
      </section>

      {/* Portal CTA */}
      <section className="panel">
        <h2>{t.portal}</h2>
        <p className="muted">{t.portalDesc}</p>
        <a
          className="primaryAction"
          style={{ display: 'inline-flex', marginTop: 16, textDecoration: 'none', maxWidth: 280 }}
          href={`/portal?lang=${lang}`}
        >
          {t.portal}
        </a>
      </section>

      {/* Workspace Grid */}
      <section className="grid devGrid" style={{ marginTop: 18 }}>
        {workspaces.map(({ key, path }) => (
          <div className="panel" key={key} style={{ margin: 0 }}>
            <h2>{t[key as keyof typeof t]}</h2>
            <a
              className="primaryAction"
              style={{ display: 'inline-flex', marginTop: 12, textDecoration: 'none' }}
              href={`${path}?lang=${lang}`}
            >
              {t[key as keyof typeof t]}
            </a>
          </div>
        ))}
      </section>

    </main>
  );
}
