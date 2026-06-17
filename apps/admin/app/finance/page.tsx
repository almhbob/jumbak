'use client';
import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
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
    title: 'لوحة المحاسب', sub: 'مساحة المحاسب لإدارة المحفظة، طلبات السحب، العمولات، الاشتراكات، التحصيل، والمصروفات.',
    back: 'الرئيسية', portal: 'بوابة الدخول', business: 'الإدارة', operations: 'التشغيل', pricing: 'التسعير', toggle: 'English', logout: 'خروج',
    revenue: 'إيراد الشهر', owner: 'نسبة صاحب التطبيق', operator: 'نسبة المطور/المشغل', costs: 'المصروفات والاشتراكات', net: 'صافي الربح',
    ownerShare: 'حصة صاحب التطبيق', operatorShare: 'حصة المطور/المشغل', monthly: 'شهري', yearly: 'سنوي', usage: 'حسب الاستخدام',
    active: 'مفعل', pending: 'قيد التجهيز', required: 'مطلوب', report: 'تقرير شهري مختصر', collections: 'التحصيل والمطابقة',
    withdrawals: 'طلبات سحب الأرصدة', withdrawalEmpty: 'لا توجد طلبات سحب حالياً.', withdrawalUser: 'المستخدم', withdrawalAmount: 'المبلغ',
    withdrawalAccount: 'رقم الحساب', withdrawalDate: 'التاريخ', withdrawalStatus: 'الحالة', approve: 'موافقة', reject: 'رفض',
    withdrawalPending: 'بانتظار المراجعة', withdrawalApproved: 'تمت الموافقة', withdrawalRejected: 'مرفوض', loading: 'جاري التحميل...',
    confirmApprove: 'هل أنت متأكد من الموافقة على هذا الطلب؟', denied: 'هذه الصفحة مخصصة للمحاسب والإدارة فقط. سجّل الدخول من البوابة الموحدة.',
    refreshWithdrawals: 'تحديث', totalWithdrawals: 'إجمالي طلبات السحب', sdg: 'ج.س', filterAll: 'الكل', filterPending: 'بانتظار المراجعة',
    filterApproved: 'تمت الموافقة', filterRejected: 'مرفوض', rejectNote: 'سبب الرفض (اختياري)', rejectNotePlaceholder: 'مثال: لا يتطابق اسم الحساب...',
    confirmRejectBtn: 'تأكيد الرفض', cancelReject: 'إلغاء', balance: 'رصيد المحفظة', cycle: 'الدورية', status: 'الحالة', type: 'النوع', item: 'البند',
  },
  en: {
    title: 'Accountant Workspace', sub: 'Accountant area for wallet, withdrawals, commissions, subscriptions, collections, and expenses.',
    back: 'Home', portal: 'Portal', business: 'Business', operations: 'Operations', pricing: 'Pricing', toggle: 'العربية', logout: 'Logout',
    revenue: 'Monthly revenue', owner: 'Owner percentage', operator: 'Developer/operator %', costs: 'Costs and subscriptions', net: 'Net profit',
    ownerShare: 'Owner share', operatorShare: 'Developer/operator share', monthly: 'Monthly', yearly: 'Yearly', usage: 'Usage-based',
    active: 'Active', pending: 'Pending', required: 'Required', report: 'Monthly summary report', collections: 'Collections and reconciliation',
    withdrawals: 'Driver withdrawal requests', withdrawalEmpty: 'No withdrawal requests at the moment.', withdrawalUser: 'User', withdrawalAmount: 'Amount',
    withdrawalAccount: 'Bank account', withdrawalDate: 'Date', withdrawalStatus: 'Status', approve: 'Approve', reject: 'Reject',
    withdrawalPending: 'Pending review', withdrawalApproved: 'Approved', withdrawalRejected: 'Rejected', loading: 'Loading...',
    confirmApprove: 'Approve this withdrawal request?', denied: 'This page is only for accountant and business admin accounts. Log in from the unified portal.',
    refreshWithdrawals: 'Refresh', totalWithdrawals: 'Total withdrawal requests', sdg: 'SDG', filterAll: 'All', filterPending: 'Pending',
    filterApproved: 'Approved', filterRejected: 'Rejected', rejectNote: 'Rejection note (optional)', rejectNotePlaceholder: 'e.g. Account name does not match...',
    confirmRejectBtn: 'Confirm reject', cancelReject: 'Cancel', balance: 'Wallet balance', cycle: 'Cycle', status: 'Status', type: 'Type', item: 'Item',
  },
};

function logout(lang: Lang) { sessionStorage.clear(); window.location.href = `/portal?lang=${lang}`; }
function money(value: number, suffix: string) { return `${Math.round(value || 0).toLocaleString('en')} ${suffix}`; }
function parseAccount(description: string | null): string {
  if (!description) return '—';
  const arMatch = description.match(/حساب:\s*([^\s—–-]+)/);
  if (arMatch) return arMatch[1];
  const enMatch = description.match(/account[:\s]+([^\s,—]+)/i);
  return enMatch ? enMatch[1] : '—';
}

function txStatus(description: string | null, t: typeof copy['ar']): { label: string; cls: string; key: 'pending' | 'approved' | 'rejected' } {
  const text = (description || '').toLowerCase();
  if (description?.includes('تمت الموافقة') || text.includes('approved')) return { label: t.withdrawalApproved, cls: 'adminBadge adminBadgeSuccess', key: 'approved' };
  if (description?.includes('مرفوض') || text.includes('rejected')) return { label: t.withdrawalRejected, cls: 'adminBadge adminBadgeDanger', key: 'rejected' };
  return { label: t.withdrawalPending, cls: 'adminBadge adminBadgeWarn', key: 'pending' };
}

function costBadge(status: CostItem['status']) {
  if (status === 'active') return 'adminBadge adminBadgeSuccess';
  if (status === 'required') return 'adminBadge adminBadgeDanger';
  return 'adminBadge adminBadgeWarn';
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
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const rejectNoteRef = useRef<HTMLInputElement>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
  const getToken = () => sessionStorage.getItem('jnbk_staff_token') || '';
  const staffUsername = typeof window !== 'undefined' ? sessionStorage.getItem('jnbk_staff_username') || 'admin' : 'admin';

  const loadWithdrawals = useCallback(async () => {
    if (!apiBase) return;
    setWLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/wallet/admin/withdrawals`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) {
        const data = await res.json();
        setWithdrawals(Array.isArray(data) ? data : []);
      }
    } catch {
      // keep current UI if network is unavailable
    } finally {
      setWLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    const role = sessionStorage.getItem('jnbk_active_role');
    const ok = ['accountant', 'finance', 'business', 'developer'].includes(role || '');
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
    setProcessingId(txId);
    setRejectingId(null);
    setApprovingId(null);
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
  const pendingWithdrawals = withdrawals.filter(w => txStatus(w.description, t).key === 'pending');
  const pendingTotal = pendingWithdrawals.reduce((s, w) => s + Math.abs(w.amount), 0);
  const filteredWithdrawals = useMemo(() => {
    if (filterStatus === 'all') return withdrawals;
    return withdrawals.filter(w => txStatus(w.description, t).key === filterStatus);
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
      <section className="hero">
        <div className="heroTop">
          <div>
            <p className="kicker">Jnbk جنبك</p>
            <h1>{t.title}</h1>
            <p>{t.sub}</p>
          </div>
          <div className="adminHeroActions">
            <button className="languageSwitch buttonReset" onClick={() => logout(lang)}>{t.logout}</button>
            <a className="languageSwitch" href="/">{t.back}</a>
            <a className="languageSwitch" href={`/operations?lang=${lang}`}>{t.operations}</a>
            <a className="languageSwitch" href={`/pricing?lang=${lang}`}>{t.pricing}</a>
            <a className="languageSwitch" href={`/business?lang=${lang}`}>{t.business}</a>
            <a className="languageSwitch" href={`/finance?lang=${ar ? 'en' : 'ar'}`}>{t.toggle}</a>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="adminSectionHeader" style={{ marginTop: 0 }}>
          <div>
            <h2>{t.report}</h2>
            <p className="muted" style={{ margin: 0 }}>{t.revenue} / {t.owner} / {t.operator}</p>
          </div>
          <span className={apiBase ? 'adminBadge adminBadgeSuccess' : 'adminBadge adminBadgeWarn'}>{apiBase ? 'API' : 'Preview'}</span>
        </div>
        <div className="financeControls">
          <label className="label">{t.revenue}<input className="input" type="number" value={revenue} onChange={e => setRevenue(Number(e.target.value || 0))} /></label>
          <label className="label">{t.owner}<input className="input" type="number" value={ownerPct} onChange={e => setOwnerPct(Number(e.target.value || 0))} /></label>
          <label className="label">{t.operator}<input className="input" type="number" value={operatorPct} onChange={e => setOperatorPct(Number(e.target.value || 0))} /></label>
        </div>
      </section>

      <section className="adminStatGrid">
        <div className="card"><p>{t.revenue}</p><strong>{money(revenue, t.sdg)}</strong></div>
        <div className="card"><p>{t.collections}</p><strong>{money(collected, t.sdg)}</strong></div>
        <div className="card"><p>{t.costs}</p><strong>{monthlyCost.toLocaleString('en')} USD</strong></div>
        <div className="card"><p>{t.net}</p><strong style={{ background: 'none', WebkitTextFillColor: '#10b981', color: '#10b981' }}>{money(net, t.sdg)}</strong></div>
        <div className="card"><p>{t.ownerShare}</p><strong>{money(ownerShare, t.sdg)}</strong></div>
        <div className="card"><p>{t.operatorShare}</p><strong>{money(operatorShare, t.sdg)}</strong></div>
        <div className="card"><p>{t.totalWithdrawals}</p><strong style={{ background: 'none', WebkitTextFillColor: '#f59e0b', color: '#f59e0b' }}>{money(pendingTotal, t.sdg)}</strong></div>
        <div className="card"><p>{t.withdrawals}</p><strong>{pendingWithdrawals.length}</strong></div>
      </section>

      <section className="panel">
        <div className="adminSectionHeader" style={{ marginTop: 0 }}>
          <h2>{t.withdrawals}</h2>
          <button className="languageSwitch buttonReset" onClick={loadWithdrawals} disabled={wLoading}>{wLoading ? '...' : t.refreshWithdrawals}</button>
        </div>

        {withdrawals.length > 0 && (
          <div className="financeFilterBar">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => {
              const count = f === 'all' ? withdrawals.length : withdrawals.filter(w => txStatus(w.description, t).key === f).length;
              return (
                <button key={f} onClick={() => setFilterStatus(f)} className={`chip${filterStatus === f ? ' chipActive' : ''}`}>
                  {t[`filter${f.charAt(0).toUpperCase() + f.slice(1)}` as keyof typeof t]} ({count})
                </button>
              );
            })}
          </div>
        )}

        {wLoading && <p className="muted">{t.loading}</p>}
        {!wLoading && filteredWithdrawals.length === 0 && <div className="empty">{t.withdrawalEmpty}</div>}

        {!wLoading && filteredWithdrawals.length > 0 && (
          <div className="financeList">
            {filteredWithdrawals.map((tx) => {
              const status = txStatus(tx.description, t);
              const isPending = status.key === 'pending';
              const isProcessing = processingId === tx.id;
              const isRejecting = rejectingId === tx.id;
              const msg = actionMsg?.id === tx.id ? actionMsg : null;
              return (
                <div key={tx.id}>
                  <div className="financeCard">
                    <div>
                      <span className="adminInfoMuted">{t.withdrawalUser}</span>
                      <strong className="adminInfoLine">{tx.wallet?.userId ? tx.wallet.userId.slice(-8) : '—'}</strong>
                      <span className="adminInfoMuted">{new Date(tx.createdAt).toLocaleDateString(ar ? 'ar-SD' : 'en-GB')}</span>
                    </div>
                    <span className="financeAmount financeAmountDanger">{money(Math.abs(tx.amount), t.sdg)}</span>
                    <span className="adminBadge adminBadgeMuted">{parseAccount(tx.description)}</span>
                    <div className="pricingActions">
                      <span className={status.cls}>{status.label}</span>
                      {isPending && !isRejecting && !approvingId && (
                        <>
                          <button disabled={isProcessing} onClick={() => setApprovingId(tx.id)} className="adminMiniButton adminMiniButtonSuccess">{isProcessing ? '...' : t.approve}</button>
                          <button disabled={isProcessing} onClick={() => setRejectingId(tx.id)} className="adminMiniButton adminMiniButtonWarn">{t.reject}</button>
                        </>
                      )}
                    </div>
                  </div>

                  {approvingId === tx.id && (
                    <div className="financeConfirmBox">
                      <strong style={{ color: 'var(--teal)' }}>{t.confirmApprove}</strong>
                      <div className="pricingActions">
                        <button disabled={isProcessing} onClick={() => reviewWithdrawal(tx.id, 'approve')} className="adminMiniButton adminMiniButtonSuccess">{isProcessing ? '...' : t.approve}</button>
                        <button onClick={() => setApprovingId(null)} className="adminMiniButton adminMiniButtonMuted">{t.cancelReject}</button>
                      </div>
                    </div>
                  )}

                  {isRejecting && (
                    <div className="financeConfirmBox financeConfirmDanger">
                      <label className="label">{t.rejectNote}</label>
                      <input ref={rejectNoteRef} placeholder={t.rejectNotePlaceholder} className="adminRejectInput" autoFocus />
                      <div className="pricingActions">
                        <button disabled={isProcessing} onClick={() => reviewWithdrawal(tx.id, 'reject', rejectNoteRef.current?.value || '')} className="adminMiniButton adminMiniButtonWarn">{isProcessing ? '...' : t.confirmRejectBtn}</button>
                        <button onClick={() => setRejectingId(null)} className="adminMiniButton adminMiniButtonMuted">{t.cancelReject}</button>
                      </div>
                    </div>
                  )}

                  {msg && <div className={`notice ${msg.type === 'success' ? 'success' : 'error'}`} style={{ margin: '8px 0' }}>{msg.text}</div>}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="adminSectionHeader" style={{ marginTop: 0 }}><h2>{t.collections}</h2></div>
        <div className="financeList">
          {collections.map(c => (
            <div className="financeCard" key={c.nameEn}>
              <strong>{ar ? c.nameAr : c.nameEn}</strong>
              <span className="adminBadge adminBadgeMuted">{ar ? c.typeAr : c.typeEn}</span>
              <span className="financeAmount">{money(c.amount, t.sdg)}</span>
              <span className="adminBadge adminBadgeSuccess">{ar ? c.statusAr : c.statusEn}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="adminSectionHeader" style={{ marginTop: 0 }}><h2>{t.costs}</h2></div>
        <div className="financeList">
          {costs.map(c => (
            <div className="financeCard" key={c.name}>
              <strong>{c.name}</strong>
              <span className="adminBadge adminBadgeMuted">{c.type}</span>
              <span className="financeAmount">{c.amount} USD / {label(c.cycle)}</span>
              <span className={costBadge(c.status)}>{label(c.status)}</span>
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
