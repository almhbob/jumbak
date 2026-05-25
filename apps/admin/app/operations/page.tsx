'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getOpsSource, loadOpsDrivers, loadOpsRides, loadOpsSupport, OpsDriver, OpsRide, OpsSupport } from './firebaseOps';

type Lang = 'ar' | 'en';

const fallbackDrivers: OpsDriver[] = [{ id: 'driver_1', name: 'Preview Driver', online: true, verified: true, cityId: 'rufaa' }];
const fallbackSupport: OpsSupport[] = [{ id: 'support_preview_1', category: 'Preview', message: 'Firebase/backend requests appear here.', lang: 'en', status: 'OPEN' }];

const copy = {
  ar: { title: 'لوحة إدارة التطبيق', sub: 'مساحة التشغيل اليومية: الرحلات، السائقين، الدعم، ومؤشرات الأداء.', back: 'خروج', support: 'طلبات الدعم', drivers: 'السائقون', rides: 'الرحلات', tasks: 'تقسيم المهام اليومي', shift: 'مسؤول الوردية', supportRole: 'الدعم الفني', finance: 'المحاسبة', online: 'متصل', offline: 'غير متصل', verified: 'معتمد', pending: 'قيد المراجعة', toggle: 'English', source: 'مصدر البيانات', denied: 'هذه الصفحة مخصصة لحسابات التشغيل والمشرفين ومسؤولي العملاء فقط. سجّل الدخول من البوابة الموحدة.' },
  en: { title: 'Operations Dashboard', sub: 'Daily workspace: rides, drivers, support, and performance indicators.', back: 'Logout', support: 'Support', drivers: 'Drivers', rides: 'Rides', tasks: 'Daily task split', shift: 'Shift lead', supportRole: 'Support team', finance: 'Finance', online: 'Online', offline: 'Offline', verified: 'Verified', pending: 'Pending', toggle: 'العربية', source: 'Data source', denied: 'This page is only for operations, supervisor, and customer support accounts. Log in from the unified portal.' },
};

function truncate(m?: string) { const t = m || ''; return t.length > 70 ? t.slice(0, 70) + '...' : t; }
function logout(lang: Lang) { sessionStorage.clear(); window.location.href = `/portal?lang=${lang}`; }

export default function Operations() {
  const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
  const lang: Lang = params.get('lang') === 'en' ? 'en' : 'ar';
  const t = copy[lang];
  const rtl = lang === 'ar';

  const [allowed, setAllowed] = useState(false);
  const [source, setSource] = useState('Preview');
  const [drivers, setDrivers] = useState<OpsDriver[]>(fallbackDrivers);
  const [rides, setRides] = useState<OpsRide[]>([]);
  const [support, setSupport] = useState<OpsSupport[]>(fallbackSupport);

  useEffect(() => {
    const role = sessionStorage.getItem('jnbk_active_role') || '';
    const ok = sessionStorage.getItem('jnbk_operations_auth') === 'true' && ['operations', 'supervisor', 'support'].includes(role);
    setAllowed(ok);
    setSource(getOpsSource(lang));
    if (ok) {
      loadOpsDrivers(fallbackDrivers).then(setDrivers);
      loadOpsRides([]).then(setRides);
      loadOpsSupport(fallbackSupport).then(setSupport);
    }
  }, []);

  if (!allowed) {
    return (
      <main dir={rtl ? 'rtl' : 'ltr'} style={{ textAlign: rtl ? 'right' : 'left' }}>
        <header className="site-header">
          <Image src="/logo.png" alt="Jnbk جنبك" width={120} height={52} className="site-logo" />
        </header>
        <section className="hero">
          <div className="heroTop">
            <div>
              <p className="kicker">Jnbk جنبك</p>
              <h1>{t.title}</h1>
              <p>{t.denied}</p>
            </div>
            <a className="languageSwitch" href={`/portal?lang=${lang}`}>Portal</a>
          </div>
        </section>
      </main>
    );
  }

  const openCount = support.filter((x) => !x.status || x.status === 'OPEN' || x.status === 'IN_REVIEW' || x.status === 'open').length;
  const activeCount = drivers.filter((d) => d.online || d.status === 'approved').length;

  return (
    <main dir={rtl ? 'rtl' : 'ltr'} style={{ textAlign: rtl ? 'right' : 'left' }}>
      <header className="site-header">
        <Image src="/logo.png" alt="Jnbk جنبك" width={120} height={52} className="site-logo" />
        <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 8 }}>
          <button className="languageSwitch buttonReset" onClick={() => logout(lang)}>{t.back}</button>
          <a className="languageSwitch" href={`?lang=${lang === 'ar' ? 'en' : 'ar'}`}>{t.toggle}</a>
        </div>
      </header>

      <section className="hero">
        <div className="heroTop">
          <div>
            <div className="hero-logo">
              <Image src="/logo.png" alt="Jnbk" width={64} height={56} style={{ filter: 'brightness(0) invert(1)', height: 52, width: 'auto' }} />
            </div>
            <p className="kicker">Jnbk جنبك</p>
            <h1>{t.title}</h1>
            <p>{t.sub}</p>
          </div>
        </div>
      </section>

      <section className="grid settingsGrid">
        <div className="card"><p>{t.rides}</p><strong>{rides.length}</strong></div>
        <div className="card"><p>{t.drivers}</p><strong>{drivers.length}</strong></div>
        <div className="card"><p>{t.support}</p><strong>{openCount}</strong></div>
        <div className="card"><p>{t.online}</p><strong>{activeCount}</strong></div>
      </section>

      <section className="panel">
        <h2>{t.source}</h2>
        <p className="muted">{source}</p>
      </section>

      <section className="panel">
        <h2>{t.tasks}</h2>
        <div className="table">
          <div className="row">
            <span>{t.shift}</span>
            <span>{lang === 'ar' ? 'متابعة الرحلات والسائقين والبلاغات العاجلة' : 'Track rides, drivers, urgent issues'}</span>
            <span>Daily</span>
            <b>Active</b>
          </div>
          <div className="row">
            <span>{t.supportRole}</span>
            <span>{lang === 'ar' ? 'إغلاق طلبات الدعم وتوثيق الشكاوى' : 'Close support tickets and document complaints'}</span>
            <span>Daily</span>
            <b>Active</b>
          </div>
          <div className="row">
            <span>{t.finance}</span>
            <span>{lang === 'ar' ? 'مراجعة الإيرادات والمصروفات ونسب الأرباح' : 'Review revenue, costs, and profit shares'}</span>
            <span>Monthly</span>
            <b>Review</b>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>{t.support}</h2>
        <div className="table">
          {support.slice(0, 8).map((x) => (
            <div className="row" key={x.id}>
              <span>{x.category || 'Support'}</span>
              <span>{truncate(x.message)}</span>
              <span>{x.lang || 'ar'}</span>
              <b>{x.status || 'OPEN'}</b>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>{t.drivers}</h2>
        <div className="table">
          {drivers.slice(0, 8).map((d) => (
            <div className="row" key={d.id}>
              <span>{d.name || d.phone || d.id}</span>
              <span>{d.cityId || 'rufaa'}</span>
              <span>{d.verified ? t.verified : t.pending}</span>
              <b>{d.online ? t.online : (d.status || t.offline)}</b>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
