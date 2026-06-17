'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { getOpsSource, loadOpsDrivers, loadOpsRides, loadOpsSupport, OpsDriver, OpsRide, OpsSupport } from './firebaseOps';
import { apiPatch, checkApiHealth, getApiUrl, isApiConfigured } from '../lib/apiClient';

type Lang = 'ar' | 'en';
type ConnectionState = {
  ok: boolean;
  configured: boolean;
  label: string;
  detail: string;
};

const fallbackDrivers: OpsDriver[] = [{ id: 'driver_1', name: 'Preview Driver', online: true, verified: true, cityId: 'rufaa' }];
const fallbackSupport: OpsSupport[] = [{ id: 'support_preview_1', category: 'Preview', message: 'Firebase/backend requests appear here.', lang: 'en', status: 'OPEN' }];

const copy = {
  ar: {
    title: 'لوحة إدارة التطبيق',
    sub: 'مساحة التشغيل اليومية: الرحلات، السائقين، الدعم، ومؤشرات الأداء.',
    back: 'خروج', support: 'طلبات الدعم', drivers: 'السائقون', rides: 'الرحلات', tasks: 'تقسيم المهام اليومي',
    shift: 'مسؤول الوردية', supportRole: 'الدعم الفني', finance: 'المحاسبة', online: 'متصل', offline: 'غير متصل',
    verified: 'معتمد', pending: 'قيد المراجعة', toggle: 'English', source: 'مصدر البيانات',
    denied: 'هذه الصفحة مخصصة لحسابات التشغيل والمشرفين ومسؤولي العملاء فقط. سجّل الدخول من البوابة الموحدة.',
    closeTicket: 'إغلاق', inReview: 'قيد المراجعة', closedLabel: 'مغلق', resolvedLabel: 'محلول',
    connection: 'حالة الربط', apiOnline: 'الخادم متصل ويعمل', apiOffline: 'الخادم غير متصل أو رابط API غير صحيح',
    preview: 'وضع المعاينة — اربط NEXT_PUBLIC_API_URL حتى تعمل اللوحة مع التطبيق مباشرة',
    refresh: 'تحديث', reviewApps: 'مراجعة الطلبات ←',
  },
  en: {
    title: 'Operations Dashboard',
    sub: 'Daily workspace: rides, drivers, support, and performance indicators.',
    back: 'Logout', support: 'Support', drivers: 'Drivers', rides: 'Rides', tasks: 'Daily task split',
    shift: 'Shift lead', supportRole: 'Support team', finance: 'Finance', online: 'Online', offline: 'Offline',
    verified: 'Verified', pending: 'Pending', toggle: 'العربية', source: 'Data source',
    denied: 'This page is only for operations, supervisor, and customer support accounts. Log in from the unified portal.',
    closeTicket: 'Close', inReview: 'In review', closedLabel: 'Closed', resolvedLabel: 'Resolved',
    connection: 'Connection status', apiOnline: 'Backend is online and reachable', apiOffline: 'Backend is offline or API URL is incorrect',
    preview: 'Preview mode — connect NEXT_PUBLIC_API_URL so the dashboard works live with the app',
    refresh: 'Refresh', reviewApps: 'Review applications →',
  },
};

function truncate(message?: string) {
  const text = message || '';
  return text.length > 70 ? `${text.slice(0, 70)}...` : text;
}

function logout(lang: Lang) {
  sessionStorage.clear();
  window.location.href = `/portal?lang=${lang}`;
}

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
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [connection, setConnection] = useState<ConnectionState>({
    ok: false,
    configured: isApiConfigured(),
    label: isApiConfigured() ? t.apiOffline : t.preview,
    detail: getApiUrl() || 'NEXT_PUBLIC_API_URL',
  });
  const [updatingTicket, setUpdatingTicket] = useState<string | null>(null);
  const [togglingDriver, setTogglingDriver] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function refresh() {
    Promise.all([
      loadOpsDrivers(fallbackDrivers).then(setDrivers),
      loadOpsRides([]).then(setRides),
      loadOpsSupport(fallbackSupport).then(setSupport),
      checkApiHealth().then((health) => {
        setConnection({
          ok: health.ok,
          configured: health.configured,
          label: health.configured ? (health.ok ? t.apiOnline : t.apiOffline) : t.preview,
          detail: health.configured ? `${getApiUrl()} — ${health.message}` : 'NEXT_PUBLIC_API_URL',
        });
      }),
    ]).finally(() => setLastRefresh(new Date()));
  }

  async function toggleDriverOnline(driver: OpsDriver) {
    const newOnline = !driver.online;
    setTogglingDriver(driver.id);
    setDrivers((prev) => prev.map((d) => (d.id === driver.id ? { ...d, online: newOnline } : d)));
    try {
      await apiPatch(`/api/drivers/${encodeURIComponent(driver.id)}/online`, { isOnline: newOnline });
    } catch {
      setDrivers((prev) => prev.map((d) => (d.id === driver.id ? { ...d, online: driver.online } : d)));
    } finally {
      setTogglingDriver(null);
    }
  }

  async function updateTicketStatus(id: string, status: 'IN_REVIEW' | 'RESOLVED' | 'CLOSED') {
    if (id.startsWith('support_preview')) {
      setSupport((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
      return;
    }
    setUpdatingTicket(id);
    try {
      await apiPatch(`/api/support/${id}/status`, { status });
      setSupport((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
    } finally {
      setUpdatingTicket(null);
    }
  }

  useEffect(() => {
    const role = sessionStorage.getItem('jnbk_active_role') || '';
    const ok = sessionStorage.getItem('jnbk_operations_auth') === 'true' && ['operations', 'supervisor', 'support'].includes(role);
    setAllowed(ok);
    setSource(getOpsSource(lang));
    if (ok) {
      refresh();
      pollRef.current = setInterval(refresh, 15000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
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
  const completedCount = rides.filter((r) => r.status === 'COMPLETED' || r.status === 'completed').length;
  const sourceColor = connection.ok ? '#10b981' : connection.configured ? '#ef4444' : '#f59e0b';

  return (
    <main dir={rtl ? 'rtl' : 'ltr'} style={{ textAlign: rtl ? 'right' : 'left' }}>
      <header className="site-header">
        <Image src="/logo.png" alt="Jnbk جنبك" width={120} height={52} className="site-logo" />
        <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {lastRefresh && (
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>
              {lang === 'ar' ? 'آخر تحديث' : 'Updated'} {lastRefresh.toLocaleTimeString(lang === 'ar' ? 'ar' : 'en', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button className="languageSwitch buttonReset" onClick={refresh} title={t.refresh}>↻</button>
          <a className="languageSwitch" href={`/drivers?lang=${lang}`}>{lang === 'ar' ? 'الجوكية' : 'Drivers'}</a>
          <a className="languageSwitch" href={`/pricing?lang=${lang}`}>{lang === 'ar' ? 'التسعير' : 'Pricing'}</a>
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
        <h2>{t.connection}</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: sourceColor, display: 'inline-block', marginTop: 5, boxShadow: `0 0 9px ${sourceColor}` }} />
          <div>
            <p style={{ margin: 0, fontWeight: 900, color: sourceColor }}>{connection.label}</p>
            <p className="muted" style={{ margin: '4px 0 0', wordBreak: 'break-word' }}>{connection.detail}</p>
            <p className="muted" style={{ margin: '4px 0 0' }}>{t.source}: {source}</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>{t.tasks}</h2>
        <div className="table">
          <div className="row"><span>{t.shift}</span><span>{lang === 'ar' ? 'متابعة الرحلات والسائقين والبلاغات العاجلة' : 'Track rides, drivers, urgent issues'}</span><span>Daily</span><b>Active</b></div>
          <div className="row"><span>{t.supportRole}</span><span>{lang === 'ar' ? 'إغلاق طلبات الدعم وتوثيق الشكاوى' : 'Close support tickets and document complaints'}</span><span>Daily</span><b>Active</b></div>
          <div className="row"><span>{t.finance}</span><span>{lang === 'ar' ? 'مراجعة الإيرادات والمصروفات ونسب الأرباح' : 'Review revenue, costs, and profit shares'}</span><span>Monthly</span><b>{completedCount}</b></div>
        </div>
      </section>

      <section className="panel">
        <h2>{t.support}</h2>
        <div className="table">
          {support.slice(0, 10).map((x) => {
            const isOpen = !x.status || x.status === 'OPEN';
            const isInReview = x.status === 'IN_REVIEW';
            const isClosed = x.status === 'CLOSED' || x.status === 'RESOLVED';
            const isUpdating = updatingTicket === x.id;
            const statusColor = isClosed ? '#10b981' : isInReview ? '#f59e0b' : '#ef4444';
            return (
              <div key={x.id} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto auto', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{x.category || 'Support'}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{truncate(x.message)}</span>
                <b style={{ fontSize: 11, color: statusColor, whiteSpace: 'nowrap' }}>{x.status || 'OPEN'}</b>
                {!isClosed && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    {isOpen && (
                      <button disabled={isUpdating} onClick={() => updateTicketStatus(x.id, 'IN_REVIEW')} style={{ background: '#f59e0b', color: 'white', border: 'none', borderRadius: 6, padding: '4px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: isUpdating ? 0.5 : 1 }}>
                        {t.inReview}
                      </button>
                    )}
                    <button disabled={isUpdating} onClick={() => updateTicketStatus(x.id, 'CLOSED')} style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: 6, padding: '4px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: isUpdating ? 0.5 : 1 }}>
                      {t.closeTicket}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>{t.drivers}</h2>
          <a className="languageSwitch" href={`/drivers?lang=${lang}`} style={{ fontSize: 12 }}>{t.reviewApps}</a>
        </div>
        <div className="table">
          {drivers.slice(0, 10).map((d) => {
            const isToggling = togglingDriver === d.id;
            return (
              <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 700 }}>{d.name || d.phone || d.id}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.cityId || 'rufaa'}</span>
                <b style={{ fontSize: 11, color: d.verified ? '#10b981' : '#f59e0b' }}>{d.verified ? t.verified : t.pending}</b>
                <button
                  disabled={isToggling || d.id.startsWith('driver_1')}
                  onClick={() => toggleDriverOnline(d)}
                  style={{
                    padding: '4px 12px', borderRadius: 20, border: 'none',
                    background: d.online ? '#10b981' : '#94a3b8',
                    color: 'white', fontWeight: 700, fontSize: 11,
                    cursor: (isToggling || d.id.startsWith('driver_1')) ? 'not-allowed' : 'pointer',
                    opacity: isToggling ? 0.5 : 1, transition: 'all 0.18s', whiteSpace: 'nowrap',
                  }}
                >
                  {isToggling ? '...' : (d.online ? t.online : t.offline)}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
