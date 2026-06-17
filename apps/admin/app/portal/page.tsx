'use client';
import { FormEvent, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { staffLogin } from '../lib/apiClient';

type Role = 'operations' | 'supervisor' | 'support' | 'accountant' | 'finance' | 'developer' | 'business';
type Lang = 'ar' | 'en';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

const roles: Record<Role, { ar: string; en: string; descAr: string; descEn: string; path: string; username: string }> = {
  operations:  { ar: 'مدير التشغيل',         en: 'Operations Manager',   descAr: 'إدارة الرحلات والسائقين والبلاغات ومؤشرات الأداء اليومية.',  descEn: 'Rides, drivers, incidents, and daily performance.',                path: '/operations', username: 'operations.manager' },
  supervisor:  { ar: 'مشرف الوردية',          en: 'Shift Supervisor',     descAr: 'متابعة الطلبات الحية والسائقين المتاحين والتصعيد السريع.',    descEn: 'Live requests, available drivers, and quick escalation.',           path: '/operations', username: 'shift.supervisor' },
  support:     { ar: 'مسؤول العملاء',         en: 'Customer Support',     descAr: 'الشكاوى، المفقودات، طلبات الهاتف، ومتابعة كبار السن.',         descEn: 'Complaints, lost items, phone orders, and senior support.',        path: '/operations', username: 'customer.support' },
  accountant:  { ar: 'المحاسب',               en: 'Accountant',           descAr: 'المحفظة، العمولات، الاشتراكات، التحصيل، والمصروفات.',           descEn: 'Wallet, commissions, subscriptions, collections, and expenses.',   path: '/finance',    username: 'accountant' },
  finance:     { ar: 'المالية',               en: 'Finance',              descAr: 'متابعة الماليات العامة والاشتراكات.',                          descEn: 'Track finance and subscriptions.',                                 path: '/finance',    username: 'finance.officer' },
  developer:   { ar: 'حساب المطور',           en: 'Developer Account',    descAr: 'الربط التقني وإعدادات الخادم فقط.',                           descEn: 'Technical integrations and server settings only.',                 path: '/settings',   username: 'developer' },
  business:    { ar: 'الإدارة',              en: 'Management',           descAr: 'المدن، المناطق، المركبات، الأسعار، الاتفاقات، ونسب الأرباح.',  descEn: 'Cities, zones, vehicles, pricing, agreements, and profit share.', path: '/business',   username: 'business.admin' },
};

const copy = {
  ar: {
    title: 'بوابة دخول Jnbk جنبك',
    sub: 'اضغط على مسمى الحساب، ثم اكتب كلمة السر فقط.',
    username: 'اسم المستخدم',
    password: 'كلمة السر',
    login: 'دخول',
    bad: 'بيانات الدخول غير صحيحة لهذه الصلاحية',
    choose: 'اختر حسابك',
    toggle: 'English',
    home: 'الرئيسية',
    note: 'اضغط على الصلاحية المطلوبة، وسيتم تجهيز اسم المستخدم تلقائيًا. كلمة السر الافتراضية 123456.',
    noApi: 'وضع المعاينة — سيعمل التطبيق بدون خادم. تأكد من ربط NEXT_PUBLIC_API_URL للإنتاج.',
    show: 'إظهار',
    hide: 'إخفاء',
    connecting: 'جارٍ التحقق...',
    selected: 'الحساب المختار',
    change: 'تغيير الحساب',
    customUsername: 'اسم مستخدم آخر',
    useCustom: 'دخول باسم مستخدم آخر',
    hideCustom: 'إخفاء اسم المستخدم',
    clickToLogin: 'اضغط للدخول',
  },
  en: {
    title: 'Jnbk Staff Portal',
    sub: 'Tap your account type, then enter only the password.',
    username: 'Username',
    password: 'Password',
    login: 'Login',
    bad: 'Invalid credentials for this role',
    choose: 'Choose your account',
    toggle: 'العربية',
    home: 'Home',
    note: 'Tap the required role and the username will be prepared automatically. Default password is 123456.',
    noApi: 'Preview mode — app works without a backend. Connect NEXT_PUBLIC_API_URL for production.',
    show: 'Show',
    hide: 'Hide',
    connecting: 'Verifying...',
    selected: 'Selected account',
    change: 'Change account',
    customUsername: 'Another username',
    useCustom: 'Use another username',
    hideCustom: 'Hide username',
    clickToLogin: 'Tap to login',
  },
};

function clearSessions() {
  const keys = ['operations', 'supervisor', 'support', 'accountant', 'finance', 'developer', 'business', 'dev'];
  keys.forEach((r) => sessionStorage.removeItem(`jnbk_${r}_auth`));
  sessionStorage.removeItem('jnbk_active_role');
  sessionStorage.removeItem('jnbk_staff_token');
  sessionStorage.removeItem('jnbk_staff_profile');
  sessionStorage.removeItem('jnbk_must_change_password');
}

function storeSession(role: Role, profile: Record<string, unknown>, token?: string) {
  clearSessions();
  sessionStorage.setItem(`jnbk_${role}_auth`, 'true');
  sessionStorage.setItem('jnbk_active_role', role);
  sessionStorage.setItem('jnbk_staff_profile', JSON.stringify(profile));
  if (token) sessionStorage.setItem('jnbk_staff_token', token);
  if (role === 'developer') sessionStorage.setItem('jnbk_dev_auth', 'true');
  if (['operations', 'supervisor', 'support'].includes(role)) sessionStorage.setItem('jnbk_operations_auth', 'true');
}

function redirectAfterLogin(role: Role, lang: Lang, isDefaultPassword: boolean) {
  if (role !== 'developer' && isDefaultPassword) {
    sessionStorage.setItem('jnbk_must_change_password', 'true');
    window.location.href = `/first-login?lang=${lang}`;
    return;
  }
  window.location.href = `${roles[role].path}?lang=${lang}`;
}

export default function Portal() {
  const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
  const initial = (params.get('lang') === 'en' ? 'en' : 'ar') as Lang;
  const [lang] = useState<Lang>(initial);
  const [role, setRole] = useState<Role | null>(null);
  const [username, setUsername] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showUsername, setShowUsername] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const t = copy[lang];
  const ar = lang === 'ar';

  function selectRole(nextRole: Role) {
    setRole(nextRole);
    setUsername(roles[nextRole].username);
    setPw('');
    setErr('');
    setShowUsername(false);
  }

  useEffect(() => {
    if (!role) return;
    const timer = window.setTimeout(() => passwordRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [role]);

  async function login(e: FormEvent) {
    e.preventDefault();
    if (!role) return;
    setErr('');
    setLoading(true);
    const loginUsername = username || roles[role].username;

    if (!apiUrl) {
      storeSession(role, { username: loginUsername, role }, undefined);
      redirectAfterLogin(role, lang, pw === '123456');
      return;
    }

    try {
      const result = await staffLogin(loginUsername, pw, role);
      storeSession(role, result.staff, result.token);
      redirectAfterLogin(role, lang, pw === '123456');
    } catch (err_: unknown) {
      const msg = err_ instanceof Error ? err_.message : String(err_);
      setErr(msg.includes('credentials') ? t.bad : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir={ar ? 'rtl' : 'ltr'} style={{ textAlign: ar ? 'right' : 'left' }}>
      <header className="site-header">
        <Image src="/logo.png" alt="Jnbk جنبك" width={120} height={52} className="site-logo" priority />
        <div className="adminHeroActions" style={{ marginInlineStart: 'auto' }}>
          <a className="languageSwitch" href="/">{t.home}</a>
          <a className="languageSwitch" href={`/portal?lang=${ar ? 'en' : 'ar'}`}>{t.toggle}</a>
        </div>
      </header>

      <section className="hero">
        <div className="heroTop">
          <div>
            <div className="hero-logo">
              <Image src="/logo.png" alt="Jnbk" width={64} height={64} style={{ filter: 'brightness(0) invert(1)', height: 52, width: 'auto' }} />
            </div>
            <p className="kicker">Jnbk جنبك</p>
            <h1>{t.title}</h1>
            <p>{t.sub}</p>
          </div>
        </div>
      </section>

      {!apiUrl && <div className="notice error" style={{ margin: '0 0 8px' }}>{t.noApi}</div>}

      <section className="panel">
        <div className="adminSectionHeader" style={{ marginTop: 0 }}>
          <div>
            <h2>{t.choose}</h2>
            <p className="muted" style={{ margin: 0 }}>{t.note}</p>
          </div>
          {role && <button className="languageSwitch buttonReset" type="button" onClick={() => { setRole(null); setPw(''); }}>{t.change}</button>}
        </div>

        {!role ? (
          <div className="grid settingsGrid">
            {(Object.keys(roles) as Role[]).map((k) => (
              <button
                key={k}
                className="card buttonReset"
                type="button"
                onClick={() => selectRole(k)}
                style={{ textAlign: ar ? 'right' : 'left' }}
              >
                <p>{ar ? roles[k].ar : roles[k].en}</p>
                <strong>{ar ? t.clickToLogin : k}</strong>
                <p className="muted">{ar ? roles[k].descAr : roles[k].descEn}</p>
              </button>
            ))}
          </div>
        ) : (
          <form className="formGrid" onSubmit={login}>
            <div className="adminDataCard">
              <span className="adminDataLabel">{t.selected}</span>
              <strong className="adminDataValue" style={{ fontSize: 22 }}>{ar ? roles[role].ar : roles[role].en}</strong>
              <span className="adminInfoMuted">{username || roles[role].username}</span>
            </div>

            {showUsername && (
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.username}
                autoComplete="username"
              />
            )}

            <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
              <input
                ref={passwordRef}
                style={{ flex: 1 }}
                type={showPw ? 'text' : 'password'}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder={t.password}
                autoComplete="current-password"
              />
              <button
                className="languageSwitch buttonReset"
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{ color: '#063B63', background: '#F7FAFC', border: '1px solid #D9E2EC' }}
              >
                {showPw ? t.hide : t.show}
              </button>
            </div>

            <button className="languageSwitch buttonReset" type="button" onClick={() => setShowUsername(!showUsername)} style={{ color: '#063B63', background: '#F7FAFC', border: '1px solid #D9E2EC' }}>
              {showUsername ? t.hideCustom : t.useCustom}
            </button>

            {err ? <div className="notice error">{err}</div> : null}

            <button className="primaryAction" type="submit" disabled={loading || !pw}>
              {loading ? t.connecting : `${t.login} — ${ar ? roles[role].ar : roles[role].en}`}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
