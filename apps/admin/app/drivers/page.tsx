'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getClientFirebaseCollection, isClientFirebaseConfigured, updateClientFirebaseDocument } from '../lib/firebaseClient';
import { apiGet, apiPatch, isApiConfigured } from '../lib/apiClient';

type Lang = 'ar' | 'en';
type DriverApplication = {
  id: string; name?: string; phone?: string; cityId?: string; vehicleTypeId?: string;
  plateNo?: string; color?: string; model?: string; nationalId?: string;
  chassisNo?: string; trafficId?: string; bankAccount?: string;
  guarantorName?: string; guarantorPhone?: string; guarantorAddress?: string;
  status?: string; complianceStatus?: string; freeMonth?: boolean;
  approvedAt?: string; rejectedAt?: string; reviewedBy?: string;
};

const fallback: DriverApplication[] = [{
  id: 'preview_1', name: 'Preview Driver', phone: '+249900000000',
  cityId: 'rufaa', vehicleTypeId: 'rickshaw', plateNo: 'RF-000',
  guarantorName: 'Preview Guarantor', guarantorPhone: '+249900000001',
  status: 'pending_review', complianceStatus: 'needs_admin_review', freeMonth: true,
}];

const copy = {
  ar: {
    title: 'مراجعة ملفات الجوكية',
    sub: 'اعتماد ومتابعة طلبات السائقين، بيانات الضامن، المركبة، والشهر المجاني.',
    portal: 'بوابة الدخول', home: 'الرئيسية', toggle: 'English',
    total: 'إجمالي الطلبات', pending: 'قيد المراجعة', approved: 'معتمد', rejected: 'مرفوض', free: 'شهر مجاني',
    driver: 'الجوكي', vehicle: 'المركبة', guarantor: 'الضامن', compliance: 'الامتثال',
    approve: 'اعتماد', reject: 'رفض', missing: 'غير مكتمل', source: 'مصدر البيانات',
    denied: 'هذه الصفحة مخصصة للإدارة والتشغيل فقط. سجّل الدخول من البوابة الموحدة.',
    openPortal: 'فتح بوابة الدخول',
    saved: 'تم حفظ القرار بنجاح ✓',
    local: 'تم تحديث الواجهة محليًا للمعاينة',
    failed: 'تعذر الحفظ — تحقق من الاتصال',
    processing: 'جارٍ الحفظ...',
    notes: 'سبب الرفض (اختياري)',
    confirmApprove: 'هل تريد اعتماد هذا الجوكي؟',
    confirmReject: 'هل تريد رفض هذا الطلب؟',
    backend: 'Backend API متصل بالتوكن',
    firebase: 'Firebase Firestore',
    preview: 'وضع المعاينة',
  },
  en: {
    title: 'Driver Application Review',
    sub: 'Approve and track driver files, guarantor details, vehicles, and free month status.',
    portal: 'Portal', home: 'Home', toggle: 'العربية',
    total: 'Total applications', pending: 'Pending', approved: 'Approved', rejected: 'Rejected', free: 'Free month',
    driver: 'Driver', vehicle: 'Vehicle', guarantor: 'Guarantor', compliance: 'Compliance',
    approve: 'Approve', reject: 'Reject', missing: 'Missing', source: 'Data source',
    denied: 'This page is only for management and operations accounts. Log in from the unified portal.',
    openPortal: 'Open portal',
    saved: 'Decision saved successfully ✓',
    local: 'UI updated locally for preview',
    failed: 'Could not save — check connection',
    processing: 'Saving...',
    notes: 'Rejection reason (optional)',
    confirmApprove: 'Approve this driver application?',
    confirmReject: 'Reject this application?',
    backend: 'Backend API with auth token',
    firebase: 'Firebase Firestore',
    preview: 'Preview mode',
  },
};

function goPortal(lang: Lang) { window.location.assign(`/portal?lang=${lang}`); }
function logout(lang: Lang) { sessionStorage.clear(); goPortal(lang); }

function statusBadge(status?: string) {
  if (!status || status === 'pending_review' || status === 'needs_admin_review') return { color: '#f59e0b', label: '⏳' };
  if (status === 'approved') return { color: '#10b981', label: '✓' };
  return { color: '#ef4444', label: '✗' };
}

export default function DriversReview() {
  const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
  const lang: Lang = params.get('lang') === 'en' ? 'en' : 'ar';
  const ar = lang === 'ar';
  const t = copy[lang];

  const [allowed, setAllowed] = useState(false);
  const [items, setItems] = useState<DriverApplication[]>(fallback);
  const [source, setSource] = useState(t.preview);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const rejectNoteRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const role = sessionStorage.getItem('jnbk_active_role') || '';
    const ok = ['operations', 'supervisor', 'business', 'developer'].includes(role) ||
      sessionStorage.getItem('jnbk_operations_auth') === 'true';
    setAllowed(ok);
    if (!ok) return;

    getClientFirebaseCollection<DriverApplication>('driverApplications', fallback).then(async (data) => {
      if (isClientFirebaseConfigured()) {
        setSource(t.firebase);
        setItems(data.length ? data : fallback);
        return;
      }

      if (isApiConfigured()) {
        setSource(t.backend);
        const apiData = await apiGet<DriverApplication[]>('/api/drivers/applications', fallback);
        setItems(apiData.length ? apiData : fallback);
        return;
      }

      setSource(t.preview);
      setItems(fallback);
    });
  }, []);

  const stats = useMemo(() => ({
    total: items.length,
    pending: items.filter((x) => !x.status || x.status === 'pending_review').length,
    approved: items.filter((x) => x.status === 'approved').length,
    rejected: items.filter((x) => x.status === 'rejected').length,
  }), [items]);

  async function review(item: DriverApplication, status: 'approved' | 'rejected', note?: string) {
    if (status === 'approved' && !window.confirm(t.confirmApprove)) return;

    setProcessingId(item.id);
    setRejectingId(null);
    setNotice(null);

    setItems((prev) => prev.map((x) => x.id === item.id
      ? { ...x, status, complianceStatus: status === 'approved' ? 'approved' : 'rejected' }
      : x
    ));

    const reviewedBy = sessionStorage.getItem('jnbk_active_role') || 'operations';
    const payload = {
      status,
      complianceStatus: status === 'approved' ? 'approved' : 'rejected',
      reviewedBy,
      ...(note ? { notes: note } : {}),
      [status === 'approved' ? 'approvedAt' : 'rejectedAt']: new Date().toISOString(),
    };

    let serverOk = false;

    if (isApiConfigured() && !item.id.startsWith('preview_')) {
      try {
        await apiPatch(`/api/drivers/applications/${encodeURIComponent(item.id)}/review`, { status, reviewedBy, notes: note || '' });
        serverOk = true;
      } catch {
        if (item.id) {
          try {
            await apiPatch(`/api/drivers/${encodeURIComponent(item.id)}/verify`, { status, reviewedBy, notes: note || '' });
            serverOk = true;
          } catch { /* Firebase only */ }
        }
      }
    }

    if (isClientFirebaseConfigured() && !item.id.startsWith('preview_')) {
      try {
        await updateClientFirebaseDocument('driverApplications', item.id, payload);
        setNotice({ type: 'success', text: t.saved });
      } catch {
        setNotice({ type: serverOk ? 'success' : 'error', text: serverOk ? t.saved : t.failed });
      }
    } else {
      setNotice({ type: serverOk ? 'success' : 'error', text: serverOk ? t.saved : t.local });
    }

    setProcessingId(null);
  }

  if (!allowed) {
    return (
      <main dir={ar ? 'rtl' : 'ltr'} style={{ textAlign: ar ? 'right' : 'left' }}>
        <section className="hero">
          <div className="heroTop">
            <div><p className="kicker">Jnbk جنبك</p><h1>{t.title}</h1><p>{t.denied}</p></div>
            <div className="topActions">
              <button type="button" className="primaryAction buttonReset" onClick={() => goPortal(lang)}>{t.openPortal}</button>
              <a className="languageSwitch" href={`/portal?lang=${lang}`}>{t.portal}</a>
              <a className="languageSwitch" href="/">{t.home}</a>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main dir={ar ? 'rtl' : 'ltr'} style={{ textAlign: ar ? 'right' : 'left' }}>
      <section className="hero">
        <div className="heroTop">
          <div>
            <p className="kicker">Jnbk جنبك</p>
            <h1>{t.title}</h1>
            <p>{t.sub}</p>
          </div>
          <div className="topActions">
            <a className="languageSwitch" href="/">{t.home}</a>
            <a className="languageSwitch" href={`/portal?lang=${lang}`}>{t.portal}</a>
            <a className="languageSwitch" href={`/drivers?lang=${ar ? 'en' : 'ar'}`}>{t.toggle}</a>
            <button className="languageSwitch buttonReset" onClick={() => logout(lang)}>Logout</button>
          </div>
        </div>
      </section>

      <section className="grid settingsGrid">
        <div className="card"><p>{t.total}</p><strong>{stats.total}</strong></div>
        <div className="card"><p>{t.pending}</p><strong style={{ color: '#f59e0b' }}>{stats.pending}</strong></div>
        <div className="card"><p>{t.approved}</p><strong style={{ color: '#10b981' }}>{stats.approved}</strong></div>
        <div className="card"><p>{t.rejected}</p><strong style={{ color: '#ef4444' }}>{stats.rejected}</strong></div>
      </section>

      <section className="panel">
        <h2>{t.source}</h2>
        <p className="muted">{source}</p>
      </section>

      {notice && (
        <div className={`notice ${notice.type}`} style={{ margin: '0 24px 8px' }}>{notice.text}</div>
      )}

      <section className="panel">
        <h2>{t.title}</h2>
        <div className="table">
          {items.map((item) => {
            const badge = statusBadge(item.status);
            const isProcessing = processingId === item.id;
            const isPending = !item.status || item.status === 'pending_review' || item.status === 'needs_admin_review';

            return (
              <div key={item.id} className="row" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <span>
                  <b>{t.driver}</b><br />
                  {item.name || item.phone || item.id}<br />
                  <small style={{ color: '#94a3b8' }}>{item.phone || ''}</small><br />
                  <small style={{ color: '#94a3b8' }}>{item.nationalId || t.missing}</small>
                </span>

                <span>
                  <b>{t.vehicle}</b><br />
                  {item.vehicleTypeId || 'rickshaw'} / {item.plateNo || t.missing}<br />
                  <small style={{ color: '#94a3b8' }}>{[item.color, item.model].filter(Boolean).join(' — ') || ''}</small><br />
                  <small style={{ color: '#94a3b8' }}>{item.chassisNo ? `شاسي: ${item.chassisNo}` : ''}</small>
                </span>

                <span>
                  <b>{t.guarantor}</b><br />
                  {item.guarantorName || t.missing}<br />
                  <small style={{ color: '#94a3b8' }}>{item.guarantorPhone || ''}</small><br />
                  <small style={{ color: '#94a3b8' }}>{item.guarantorAddress || ''}</small>
                </span>

                <span style={{ minWidth: 120 }}>
                  <b style={{ color: badge.color }}>{badge.label} {item.status || t.pending}</b>
                  {item.freeMonth && <><br /><small style={{ color: '#f59e0b' }}>{t.free}</small></>}
                  {item.cityId && <><br /><small style={{ color: '#94a3b8' }}>{item.cityId}</small></>}
                </span>

                {isPending && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {rejectingId !== item.id && (
                      <>
                        <button
                          className="primaryAction buttonReset"
                          disabled={isProcessing}
                          onClick={() => review(item, 'approved')}
                          style={{ opacity: isProcessing ? 0.5 : 1 }}
                        >
                          {isProcessing ? t.processing : t.approve}
                        </button>
                        <button
                          className="languageSwitch buttonReset"
                          disabled={isProcessing}
                          onClick={() => setRejectingId(item.id)}
                          style={{ color: '#ef4444', border: '1px solid #fee2e2', opacity: isProcessing ? 0.5 : 1 }}
                        >
                          {t.reject}
                        </button>
                      </>
                    )}
                    {rejectingId === item.id && (
                      <div style={{ background: 'rgba(239,68,68,.06)', border: '1.5px solid #ef4444', borderRadius: 10, padding: 12, display: 'grid', gap: 8, minWidth: 200 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>{t.notes}</label>
                        <input
                          ref={rejectNoteRef}
                          placeholder={ar ? 'سبب الرفض...' : 'Reason...'}
                          autoFocus
                          style={{ border: '1.5px solid #ef4444', borderRadius: 7, padding: '6px 10px', fontSize: 13, width: '100%' }}
                        />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            disabled={isProcessing}
                            onClick={() => review(item, 'rejected', rejectNoteRef.current?.value || '')}
                            style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', borderRadius: 7, padding: '7px 0', fontWeight: 900, fontSize: 12, cursor: 'pointer', opacity: isProcessing ? 0.5 : 1 }}
                          >
                            {isProcessing ? t.processing : (ar ? 'تأكيد الرفض' : 'Confirm')}
                          </button>
                          <button
                            onClick={() => setRejectingId(null)}
                            style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: 7, padding: '7px 10px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                          >
                            {ar ? 'إلغاء' : 'Cancel'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
