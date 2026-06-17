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
    portal: 'بوابة الدخول', home: 'الرئيسية', toggle: 'English', logout: 'خروج',
    total: 'إجمالي الطلبات', pending: 'قيد المراجعة', approved: 'معتمد', rejected: 'مرفوض', free: 'شهر مجاني',
    driver: 'الجوكي', vehicle: 'المركبة', guarantor: 'الضامن', compliance: 'الامتثال', decision: 'القرار',
    approve: 'اعتماد', reject: 'رفض', missing: 'غير مكتمل', source: 'مصدر البيانات',
    denied: 'هذه الصفحة مخصصة للإدارة والتشغيل فقط. سجّل الدخول من البوابة الموحدة.',
    openPortal: 'فتح بوابة الدخول', saved: 'تم حفظ القرار بنجاح ✓', local: 'تم تحديث الواجهة محليًا للمعاينة',
    failed: 'تعذر الحفظ — تحقق من الاتصال', processing: 'جارٍ الحفظ...', notes: 'سبب الرفض (اختياري)',
    confirmApprove: 'هل تريد اعتماد هذا الجوكي؟', confirmReject: 'هل تريد رفض هذا الطلب؟',
    backend: 'Backend API متصل بالتوكن', firebase: 'Firebase Firestore', preview: 'وضع المعاينة',
    phone: 'الهاتف', nationalId: 'الرقم الوطني', city: 'المدينة', plate: 'اللوحة', model: 'الموديل', chassis: 'الشاسي',
    bank: 'الحساب البنكي', confirmRejectButton: 'تأكيد الرفض', cancel: 'إلغاء',
  },
  en: {
    title: 'Driver Application Review',
    sub: 'Approve and track driver files, guarantor details, vehicles, and free month status.',
    portal: 'Portal', home: 'Home', toggle: 'العربية', logout: 'Logout',
    total: 'Total applications', pending: 'Pending', approved: 'Approved', rejected: 'Rejected', free: 'Free month',
    driver: 'Driver', vehicle: 'Vehicle', guarantor: 'Guarantor', compliance: 'Compliance', decision: 'Decision',
    approve: 'Approve', reject: 'Reject', missing: 'Missing', source: 'Data source',
    denied: 'This page is only for management and operations accounts. Log in from the unified portal.',
    openPortal: 'Open portal', saved: 'Decision saved successfully ✓', local: 'UI updated locally for preview',
    failed: 'Could not save — check connection', processing: 'Saving...', notes: 'Rejection reason (optional)',
    confirmApprove: 'Approve this driver application?', confirmReject: 'Reject this application?',
    backend: 'Backend API with auth token', firebase: 'Firebase Firestore', preview: 'Preview mode',
    phone: 'Phone', nationalId: 'National ID', city: 'City', plate: 'Plate', model: 'Model', chassis: 'Chassis',
    bank: 'Bank account', confirmRejectButton: 'Confirm reject', cancel: 'Cancel',
  },
};

function goPortal(lang: Lang) { window.location.assign(`/portal?lang=${lang}`); }
function logout(lang: Lang) { sessionStorage.clear(); goPortal(lang); }

function statusBadge(status?: string) {
  if (!status || status === 'pending_review' || status === 'needs_admin_review') return { cls: 'adminBadge adminBadgeWarn', label: '⏳ Pending' };
  if (status === 'approved') return { cls: 'adminBadge adminBadgeSuccess', label: '✓ Approved' };
  return { cls: 'adminBadge adminBadgeDanger', label: '✗ Rejected' };
}

function valueOrMissing(value: unknown, missing: string) {
  const text = String(value || '').trim();
  return text || missing;
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
    if (status === 'rejected' && !window.confirm(t.confirmReject)) return;

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
            <div className="adminHeroActions">
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
          <div className="adminHeroActions">
            <a className="languageSwitch" href="/">{t.home}</a>
            <a className="languageSwitch" href={`/operations?lang=${lang}`}>{ar ? 'التشغيل' : 'Operations'}</a>
            <a className="languageSwitch" href={`/portal?lang=${lang}`}>{t.portal}</a>
            <a className="languageSwitch" href={`/drivers?lang=${ar ? 'en' : 'ar'}`}>{t.toggle}</a>
            <button className="languageSwitch buttonReset" onClick={() => logout(lang)}>{t.logout}</button>
          </div>
        </div>
      </section>

      <section className="adminStatGrid">
        <div className="card"><p>{t.total}</p><strong>{stats.total}</strong></div>
        <div className="card"><p>{t.pending}</p><strong style={{ background: 'none', WebkitTextFillColor: '#f59e0b', color: '#f59e0b' }}>{stats.pending}</strong></div>
        <div className="card"><p>{t.approved}</p><strong style={{ background: 'none', WebkitTextFillColor: '#10b981', color: '#10b981' }}>{stats.approved}</strong></div>
        <div className="card"><p>{t.rejected}</p><strong style={{ background: 'none', WebkitTextFillColor: '#ef4444', color: '#ef4444' }}>{stats.rejected}</strong></div>
      </section>

      <section className="panel">
        <div className="adminSectionHeader" style={{ marginTop: 0 }}>
          <div>
            <h2>{t.source}</h2>
            <p className="muted" style={{ margin: 0 }}>{source}</p>
          </div>
          <span className="adminBadge adminBadgeMuted">{items.length} {ar ? 'ملف' : 'files'}</span>
        </div>
      </section>

      {notice && (
        <div className={`notice ${notice.type}`} style={{ margin: '12px 0' }}>{notice.text}</div>
      )}

      <section className="panel">
        <div className="adminSectionHeader" style={{ marginTop: 0 }}>
          <h2>{t.title}</h2>
          <span className="adminBadge adminBadgeWarn">{stats.pending} {t.pending}</span>
        </div>

        <div className="adminReviewList">
          {items.map((item) => {
            const badge = statusBadge(item.status);
            const isProcessing = processingId === item.id;
            const isPending = !item.status || item.status === 'pending_review' || item.status === 'needs_admin_review';

            return (
              <div key={item.id} className="adminReviewCard">
                <div className="adminInfoBlock">
                  <strong>{t.driver}</strong>
                  <span className="adminInfoLine">{valueOrMissing(item.name || item.phone || item.id, t.missing)}</span>
                  <span className="adminInfoMuted">{t.phone}: {valueOrMissing(item.phone, t.missing)}</span>
                  <span className="adminInfoMuted">{t.nationalId}: {valueOrMissing(item.nationalId, t.missing)}</span>
                  <span className="adminInfoMuted">{t.city}: {valueOrMissing(item.cityId, 'rufaa')}</span>
                </div>

                <div className="adminInfoBlock">
                  <strong>{t.vehicle}</strong>
                  <span className="adminInfoLine">{valueOrMissing(item.vehicleTypeId, 'rickshaw')}</span>
                  <span className="adminInfoMuted">{t.plate}: {valueOrMissing(item.plateNo, t.missing)}</span>
                  <span className="adminInfoMuted">{t.model}: {[item.color, item.model].filter(Boolean).join(' — ') || t.missing}</span>
                  <span className="adminInfoMuted">{t.chassis}: {valueOrMissing(item.chassisNo, t.missing)}</span>
                </div>

                <div className="adminInfoBlock">
                  <strong>{t.guarantor}</strong>
                  <span className="adminInfoLine">{valueOrMissing(item.guarantorName, t.missing)}</span>
                  <span className="adminInfoMuted">{t.phone}: {valueOrMissing(item.guarantorPhone, t.missing)}</span>
                  <span className="adminInfoMuted">{valueOrMissing(item.guarantorAddress, t.missing)}</span>
                  <span className="adminInfoMuted">{t.bank}: {valueOrMissing(item.bankAccount, t.missing)}</span>
                </div>

                <div className="adminInfoBlock">
                  <strong>{t.compliance}</strong>
                  <span className={badge.cls}>{badge.label}</span>
                  {item.freeMonth && <span className="adminInfoMuted" style={{ marginTop: 8, color: '#a16207' }}>{t.free}</span>}
                  <span className="adminInfoMuted">{item.complianceStatus || t.pending}</span>
                </div>

                <div className="adminDecisionPanel">
                  <strong style={{ color: 'var(--navy)' }}>{t.decision}</strong>
                  {isPending ? (
                    rejectingId === item.id ? (
                      <div className="adminRejectBox">
                        <label>{t.notes}</label>
                        <input ref={rejectNoteRef} placeholder={ar ? 'سبب الرفض...' : 'Reason...'} autoFocus className="adminRejectInput" />
                        <div className="adminToolbar">
                          <button disabled={isProcessing} onClick={() => review(item, 'rejected', rejectNoteRef.current?.value || '')} className="adminMiniButton adminMiniButtonWarn">
                            {isProcessing ? t.processing : t.confirmRejectButton}
                          </button>
                          <button onClick={() => setRejectingId(null)} className="adminMiniButton adminMiniButtonMuted">
                            {t.cancel}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button className="adminMiniButton adminMiniButtonSuccess" disabled={isProcessing} onClick={() => review(item, 'approved')}>
                          {isProcessing ? t.processing : t.approve}
                        </button>
                        <button className="adminMiniButton adminMiniButtonWarn" disabled={isProcessing} onClick={() => setRejectingId(item.id)}>
                          {t.reject}
                        </button>
                      </>
                    )
                  ) : (
                    <span className={badge.cls}>{item.status || t.pending}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
