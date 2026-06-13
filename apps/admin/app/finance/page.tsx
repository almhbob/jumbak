'use client';
import { useEffect, useMemo, useState, Suspense, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

type Lang = 'ar' | 'en';

type WithdrawalTx = {
  id: string;
  amount: number;
  description: string | null;
  createdAt: string;
  wallet?: { userId?: string; balance?: number };
};

type CostItem = {
  name: string;
  type: string;
  amount: number;
  cycle: 'monthly' | 'yearly' | 'usage';
  status: 'active' | 'pending' | 'required';
};

const initialCosts: CostItem[] = [
  { name: 'Railway Backend + PostgreSQL', type: 'Server', amount: 20, cycle: 'monthly', status: 'required' },
  { name: 'Vercel Admin Dashboard', type: 'Hosting', amount: 0, cycle: 'monthly', status: 'active' },
  { name: 'Domain', type: 'Domain', amount: 15, cycle: 'yearly', status: 'pending' },
  { name: 'Google Play Console', type: 'Store', amount: 25, cycle: 'yearly', status: 'pending' },
  { name: 'Maps API', type: 'Maps', amount: 50, cycle: 'usage', status: 'pending' },
  { name: 'SMS / OTP (Africa\'s Talking)', type: 'SMS', amount: 30, cycle: 'usage', status: 'pending' },
];

const collections = [
  { nameAr: 'نقطة ارتكاز السوق', nameEn: 'Market service point', typeAr: 'تحصيل نقدي', typeEn: 'Cash collection', amount: 250000, statusAr: 'نشط', statusEn: 'Active' },
  { nameAr: 'تحويل بنكك', nameEn: 'Bankak transfer', typeAr: 'دفع إلكتروني', typeEn: 'Digital payment', amount: 180000, statusAr: 'قيد المطابقة', statusEn: 'Reconciling' },
  { nameAr: 'اشتراكات الجوكية', nameEn: 'Driver subscriptions', typeAr: 'اشتراك أسبوعي', typeEn: 'Weekly subscription', amount: 120000, statusAr: 'نشط', statusEn: 'Active' },
];

const copy = {
  ar: {
    title: 'لوحة المحاسب',
    sub: 'مساحة المحاسب لإدارة المحفظة، طلبات السحب، العمولات، الاشتراكات، التحصيل، والمصروفات.',
    back: 'الرئيسية', portal: 'بوابة الدخول', business: 'الإدارة', toggle: 'English', logout: 'خروج',
    revenue: 'إيراد الشهر', owner: 'نسبة صاحب التطبيق', operator: 'نسبة المطور/المشغل',
    costs: 'المصروفات والاشتراكات', net: 'صافي الربح',
    ownerShare: 'حصة صاحب التطبيق', operatorShare: 'حصة المطور/المشغل',
    monthly: 'شهري', yearly: 'سنوي', usage: 'حسب الاستخدام',
    active: 'مفعل', pending: 'قيد التجهيز', required: 'مطلوب',
    report: 'تقرير شهري مختصر',
    collections: 'التحصيل والمطابقة',
    withdrawals: 'طلبات سحب الأرصدة',
    withdrawalEmpty: 'لا توجد طلبات سحب حالياً.',
    withdrawalUser: 'المستخدم',
    withdrawalAmount: 'المبلغ',
    withdrawalAccount: 'رقم الحساب',
    withdrawalDate: 'التاريخ',
    withdrawalStatus: 'الحالة',
    approve: 'موافقة',
    reject: 'رفض',
    withdrawalPending: 'بانتظار المراجعة',
    withdrawalApproved: 'تمت الموافقة',
    withdrawalRejected: 'مرفوض',
    loading: 'جاري التحميل...',
    confirmApprove: 'هل أنت متأكد من الموافقة على هذا الطلب؟',
    denied: 'هذه الصفحة مخصصة للمحاسب والإدارة فقط. سجّل الدخول من البوابة الموحدة.',
    refreshWithdrawals: 'تحديث',
    totalWithdrawals: 'إجمالي طلبات السحب',
    sdg: 'ج.س',
    filterAll: 'الكل',
    filterPending: 'بانتظار المراجعة',
    filterApproved: 'تمت الموافقة',
    filterRejected: 'مرفوض',
    rejectNote: 'سبب الرفض (اختياري)',
    rejectNotePlaceholder: 'مثال: لا يتطابق اسم الحساب...',
    confirmRejectBtn: 'تأكيد الرفض',
    cancelReject: 'إلغاء',
  },
  en: {
    title: 'Accountant Workspace',
    sub: 'Accountant area for wallet, withdrawals, commissions, subscriptions, collections, and expenses.',
    back: 'Home', portal: 'Portal', business: 'Business', toggle: 'العربية', logout: 'Logout',
    revenue: 'Monthly revenue', owner: 'Owner percentage', operator: 'Developer/operator %',
    costs: 'Costs and subscriptions', net: 'Net profit',
    ownerShare: 'Owner share', operatorShare: 'Developer/operator share',
    monthly: 'Monthly', yearly: 'Yearly', usage: 'Usage-based',
    active: 'Active', pending: 'Pending', required: 'Required',
    report: 'Monthly summary report',
    collections: 'Collections and reconciliation',
    withdrawals: 'Driver withdrawal requests',
    withdrawalEmpty: 'No withdrawal requests at the moment.',
    withdrawalUser: 'User',
    withdrawalAmount: 'Amount',
    withdrawalAccount: 'Bank account',
    withdrawalDate: 'Date',
    withdrawalStatus: 'Status',
    approve: 'Approve',
    reject: 'Reject',
    withdrawalPending: 'Pending review',
    withdrawalApproved: 'Approved',
    withdrawalRejected: 'Rejected',
    loading: 'Loading...',
    confirmApprove: 'Approve this withdrawal request?',
    denied: 'This page is only for accountant and business admin accounts. Log in from the unified portal.',
    refreshWithdrawals: 'Refresh',
    totalWithdrawals: 'Total withdrawal requests',
    sdg: 'SDG',
    filterAll: 'All',
    filterPending: 'Pending',
    filterApproved: 'Approved',
    filterRejected: 'Rejected',
    rejectNote: 'Rejection note (optional)',
    rejectNotePlaceholder: 'e.g. Account name does not match...',
    confirmRejectBtn: 'Confirm reject',
    cancelReject: 'Cancel',
  },
};

function logout(lang: Lang) { sessionStorage.clear(); window.location.href = `/portal?lang=${lang}`; }

function parseAccount(description: string | null): string {
  if (!description) return '—';
  const m = description.match(/حساب:\s*([^\s—–-]+)/);
  if (m) return m[1];
  const en = description.match(/account[:\s]+([^\s,—]+)/i);
  return en ? en[1] : '—';
}

function txStatus(description: string | null, t: typeof copy['ar']): { label: string; color: string } {
  if (!description) return { label: t.withdrawalPending, color: 'var(--gold)' };
  if (description.includes('تمت الموافقة') || description.toLowerCase().includes('approved')) return { label: t.withdrawalApproved, color: 'var(--teal)' };
  if (description.includes('مرفوض') || description.toLowerCase().includes('rejected')) return { label: t.withdrawalRejected, color: '#E74C3C' };
  return { label: t.withdrawalPending, color: 'var(--gold)' };
}

function FinanceContent() {
  const searchParams = useSearchParams();
  const lang: Lang = searchParams.get('lang') === 'en' ? 'en' : 'ar';
  const ar = lang === 'ar';
  const t = copy[lang];

  const [allowed, setAllowed] = useState(false);
  const [revenue, setRevenue] = useState(1000000);
  const [ownerPct, setOwnerPct] = useState(70);
  const [operatorPct, setOperatorPct] = useState(30);
  const [costs] = useState(initialCosts);

  const [withdrawals, setWithdrawals] = useState<WithdrawalTx[]>([]);
  const [wLoading, setWLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ id: string; type: 'success' | 'error'; text: string } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const rejectNoteRef = useRef<HTMLInputElement>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
  const getToken = () => sessionStorage.getItem('jnbk_staff_token') || '';
  const staffUsername = typeof window !== 'undefined' ? sessionStorage.getItem('jnbk_staff_username') || 'admin' : 'admin';

  const loadWithdrawals = useCallback(async () => {
    if (!apiBase) return;
    setWLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/wallet/admin/withdrawals`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWithdrawals(Array.isArray(data) ? data : []);
      }
    } catch { /* network unavailable */ } finally {
      setWLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    const role = sessionStorage.getItem('jnbk_active_role');
    const ok = role === 'accountant' || role === 'business';
    setAllowed(ok);
    if (!ok) return;

    if (apiBase) {
      fetch(`${apiBase}/api/rides`, { headers: { Authorization: `Bearer ${getToken()}` } })
        .then((r) => r.ok ? r.json() : [])
        .then((data: Array<{ estimatedFare?: number }>) => {
          const sum = data.reduce((s, r) => s + Number(r.estimatedFare || 0), 0);
          if (sum > 0) setRevenue(sum);
        })
        .catch(() => {});

      loadWithdrawals();
    }
  }, [apiBase, loadWithdrawals]);

  async function reviewWithdrawal(txId: string, action: 'approve' | 'reject', note?: string) {
    if (action === 'approve') {
      if (!window.confirm(t.confirmApprove)) return;
    }

    setProcessingId(txId);
    setRejectingId(null);
    setActionMsg(null);
    try {
      const res = await fetch(`${apiBase}/api/wallet/admin/withdrawals/${txId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ action, reviewedBy: staffUsername, note: note || '' }),
      });
      if (res.ok) {
        setActionMsg({ id: txId, type: 'success', text: action === 'approve' ? (ar ? 'تمت الموافقة بنجاح ✓' : 'Approved successfully ✓') : (ar ? 'تم الرفض وإعادة الرصيد ✓' : 'Rejected and refunded ✓') });
        await loadWithdrawals();
      } else {
        const err = await res.json().catch(() => ({}));
        setActionMsg({ id: txId, type: 'error', text: (err as { error?: string }).error || (ar ? 'حدث خطأ' : 'An error occurred') });
      }
    } catch {
      setActionMsg({ id: txId, type: 'error', text: ar ? 'تعذر الاتصال بالخادم' : 'Could not reach server' });
    } finally {
      setProcessingId(null);
    }
  }

  const monthlyCost = useMemo(() => costs.reduce((s, c) => s + (c.cycle === 'yearly' ? Math.round(c.amount / 12) : c.amount), 0), [costs]);
  const collected = collections.reduce((s, c) => s + c.amount, 0);
  const net = Math.max(revenue - monthlyCost, 0);
  const ownerShare = Math.round(net * ownerPct / 100);
  const operatorShare = Math.round(net * operatorPct / 100);
  const pendingWithdrawals = withdrawals.filter(w => !w.description?.includes('تمت الموافقة') && !w.description?.includes('مرفوض') && !w.description?.toLowerCase().includes('approved') && !w.description?.toLowerCase().includes('rejected'));
  const pendingTotal = pendingWithdrawals.reduce((s, w) => s + Math.abs(w.amount), 0);
  const filteredWithdrawals = useMemo(() => {
    if (filterStatus === 'all') return withdrawals;
    return withdrawals.filter(w => {
      const status = txStatus(w.description, t);
      if (filterStatus === 'pending') return status.label === t.withdrawalPending;
      if (filterStatus === 'approved') return status.label === t.withdrawalApproved;
      if (filterStatus === 'rejected') return status.label === t.withdrawalRejected;
      return true;
    });
  }, [withdrawals, filterStatus, t]);

  const label = (v: string) => (t as Record<string, string>)[v] || v;

  if (!allowed) {
    return (
      <main dir={ar ? 'rtl' : 'ltr'} style={{ textAlign: ar ? 'right' : 'left' }}>
        <section className="hero">
          <div className="heroTop">
            <div><p className="kicker">Jnbk جنبك</p><h1>{t.title}</h1><p>{t.denied}</p></div>
            <a className="languageSwitch" href={`/portal?lang=${lang}`}>{t.portal}</a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main dir={ar ? 'rtl' : 'ltr'} style={{ textAlign: ar ? 'right' : 'left' }}>
      {/* ── Hero ── */}
      <section className="hero">
        <div className="heroTop">
          <div>
            <p className="kicker">Jnbk جنبك</p>
            <h1>{t.title}</h1>
            <p>{t.sub}</p>
          </div>
          <div className="topActions">
            <button className="languageSwitch buttonReset" onClick={() => logout(lang)}>{t.logout}</button>
            <a className="languageSwitch" href="/">{t.back}</a>
            <a className="languageSwitch" href={`/business?lang=${lang}`}>{t.business}</a>
            <a className="languageSwitch" href={`/finance?lang=${ar ? 'en' : 'ar'}`}>{t.toggle}</a>
          </div>
        </div>
      </section>

      {/* ── Monthly report inputs ── */}
      <section className="panel">
        <h2>{t.report}</h2>
        <div className="formGrid">
          <input type="number" value={revenue} onChange={e => setRevenue(Number(e.target.value || 0))} placeholder={t.revenue} />
          <input type="number" value={ownerPct} onChange={e => setOwnerPct(Number(e.target.value || 0))} placeholder={t.owner} />
          <input type="number" value={operatorPct} onChange={e => setOperatorPct(Number(e.target.value || 0))} placeholder={t.operator} />
        </div>
      </section>

      {/* ── KPI cards ── */}
      <div className="grid settingsGrid">
        <div className="card"><p>{t.revenue}</p><strong>{revenue.toLocaleString()}</strong></div>
        <div className="card"><p>{t.collections}</p><strong>{collected.toLocaleString()}</strong></div>
        <div className="card"><p>{t.costs}</p><strong>{monthlyCost.toLocaleString()}</strong></div>
        <div className="card"><p>{t.net}</p><strong>{net.toLocaleString()}</strong></div>
      </div>
      <div className="grid settingsGrid">
        <div className="card"><p>{t.ownerShare}</p><strong>{ownerShare.toLocaleString()}</strong></div>
        <div className="card"><p>{t.operatorShare}</p><strong>{operatorShare.toLocaleString()}</strong></div>
        <div className="card"><p style={{ color: 'var(--gold)' }}>{t.totalWithdrawals}</p><strong style={{ color: 'var(--gold)' }}>{pendingTotal.toLocaleString()}</strong></div>
        <div className="card"><p>{t.withdrawals}</p><strong>{pendingWithdrawals.length}</strong></div>
      </div>

      {/* ── Withdrawals ── */}
      <section className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ margin: 0 }}>{t.withdrawals}</h2>
          <button className="languageSwitch buttonReset" onClick={loadWithdrawals} disabled={wLoading}>
            {wLoading ? '...' : t.refreshWithdrawals}
          </button>
        </div>

        {/* ── Filter buttons ── */}
        {withdrawals.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => {
              const count = f === 'all' ? withdrawals.length
                : f === 'pending' ? withdrawals.filter(w => txStatus(w.description, t).label === t.withdrawalPending).length
                : f === 'approved' ? withdrawals.filter(w => txStatus(w.description, t).label === t.withdrawalApproved).length
                : withdrawals.filter(w => txStatus(w.description, t).label === t.withdrawalRejected).length;
              const active = filterStatus === f;
              const colors: Record<string, string> = { all: 'var(--navy)', pending: 'var(--gold)', approved: 'var(--teal)', rejected: '#E74C3C' };
              return (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${colors[f]}`,
                    background: active ? colors[f] : 'transparent', color: active ? 'white' : colors[f],
                    fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {t[`filter${f.charAt(0).toUpperCase() + f.slice(1)}` as keyof typeof t]} ({count})
                </button>
              );
            })}
          </div>
        )}

        {wLoading && <p className="muted">{t.loading}</p>}

        {!wLoading && filteredWithdrawals.length === 0 && (
          <div className="empty">{t.withdrawalEmpty}</div>
        )}

        {!wLoading && filteredWithdrawals.length > 0 && (
          <div className="table">
            {/* Header */}
            <div className="row" style={{ background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-mid) 100%)', color: 'white' }}>
              {[t.withdrawalUser, t.withdrawalAmount, t.withdrawalAccount, t.withdrawalStatus].map(h => (
                <span key={h} style={{ color: 'rgba(255,255,255,.85)', fontWeight: 900, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</span>
              ))}
            </div>

            {filteredWithdrawals.map((tx) => {
              const status = txStatus(tx.description, t);
              const isPending = status.label === t.withdrawalPending;
              const isProcessing = processingId === tx.id;
              const isRejecting = rejectingId === tx.id;
              const msg = actionMsg?.id === tx.id ? actionMsg : null;

              return (
                <div key={tx.id} style={{ marginBottom: 2 }}>
                  <div className="row" style={{ gridTemplateColumns: isPending ? '1fr 1fr 1fr auto' : 'repeat(4, 1fr)', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace', fontWeight: 700 }}>
                      {tx.wallet?.userId ? tx.wallet.userId.slice(-8) : '—'}
                    </span>
                    <span style={{ color: '#E74C3C', fontWeight: 900, fontSize: 16 }}>
                      {Math.abs(tx.amount).toLocaleString()} <small>{t.sdg}</small>
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{parseAccount(tx.description)}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: isPending ? 'flex-end' : 'flex-start' }}>
                      <b style={{ color: status.color, fontSize: 12, fontWeight: 900 }}>{status.label}</b>
                      <small style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                        {new Date(tx.createdAt).toLocaleDateString(ar ? 'ar-SD' : 'en-GB')}
                      </small>
                      {isPending && !isRejecting && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                          <button
                            disabled={isProcessing}
                            onClick={() => reviewWithdrawal(tx.id, 'approve')}
                            style={{
                              background: 'linear-gradient(135deg, var(--teal) 0%, #0A7A63 100%)',
                              color: 'white', border: 'none', borderRadius: 8,
                              padding: '7px 14px', fontWeight: 900, fontSize: 12, cursor: isProcessing ? 'not-allowed' : 'pointer',
                              opacity: isProcessing ? 0.5 : 1, transition: 'all 0.18s',
                            }}
                          >
                            {isProcessing ? '...' : t.approve}
                          </button>
                          <button
                            disabled={isProcessing}
                            onClick={() => setRejectingId(tx.id)}
                            style={{
                              background: 'linear-gradient(135deg, #E74C3C 0%, #C0392B 100%)',
                              color: 'white', border: 'none', borderRadius: 8,
                              padding: '7px 14px', fontWeight: 900, fontSize: 12, cursor: isProcessing ? 'not-allowed' : 'pointer',
                              opacity: isProcessing ? 0.5 : 1, transition: 'all 0.18s',
                            }}
                          >
                            {t.reject}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Rejection note panel ── */}
                  {isRejecting && (
                    <div style={{ background: 'rgba(231,76,60,.06)', border: '1.5px solid #E74C3C', borderRadius: 12, padding: '14px 18px', marginTop: 4, marginBottom: 4, display: 'grid', gap: 10 }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: '#E74C3C' }}>{t.rejectNote}</label>
                      <input
                        ref={rejectNoteRef}
                        placeholder={t.rejectNotePlaceholder}
                        style={{ width: '100%', border: '1.5px solid #E74C3C' }}
                        autoFocus
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          disabled={isProcessing}
                          onClick={() => reviewWithdrawal(tx.id, 'reject', rejectNoteRef.current?.value || '')}
                          style={{
                            background: 'linear-gradient(135deg, #E74C3C 0%, #C0392B 100%)',
                            color: 'white', border: 'none', borderRadius: 8, padding: '8px 18px',
                            fontWeight: 900, fontSize: 13, cursor: isProcessing ? 'not-allowed' : 'pointer', opacity: isProcessing ? 0.5 : 1,
                          }}
                        >
                          {isProcessing ? '...' : t.confirmRejectBtn}
                        </button>
                        <button
                          onClick={() => setRejectingId(null)}
                          style={{ background: 'var(--card-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                        >
                          {t.cancelReject}
                        </button>
                      </div>
                    </div>
                  )}

                  {msg && (
                    <div className={`notice ${msg.type === 'success' ? 'success' : 'error'}`} style={{ margin: '4px 0' }}>
                      {msg.text}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Collections ── */}
      <section className="panel">
        <h2>{t.collections}</h2>
        <div className="table">
          {collections.map(c => (
            <div className="row" key={c.nameEn}>
              <span>{ar ? c.nameAr : c.nameEn}</span>
              <span>{ar ? c.typeAr : c.typeEn}</span>
              <span>{c.amount.toLocaleString()} {t.sdg}</span>
              <b>{ar ? c.statusAr : c.statusEn}</b>
            </div>
          ))}
        </div>
      </section>

      {/* ── Costs ── */}
      <section className="panel">
        <h2>{t.costs}</h2>
        <div className="table">
          {costs.map(c => (
            <div className="row" key={c.name}>
              <span>{c.name}</span>
              <span>{c.type}</span>
              <span>{c.amount} USD / {label(c.cycle)}</span>
              <b style={{ color: c.status === 'active' ? 'var(--teal)' : c.status === 'required' ? '#E74C3C' : 'var(--gold)' }}>
                {label(c.status)}
              </b>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default function Finance() {
  return (
    <Suspense>
      <FinanceContent />
    </Suspense>
  );
}
