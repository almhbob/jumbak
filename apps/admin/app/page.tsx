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
  ar: {
    cc: 'مركز التحكم', dash: 'بوابة جنبك الموحدة',
    hero: 'رابط موحد لكل لوحات العمل مع تسجيل دخول منفصل حسب الصلاحية.',
    portal: 'تسجيل الدخول', portalDesc: 'اختر حساب الموظف المناسب من البوابة الموحدة.',
    operations: 'التشغيل', operationsDesc: 'الرحلات، السائقين، ومؤشرات الأداء اليومية.',
    settings: 'لوحة المطور', settingsDesc: 'الربط التقني وإعدادات الخادم.',
    zones: 'إدارة المناطق', zonesDesc: 'مناطق الخدمة والأحياء والمرافق.',
    pricing: 'إدارة التسعير', pricingDesc: 'أسعار الرحلات والأسعار الأساسية.',
    business: 'الإدارة', businessDesc: 'العقود، الاتفاقات، والتوسعة.',
    staff: 'الموظفون', staffDesc: 'حسابات الموظفين وإدارة الصلاحيات.',
    finance: 'المحاسبة', financeDesc: 'المحفظة، التحصيل، والتقارير المالية.',
    workflow: 'تنسيق العمل', workflowDesc: 'تنسيق المهام اليومية والأسبوعية.',
    launch: 'جاهزية الإطلاق', launchDesc: 'متطلبات وجاهزية إطلاق الخدمة.',
    trips: 'إجمالي الرحلات', active: 'السائقون النشطون', open: 'طلبات الدعم', cities: 'المدن',
    summary: 'ملخص سريع', done: 'الرحلات المكتملة', revenue: 'الإيراد التقديري',
    source: 'مصدر البيانات', firebase: 'Firebase Firestore', backend: 'Backend API', preview: 'وضع المعاينة',
    toggle: 'English', enterPortal: 'الدخول للبوابة',
  },
  en: {
    cc: 'CONTROL CENTER', dash: 'Jnbk Unified Portal',
    hero: 'One link for all workspaces with separate login per role.',
    portal: 'Login Portal', portalDesc: 'Choose the right staff account from the unified portal.',
    operations: 'Operations', operationsDesc: 'Rides, drivers, and daily performance metrics.',
    settings: 'Developer Panel', settingsDesc: 'Technical integrations and server settings.',
    zones: 'Zone Management', zonesDesc: 'Service zones, districts, and landmarks.',
    pricing: 'Pricing', pricingDesc: 'Ride fares and base pricing structure.',
    business: 'Management', businessDesc: 'Contracts, agreements, and expansion.',
    staff: 'Staff', staffDesc: 'Staff accounts and permission management.',
    finance: 'Finance', financeDesc: 'Wallet, collections, and financial reports.',
    workflow: 'Workflow', workflowDesc: 'Daily and weekly task coordination.',
    launch: 'Launch', launchDesc: 'Launch readiness and requirements checklist.',
    trips: 'Total Trips', active: 'Active Drivers', open: 'Support Open', cities: 'Cities',
    summary: 'Quick Summary', done: 'Completed Rides', revenue: 'Est. Revenue',
    source: 'Data Source', firebase: 'Firebase Firestore', backend: 'Backend API', preview: 'Preview Mode',
    toggle: 'العربية', enterPortal: 'Enter Portal',
  },
};

const workspaces: { key: keyof typeof copy.ar; descKey: keyof typeof copy.ar; path: string; accent: string }[] = [
  { key: 'operations', descKey: 'operationsDesc', path: '/portal',   accent: '#0E8FB3' },
  { key: 'business',   descKey: 'businessDesc',   path: '/portal',   accent: '#D6A936' },
  { key: 'staff',      descKey: 'staffDesc',       path: '/staff',    accent: '#8B5CF6' },
  { key: 'pricing',    descKey: 'pricingDesc',     path: '/pricing',  accent: '#10B981' },
  { key: 'zones',      descKey: 'zonesDesc',       path: '/zones',    accent: '#3B82F6' },
  { key: 'finance',    descKey: 'financeDesc',     path: '/finance',  accent: '#059669' },
  { key: 'workflow',   descKey: 'workflowDesc',    path: '/workflow', accent: '#F59E0B' },
  { key: 'settings',   descKey: 'settingsDesc',    path: '/portal',   accent: '#6366F1' },
  { key: 'launch',     descKey: 'launchDesc',      path: '/launch',   accent: '#EF4444' },
];

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

export default async function Dashboard({ searchParams }: { searchParams?: { lang?: string } }) {
  const lang: Lang = searchParams?.lang === 'en' ? 'en' : 'ar';
  const t = copy[lang];
  const rtl = lang === 'ar';

  const config   = await apiGet<AppConfig>('/api/config', fallbackConfig);
  const drivers  = await loadList<Driver>('driverApplications', '/api/drivers', fallbackDrivers);
  const rides    = await loadList<Ride>('rides', '/api/rides', []);
  const support  = await loadList<SupportRequest>('supportRequests', '/api/support', fallbackSupport);

  const isFirebase   = isFirebaseConfigured();
  const hasBackend   = !!process.env.NEXT_PUBLIC_API_URL;
  const sourceLabel  = isFirebase ? t.firebase : (hasBackend ? t.backend : t.preview);
  const sourceColor  = isFirebase ? '#0E8FB3' : (hasBackend ? '#10B981' : '#F59E0B');

  const activeDrivers  = drivers.filter((d) => d.online || d.status === 'approved').length;
  const completedRides = rides.filter((r) => r.status === 'COMPLETED' || r.status === 'completed').length;
  const openSupport    = support.filter((x) => !x.status || x.status === 'OPEN' || x.status === 'IN_REVIEW' || x.status === 'open').length;
  const totalRevenue   = rides.reduce((s, r) => s + Number(r.estimatedFare || 0), 0);

  const metrics: { label: string; value: string; color?: string }[] = [
    { label: t.trips,  value: String(rides.length) },
    { label: t.active, value: String(activeDrivers),  color: '#10B981' },
    { label: t.open,   value: String(openSupport),    color: openSupport > 0 ? '#F59E0B' : undefined },
    { label: t.cities, value: String(config.cities.length) },
  ];

  return (
    <main dir={rtl ? 'rtl' : 'ltr'} style={{ textAlign: rtl ? 'right' : 'left' }}>

      {/* Header */}
      <header className="site-header">
        <Image src="/logo.png" alt="Jnbk جنبك" width={120} height={52} className="site-logo" priority />
        <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Source indicator */}
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: sourceColor, display: 'inline-block', boxShadow: `0 0 6px ${sourceColor}` }} />
            {sourceLabel}
          </span>
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
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid">
        {metrics.map(({ label, value, color }) => (
          <div className="card" key={label}>
            <p>{label}</p>
            <strong style={color ? { background: 'none', WebkitTextFillColor: color, color } : {}}>{value}</strong>
          </div>
        ))}
      </section>

      {/* Quick summary */}
      <section className="panel">
        <h2>{t.summary}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: '#F0F6FC', borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#7A92A8', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>{t.done}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#063B63' }}>{completedRides}</div>
          </div>
          <div style={{ background: '#F0F6FC', borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#7A92A8', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>{t.revenue}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#0E8FB3' }}>{totalRevenue.toLocaleString()} <span style={{ fontSize: 14 }}>SDG</span></div>
          </div>
        </div>
      </section>

      {/* Portal CTA */}
      <section className="panel">
        <h2>{t.portal}</h2>
        <p className="muted">{t.portalDesc}</p>
        <a className="primaryAction" style={{ display: 'inline-flex', marginTop: 16, textDecoration: 'none', maxWidth: 260 }} href={`/portal?lang=${lang}`}>
          {t.enterPortal}
        </a>
      </section>

      {/* Workspace grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 18 }}>
        {workspaces.map(({ key, descKey, path, accent }) => (
          <div key={key} className="panel" style={{ margin: 0, display: 'flex', flexDirection: 'column', borderTop: `3px solid ${accent}` }}>
            <h2 style={{ marginBottom: 6, fontSize: 18, color: accent }}>{t[key]}</h2>
            <p className="muted" style={{ margin: '0 0 16px', fontSize: 13, flexGrow: 1 }}>{t[descKey]}</p>
            <a
              className="primaryAction"
              style={{ display: 'flex', textDecoration: 'none', fontSize: 14, padding: '12px 18px', background: `linear-gradient(135deg, ${accent}dd, ${accent})` }}
              href={`${path}?lang=${lang}`}
            >
              {t[key]}
            </a>
          </div>
        ))}
      </section>

    </main>
  );
}
