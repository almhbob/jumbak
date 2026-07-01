'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { apiGet, apiPatch, isApiConfigured } from '../lib/apiClient';

type Lang = 'ar' | 'en';

type SuspendedDriver = { id: string; name: string; phone: string; suspendedUntil: string; violationCount: number };
type SuspendedUser = { id: string; name: string; phone: string; suspendedUntil: string };
type RejectionEntry = { id: string; name: string; phone: string; dailyRejections: number; violationCount: number };
type MonitorData = {
  suspendedDrivers: SuspendedDriver[];
  suspendedPassengers: SuspendedUser[];
  pendingOffers: number;
  openRides: number;
  todayRejections: RejectionEntry[];
};

const copy = {
  ar: {
    title: 'مراقبة التوزيع',
    sub: 'حالات التعليق، العروض المعلقة، ورفضيات السائقين اليوم.',
    back: 'خروج',
    toggle: 'English',
    denied: 'هذه الصفحة مخصصة للمشرفين والتشغيل فقط.',
    suspendedDrivers: 'السائقون الموقوفون',
    suspendedPassengers: 'الركاب الموقوفون',
    pendingOffers: 'عروض معلقة',
    openRides: 'رحلات بلا سائق',
    todayRejections: 'رفضيات اليوم',
    unsuspend: 'رفع التعليق',
    refresh: 'تحديث',
    violations: 'مخالفات',
    rejections: 'رفضيات',
    until: 'معلق حتى',
    phone: 'الهاتف',
    none: 'لا يوجد',
    preview: 'ربط الخادم مطلوب',
  },
  en: {
    title: 'Dispatch Monitor',
    sub: 'Active suspensions, pending offers, and today\'s rejections.',
    back: 'Logout',
    toggle: 'العربية',
    denied: 'This page is for supervisors and operations only.',
    suspendedDrivers: 'Suspended Drivers',
    suspendedPassengers: 'Suspended Passengers',
    pendingOffers: 'Pending Offers',
    openRides: 'Unassigned Rides',
    todayRejections: "Today's Rejections",
    unsuspend: 'Unsuspend',
    refresh: 'Refresh',
    violations: 'violations',
    rejections: 'rejections',
    until: 'Until',
    phone: 'Phone',
    none: 'None',
    preview: 'Backend connection required',
  },
};

function logout(lang: Lang) {
  sessionStorage.clear();
  window.location.href = `/portal?lang=${lang}`;
}

export default function Monitor() {
  const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
  const lang: Lang = params.get('lang') === 'en' ? 'en' : 'ar';
  const t = copy[lang];
  const rtl = lang === 'ar';

  const [allowed, setAllowed] = useState(false);
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [unsuspending, setUnsuspending] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    if (!isApiConfigured()) return;
    setLoading(true);
    try {
      const result = await apiGet<MonitorData>('/api/admin/dispatch-monitor', {
        suspendedDrivers: [],
        suspendedPassengers: [],
        pendingOffers: 0,
        openRides: 0,
        todayRejections: [],
      });
      setData(result);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }

  async function unsuspendDriver(id: string) {
    setUnsuspending(id);
    try {
      await apiPatch(`/api/admin/drivers/${encodeURIComponent(id)}/unsuspend`, {});
      setData((prev) =>
        prev ? { ...prev, suspendedDrivers: prev.suspendedDrivers.filter((d) => d.id !== id) } : prev
      );
    } finally {
      setUnsuspending(null);
    }
  }

  async function unsuspendPassenger(id: string) {
    setUnsuspending(id);
    try {
      await apiPatch(`/api/admin/users/${encodeURIComponent(id)}/unsuspend`, {});
      setData((prev) =>
        prev ? { ...prev, suspendedPassengers: prev.suspendedPassengers.filter((u) => u.id !== id) } : prev
      );
    } finally {
      setUnsuspending(null);
    }
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleString(lang === 'ar' ? 'ar-SD' : 'en-GB', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  }

  useEffect(() => {
    const role = sessionStorage.getItem('jnbk_active_role') || '';
    const ok =
      sessionStorage.getItem('jnbk_operations_auth') === 'true' &&
      ['operations', 'supervisor', 'developer'].includes(role);
    setAllowed(ok);
    if (ok) {
      load();
      pollRef.current = setInterval(load, 30_000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  if (!allowed) {
    return (
      <main dir={rtl ? 'rtl' : 'ltr'} style={{ textAlign: rtl ? 'right' : 'left' }}>
        <header className="site-header">
          <Image src="/logo.png" alt="Jnbk" width={120} height={52} className="site-logo" />
        </header>
        <section className="hero">
          <div className="heroTop"><div><p className="kicker">Jnbk جنبك</p><h1>{t.title}</h1><p>{t.denied}</p></div></div>
        </section>
      </main>
    );
  }

  return (
    <main dir={rtl ? 'rtl' : 'ltr'} style={{ textAlign: rtl ? 'right' : 'left' }}>
      <header className="site-header">
        <Image src="/logo.png" alt="Jnbk" width={120} height={52} className="site-logo" />
        <div className="adminToolbar" style={{ marginInlineStart: 'auto' }}>
          {lastRefresh && (
            <span className="adminBadge adminBadgeMuted">
              {lang === 'ar' ? 'آخر تحديث' : 'Updated'}{' '}
              {lastRefresh.toLocaleTimeString(lang === 'ar' ? 'ar' : 'en', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button className="languageSwitch buttonReset" onClick={load} disabled={loading}>
            ↻ {t.refresh}
          </button>
          <button className="languageSwitch buttonReset" onClick={() => logout(lang)}>{t.back}</button>
          <a className="languageSwitch" href={`?lang=${lang === 'ar' ? 'en' : 'ar'}`}>{t.toggle}</a>
        </div>
      </header>

      <section className="hero">
        <div className="heroTop">
          <div>
            <p className="kicker">Jnbk جنبك</p>
            <h1>{t.title}</h1>
            <p>{t.sub}</p>
          </div>
        </div>
      </section>

      {!isApiConfigured() && (
        <section className="panel">
          <p className="muted">{t.preview}</p>
        </section>
      )}

      {/* KPI row */}
      <section className="adminStatGrid">
        <div className="card">
          <p>{t.suspendedDrivers}</p>
          <strong style={{ background: 'none', WebkitTextFillColor: '#EF4444', color: '#EF4444' }}>
            {data?.suspendedDrivers.length ?? '—'}
          </strong>
        </div>
        <div className="card">
          <p>{t.suspendedPassengers}</p>
          <strong style={{ background: 'none', WebkitTextFillColor: '#F59E0B', color: '#F59E0B' }}>
            {data?.suspendedPassengers.length ?? '—'}
          </strong>
        </div>
        <div className="card">
          <p>{t.pendingOffers}</p>
          <strong>{data?.pendingOffers ?? '—'}</strong>
        </div>
        <div className="card">
          <p>{t.openRides}</p>
          <strong>{data?.openRides ?? '—'}</strong>
        </div>
      </section>

      {/* Suspended Drivers */}
      <section className="panel">
        <div className="adminSectionHeader" style={{ marginTop: 0 }}>
          <h2>{t.suspendedDrivers}</h2>
          <span className="adminBadge adminBadgeDanger">{data?.suspendedDrivers.length ?? 0}</span>
        </div>
        {!data?.suspendedDrivers.length ? (
          <p className="muted">{t.none}</p>
        ) : (
          <div className="adminTable">
            <div className="adminTableHead" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto' }}>
              <span>{lang === 'ar' ? 'السائق' : 'Driver'}</span>
              <span>{t.until}</span>
              <span>{t.violations}</span>
              <span></span>
            </div>
            {data.suspendedDrivers.map((d) => (
              <div key={d.id} className="adminTableRow" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', alignItems: 'center' }}>
                <div>
                  <strong>{d.name}</strong>
                  <span className="adminTableSub">{d.phone}</span>
                </div>
                <span className="adminBadge adminBadgeDanger">{formatDate(d.suspendedUntil)}</span>
                <span>{d.violationCount}</span>
                <button
                  className="adminMiniButton adminMiniButtonSuccess"
                  disabled={unsuspending === d.id}
                  onClick={() => unsuspendDriver(d.id)}
                >
                  {unsuspending === d.id ? '...' : t.unsuspend}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Suspended Passengers */}
      <section className="panel">
        <div className="adminSectionHeader" style={{ marginTop: 0 }}>
          <h2>{t.suspendedPassengers}</h2>
          <span className="adminBadge adminBadgeWarn">{data?.suspendedPassengers.length ?? 0}</span>
        </div>
        {!data?.suspendedPassengers.length ? (
          <p className="muted">{t.none}</p>
        ) : (
          <div className="adminTable">
            <div className="adminTableHead" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto' }}>
              <span>{lang === 'ar' ? 'الراكب' : 'Passenger'}</span>
              <span>{t.until}</span>
              <span></span>
            </div>
            {data.suspendedPassengers.map((u) => (
              <div key={u.id} className="adminTableRow" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', alignItems: 'center' }}>
                <div>
                  <strong>{u.name}</strong>
                  <span className="adminTableSub">{u.phone}</span>
                </div>
                <span className="adminBadge adminBadgeWarn">{formatDate(u.suspendedUntil)}</span>
                <button
                  className="adminMiniButton adminMiniButtonSuccess"
                  disabled={unsuspending === u.id}
                  onClick={() => unsuspendPassenger(u.id)}
                >
                  {unsuspending === u.id ? '...' : t.unsuspend}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Today's Rejections */}
      <section className="panel">
        <div className="adminSectionHeader" style={{ marginTop: 0 }}>
          <h2>{t.todayRejections}</h2>
          <span className="adminBadge adminBadgeWarn">{data?.todayRejections.length ?? 0}</span>
        </div>
        {!data?.todayRejections.length ? (
          <p className="muted">{t.none}</p>
        ) : (
          <div className="adminTable">
            <div className="adminTableHead" style={{ display: 'grid', gridTemplateColumns: '1fr auto auto' }}>
              <span>{lang === 'ar' ? 'السائق' : 'Driver'}</span>
              <span>{t.rejections}</span>
              <span>{t.violations}</span>
            </div>
            {data.todayRejections.map((d) => (
              <div key={d.id} className="adminTableRow" style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: 12 }}>
                <div>
                  <strong>{d.name}</strong>
                  <span className="adminTableSub">{d.phone}</span>
                </div>
                <span className={`adminBadge ${d.dailyRejections >= 2 ? 'adminBadgeDanger' : 'adminBadgeWarn'}`}>
                  {d.dailyRejections}
                </span>
                <span className="adminBadge">{d.violationCount}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
