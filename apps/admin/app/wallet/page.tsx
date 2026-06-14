'use client';
import { FormEvent, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type Lang = 'ar' | 'en';

type Transaction = {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  createdAt: string;
};

type Wallet = {
  id?: string;
  userId: string;
  balance: number;
  currency?: string;
  transactions: Transaction[];
};

const ALLOWED_ROLES = ['finance', 'accountant', 'business', 'developer', 'operations', 'supervisor'];

const copy = {
  ar: {
    title: 'إدارة المحافظ',
    sub: 'بحث عن محفظة مستخدم، عرض الرصيد، المعاملات، وشحن الرصيد.',
    back: 'الرئيسية', portal: 'البوابة', finance: 'المحاسبة', toggle: 'English', logout: 'خروج',
    denied: 'هذه الصفحة مخصصة لحسابات المالية والمحاسبة والإدارة فقط.',
    search: 'بحث', searchPlaceholder: 'معرّف المستخدم أو رقم الهاتف',
    balance: 'الرصيد', currency: 'العملة', userId: 'معرّف المستخدم',
    transactions: 'آخر المعاملات', noTx: 'لا توجد معاملات.',
    topup: 'شحن رصيد', topupAmount: 'المبلغ', topupDesc: 'الوصف (اختياري)',
    topupDescDefault: 'شحن رصيد من لوحة الإدارة',
    topupBtn: 'شحن', topupSuccess: 'تم شحن الرصيد بنجاح ✓',
    topupError: 'تعذر شحن الرصيد. تحقق من المبلغ والاتصال.',
    allWallets: 'جميع المحافظ', loadAll: 'تحميل المحافظ',
    noWallets: 'لا توجد محافظ.',
    loading: 'جاري التحميل...', notFound: 'المحفظة غير موجودة.',
    searchError: 'تعذر البحث. تحقق من الاتصال.',
    typeLabel: 'النوع', amountLabel: 'المبلغ', descriptionLabel: 'الوصف', dateLabel: 'التاريخ',
    sdg: 'ج.س',
    noApi: 'وضع المعاينة: يلزم ربط الخادم.',
    txTypes: {
      TOPUP: 'شحن', RIDE_PAYMENT: 'دفع رحلة', DRIVER_EARNING: 'أرباح سائق',
      WITHDRAWAL: 'سحب', REFUND: 'رد مبلغ',
    },
  },
  en: {
    title: 'Wallet Management',
    sub: 'Search for a user wallet, view balance, transactions, and top up.',
    back: 'Home', portal: 'Portal', finance: 'Finance', toggle: 'العربية', logout: 'Logout',
    denied: 'This page is only for finance, accountant, and business admin accounts.',
    search: 'Search', searchPlaceholder: 'User ID or phone number',
    balance: 'Balance', currency: 'Currency', userId: 'User ID',
    transactions: 'Recent transactions', noTx: 'No transactions yet.',
    topup: 'Top up wallet', topupAmount: 'Amount', topupDesc: 'Description (optional)',
    topupDescDefault: 'Top up from admin panel',
    topupBtn: 'Top up', topupSuccess: 'Wallet topped up successfully ✓',
    topupError: 'Failed to top up. Check amount and connectivity.',
    allWallets: 'All wallets', loadAll: 'Load wallets',
    noWallets: 'No wallets found.',
    loading: 'Loading...', notFound: 'Wallet not found.',
    searchError: 'Search failed. Check connectivity.',
    typeLabel: 'Type', amountLabel: 'Amount', descriptionLabel: 'Description', dateLabel: 'Date',
    sdg: 'SDG',
    noApi: 'Preview mode: backend connection required.',
    txTypes: {
      TOPUP: 'Top up', RIDE_PAYMENT: 'Ride payment', DRIVER_EARNING: 'Driver earning',
      WITHDRAWAL: 'Withdrawal', REFUND: 'Refund',
    },
  },
};

function txColor(type: string): string {
  if (type === 'TOPUP' || type === 'DRIVER_EARNING' || type === 'REFUND') return 'var(--teal)';
  if (type === 'WITHDRAWAL' || type === 'RIDE_PAYMENT') return '#E74C3C';
  return 'var(--text)';
}

function WalletContent() {
  const searchParams = useSearchParams();
  const lang: Lang = searchParams.get('lang') === 'en' ? 'en' : 'ar';
  const ar = lang === 'ar';
  const t = copy[lang];

  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
  const getToken = () => (typeof window !== 'undefined' ? sessionStorage.getItem('jnbk_staff_token') || '' : '');
  const staffUsername = typeof window !== 'undefined' ? sessionStorage.getItem('jnbk_staff_username') || 'admin' : 'admin';

  const [allowed, setAllowed] = useState(false);
  const [query, setQuery] = useState('');
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState('');

  const [topupAmount, setTopupAmount] = useState('');
  const topupDescRef = useRef<HTMLInputElement>(null);
  const [topuping, setTopuping] = useState(false);
  const [topupMsg, setTopupMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [allWallets, setAllWallets] = useState<Wallet[]>([]);
  const [allLoading, setAllLoading] = useState(false);

  useEffect(() => {
    const role = sessionStorage.getItem('jnbk_active_role') || '';
    setAllowed(ALLOWED_ROLES.includes(role));
  }, []);

  const searchWallet = useCallback(async (userId: string) => {
    if (!userId.trim()) return;
    if (!apiBase) { setSearchMsg(t.noApi); return; }
    setSearching(true);
    setSearchMsg('');
    setWallet(null);
    setTopupMsg(null);
    try {
      const res = await fetch(`${apiBase}/api/wallet/${encodeURIComponent(userId.trim())}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.status === 404) { setSearchMsg(t.notFound); return; }
      if (!res.ok) { setSearchMsg(t.searchError); return; }
      const data: Wallet = await res.json();
      setWallet(data);
    } catch {
      setSearchMsg(t.searchError);
    } finally {
      setSearching(false);
    }
  }, [apiBase, t]);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    await searchWallet(query);
  }

  async function handleTopup(e: FormEvent) {
    e.preventDefault();
    if (!wallet) return;
    const amount = Number(topupAmount);
    if (!amount || amount <= 0) return;
    if (!apiBase) { setTopupMsg({ type: 'error', text: t.noApi }); return; }
    setTopuping(true);
    setTopupMsg(null);
    try {
      const desc = topupDescRef.current?.value?.trim() || t.topupDescDefault;
      const res = await fetch(`${apiBase}/api/wallet/${encodeURIComponent(wallet.userId)}/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ amount, description: `${desc} — ${staffUsername}` }),
      });
      if (res.ok) {
        const updated: Wallet = await res.json();
        setWallet(updated);
        setTopupAmount('');
        if (topupDescRef.current) topupDescRef.current.value = '';
        setTopupMsg({ type: 'success', text: t.topupSuccess });
      } else {
        setTopupMsg({ type: 'error', text: t.topupError });
      }
    } catch {
      setTopupMsg({ type: 'error', text: t.topupError });
    } finally {
      setTopuping(false);
    }
  }

  async function loadAllWallets() {
    if (!apiBase) return;
    setAllLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/wallet/admin/wallets`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data: Wallet[] = await res.json();
        setAllWallets(Array.isArray(data) ? data : []);
      }
    } catch { /* silent */ } finally {
      setAllLoading(false);
    }
  }

  function logout() { sessionStorage.clear(); window.location.href = `/portal?lang=${lang}`; }

  if (!allowed) {
    return (
      <main dir={ar ? 'rtl' : 'ltr'} style={{ textAlign: ar ? 'right' : 'left' }}>
        <section className="hero">
          <div className="heroTop">
            <div>
              <p className="kicker">Jnbk جنبك</p>
              <h1>{t.title}</h1>
              <p>{t.denied}</p>
            </div>
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
          <div className="topActions">
            <button className="languageSwitch buttonReset" onClick={logout}>{t.logout}</button>
            <a className="languageSwitch" href={`/finance?lang=${lang}`}>{t.finance}</a>
            <a className="languageSwitch" href="/">{t.back}</a>
            <a className="languageSwitch" href={`/wallet?lang=${ar ? 'en' : 'ar'}`}>{t.toggle}</a>
          </div>
        </div>
      </section>

      {/* ── Search ── */}
      <section className="panel">
        <h2>{t.search}</h2>
        <form className="formGrid" onSubmit={handleSearch} style={{ gridTemplateColumns: '1fr auto' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            disabled={searching}
          />
          <button className="primaryAction" type="submit" disabled={searching || !query.trim()}>
            {searching ? '...' : t.search}
          </button>
        </form>
        {searchMsg && <div className="notice error" style={{ marginTop: 10 }}>{searchMsg}</div>}
      </section>

      {/* ── Wallet detail ── */}
      {wallet && (
        <>
          <div className="grid settingsGrid">
            <div className="card">
              <p>{t.userId}</p>
              <strong style={{ fontSize: 13, fontFamily: 'monospace', wordBreak: 'break-all' }}>{wallet.userId}</strong>
            </div>
            <div className="card">
              <p>{t.balance}</p>
              <strong style={{ color: wallet.balance > 0 ? 'var(--teal)' : '#E74C3C', fontSize: 22 }}>
                {wallet.balance.toLocaleString()} <small style={{ fontSize: 13 }}>{wallet.currency || t.sdg}</small>
              </strong>
            </div>
          </div>

          {/* ── Top up ── */}
          <section className="panel">
            <h2>{t.topup}</h2>
            <form className="formGrid" onSubmit={handleTopup}>
              <input
                type="number"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                placeholder={t.topupAmount}
                min={1}
                max={1000000}
                disabled={topuping}
              />
              <input ref={topupDescRef} placeholder={t.topupDesc} disabled={topuping} />
              <button className="primaryAction" type="submit" disabled={topuping || !topupAmount}>
                {topuping ? '...' : t.topupBtn}
              </button>
            </form>
            {topupMsg && (
              <div className={`notice ${topupMsg.type === 'success' ? 'success' : 'error'}`} style={{ marginTop: 10 }}>
                {topupMsg.text}
              </div>
            )}
          </section>

          {/* ── Transactions ── */}
          <section className="panel">
            <h2>{t.transactions}</h2>
            {wallet.transactions.length === 0 ? (
              <div className="empty">{t.noTx}</div>
            ) : (
              <div className="table">
                <div className="row" style={{ background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-mid) 100%)', color: 'white' }}>
                  {[t.typeLabel, t.amountLabel, t.descriptionLabel, t.dateLabel].map((h) => (
                    <span key={h} style={{ color: 'rgba(255,255,255,.85)', fontWeight: 900, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</span>
                  ))}
                </div>
                {wallet.transactions.map((tx) => (
                  <div className="row" key={tx.id} style={{ alignItems: 'center' }}>
                    <b style={{ color: txColor(tx.type), fontSize: 12 }}>
                      {(t.txTypes as Record<string, string>)[tx.type] || tx.type}
                    </b>
                    <span style={{ fontWeight: 900, color: txColor(tx.type) }}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {tx.description ? (tx.description.length > 50 ? tx.description.slice(0, 50) + '…' : tx.description) : '—'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date(tx.createdAt).toLocaleDateString(ar ? 'ar-SD' : 'en-GB')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* ── All wallets overview ── */}
      <section className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>{t.allWallets}</h2>
          <button className="languageSwitch buttonReset" onClick={loadAllWallets} disabled={allLoading}>
            {allLoading ? '...' : t.loadAll}
          </button>
        </div>
        {allWallets.length === 0 && !allLoading && (
          <p className="muted">{t.noWallets}</p>
        )}
        {allLoading && <p className="muted">{t.loading}</p>}
        {allWallets.length > 0 && (
          <div className="table">
            {allWallets.map((w) => (
              <div
                key={w.userId}
                className="row"
                style={{ cursor: 'pointer', alignItems: 'center' }}
                onClick={() => { setQuery(w.userId); searchWallet(w.userId); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              >
                <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700 }}>{w.userId.slice(-12)}</span>
                <b style={{ color: w.balance > 0 ? 'var(--teal)' : 'var(--text-muted)' }}>
                  {w.balance.toLocaleString()} {w.currency || t.sdg}
                </b>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {(w.transactions?.length || 0)} tx
                </span>
                <span style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 700 }}>
                  {ar ? 'عرض ←' : 'View →'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default function WalletPage() {
  return (
    <Suspense>
      <WalletContent />
    </Suspense>
  );
}
