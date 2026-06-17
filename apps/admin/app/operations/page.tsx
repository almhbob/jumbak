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
    refresh: 'تحديث', reviewApps: 'مراجعة الطلبات ←', category: 'الفئة', message: 'الرسالة', status: 'الحالة', actions: 'الإجراء',
    driver: 'السائق', city: 'المدينة', approval: 'الاعتماد', task: 'المهمة', cadence: 'الدورية', result: 'المؤشر',
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
    refresh: 'Refresh', reviewApps: 'Review applications →', category: 'Category', message: 'Message', status: 'Status', actions: 'Actions',
    driver: 'Driver', city: 'City', approval: 'Approval', task: 'Task', cadence: 'Cadence', result: 'Result',
  },
};

function truncate(message?: string) {
  const text = message || '';
  return text.length > 96 ? `${text.slice(0, 96)}...` : text;
}

function logout(lang: Lang) {
  sessionStorage.clear();
  window.location.href = `/portal?lang=${lang}`;
}

function badgeClass(status?: string) {
  if (!status || status === 'OPEN' || status === 'open') return 'adminBadge adminBadgeDanger';
  if (status === 'IN_REVIEW') return 'adminBadge adminBadgeWarn';
  if (status === 'CLOSED' || status === 'RESOLVED') return 'adminBadge adminBadgeSuccess';
  return 'adminBadge adminBadgeMuted';
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
        <div className="adminToolbar" style={{ marginInlineStart: 'auto' }}>
          {lastRefresh && (
            <span className="adminBadge adminBadgeMuted">
              {lang === 'ar' ? 'آخر تحديث' : 'Updated'} {lastRefresh.toLocaleTimeString(lang === 'ar' ? 'ar' : 'en', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button className="languageSwitch buttonReset" onClick={refresh} title={t.refresh}>↻ {t.refresh}</button>
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

      <section className="adminStatGrid">
        <div className="card"><p>{t.rides}</p><strong>{rides.length}</strong></div>
        <div className="card"><p>{t.drivers}</p><strong>{drivers.length}</strong></div>
        <div className="card"><p>{t.support}</p><strong style={{ background: 'none', WebkitTextFillColor: openCount > 0 ? '#f59e0b' : '#10b981', color: openCount > 0 ? '#f59e0b' : '#10b981' }}>{openCount}</strong></div>
        <div className="card"><p>{t.online}</p><strong style={{ background: 'none', WebkitTextFillColor: '#10b981', color: '#10b981' }}>{activeCount}</strong></div>
      </section>

      <section className="panel">
        <div className="adminSectionHeader" style={{ marginTop: 0 }}>
          <div>
            <h2>{t.connection}</h2>
            <p className="muted" style={{ margin: 0 }}>{t.source}: {source}</p>
          </div>
          <span className={`adminBadge ${connection.ok ? 'adminBadgeSuccess' : connection.configured ? 'adminBadgeDanger' : 'adminBadgeWarn'}`}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: sourceColor, display: 'inline-block', boxShadow: `0 0 9px ${sourceColor}` }} />
            {connection.label}
          </span>
        </div>
        <p className="muted" style={{ margin: 0, wordBreak: 'break-word' }}>{connection.detail}</p>
      </section>

      <section className="panel">
        <div className="adminSectionHeader" style={{ marginTop: 0 }}>
          <h2>{t.tasks}</h2>
        </div>
        <div className="adminTable">
          <div className="adminTableHead opsTasksGrid"><span>{t.task}</span><span>{t.message}</span><span>{t.cadence}</span><span>{t.result}</span></div>
          <div className="adminTableRow opsTasksGrid"><strong>{t.shift}</strong><span>{lang === 'ar' ? 'متابعة الرحلات والسائقين والبلاغات العاجلة' : 'Track rides, drivers, urgent issues'}</span><span className="adminBadge">Daily</span><b>Active</b></div>
          <div className="adminTableRow opsTasksGrid"><strong>{t.supportRole}</strong><span>{lang === 'ar' ? 'إغلاق طلبات الدعم وتوثيق الشكاوى' : 'Close support tickets and document complaints'}</span><span className="adminBadge">Daily</span><b>Active</b></div>
          <div className="adminTableRow opsTasksGrid"><strong>{t.finance}</strong><span>{lang === 'ar' ? 'مراجعة الإيرادات والمصروفات ونسب الأرباح' : 'Review revenue, costs, and profit shares'}</span><span className="adminBadge">Monthly</span><b>{completedCount}</b></div>
        </div>
      </section>

      <section className="panel">
        <div className="adminSectionHeader" style={{ marginTop: 0 }}>
          <h2>{t.support}</h2>
          <span className="adminBadge adminBadgeWarn">{openCount}</span>
        </div>
        <div className="adminTable">
          <div className="adminTableHead opsSupportGrid"><span>{t.category}</span><span>{t.message}</span><span>{t.status}</span><span>{t.actions}</span></div>
          {support.slice(0, 10).map((x) => {
            const isOpen = !x.status || x.status === 'OPEN';
            const isInReview = x.status === 'IN_REVIEW';
            const isClosed = x.status === 'CLOSED' || x.status === 'RESOLVED';
            const isUpdating = updatingTicket === x.id;
            return (
              <div key={x.id} className="adminTableRow opsSupportGrid">
                <strong>{x.category || 'Support'}</strong>
                <span className="adminTableSub" style={{ marginTop: 0 }}>{truncate(x.message)}</span>
                <span className={badgeClass(x.status)}>{x.status || 'OPEN'}</span>
                <div className="adminToolbar">
                  {!isClosed && isOpen && (
                    <button disabled={isUpdating} onClick={() => updateTicketStatus(x.id, 'IN_REVIEW')} className="adminMiniButton adminMiniButtonWarn">
                      {t.inReview}
                    </button>
                  )}
                  {!isClosed && (
                    <button disabled={isUpdating} onClick={() => updateTicketStatus(x.id, 'CLOSED')} className="adminMiniButton adminMiniButtonSuccess">
                      {t.closeTicket}
                    </button>
                  )}
                  {isClosed && <span className="adminBadge adminBadgeSuccess">{x.status}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="adminSectionHeader" style={{ marginTop: 0 }}>
          <h2>{t.drivers}</h2>
          <a className="languageSwitch" href={`/drivers?lang=${lang}`}>{t.reviewApps}</a>
        </div>
        <div className="adminTable">
          <div className="adminTableHead opsDriversGrid"><span>{t.driver}</span><span>{t.city}</span><span>{t.approval}</span><span>{t.status}</span></div>
          {drivers.slice(0, 10).map((d) => {
            const isToggling = togglingDriver === d.id;
            return (
              <div key={d.id} className="adminTableRow opsDriversGrid">
                <strong>{d.name || d.phone || d.id}<span className="adminTableSub">{d.phone || d.id}</span></strong>
                <span className="adminBadge">{d.cityId || 'rufaa'}</span>
                <span className={d.verified ? 'adminBadge adminBadgeSuccess' : 'adminBadge adminBadgeWarn'}>{d.verified ? t.verified : t.pending}</span>
                <button
                  disabled={isToggling || d.id.startsWith('driver_1')}
                  onClick={() => toggleDriverOnline(d)}
                  className={`adminMiniButton ${d.online ? 'adminMiniButtonSuccess' : 'adminMiniButtonMuted'}`}
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
