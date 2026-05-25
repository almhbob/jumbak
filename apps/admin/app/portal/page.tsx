'use client';
import { FormEvent, useState } from 'react';
import { staffLogin } from '../lib/apiClient';

type Role = 'operations' | 'supervisor' | 'support' | 'accountant' | 'finance' | 'developer' | 'business';
type Lang = 'ar' | 'en';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

const roles: Record<Role, { ar: string; en: string; descAr: string; descEn: string; path: string }> = {
  operations:  { ar: 'مدير التشغيل',         en: 'Operations Manager',   descAr: 'إدارة الرحلات والسائقين والبلاغات ومؤشرات الأداء اليومية.',  descEn: 'Rides, drivers, incidents, and daily performance.',                path: '/operations' },
  supervisor:  { ar: 'مشرف الوردية',          en: 'Shift Supervisor',     descAr: 'متابعة الطلبات الحية والسائقين المتاحين والتصعيد السريع.',    descEn: 'Live requests, available drivers, and quick escalation.',           path: '/operations' },
  support:     { ar: 'مسؤول العملاء',         en: 'Customer Support',     descAr: 'الشكاوى، المفقودات، طلبات الهاتف، ومتابعة كبار السن.',         descEn: 'Complaints, lost items, phone orders, and senior support.',        path: '/operations' },
  accountant:  { ar: 'المحاسب',               en: 'Accountant',           descAr: 'المحفظة، العمولات، الاشتراكات، التحصيل، والمصروفات.',           descEn: 'Wallet, commissions, subscriptions, collections, and expenses.',   path: '/finance'    },
  finance:     { ar: 'المالية',               en: 'Finance',              descAr: 'متابعة الماليات العامة والاشتراكات.',                          descEn: 'Track finance and subscriptions.',                                 path: '/finance'    },
  developer:   { ar: 'حساب المطور',           en: 'Developer Account',    descAr: 'المدن، المناطق، المركبات، الأسعار، والربط التقني.',            descEn: 'Cities, zones, vehicles, pricing, and technical integrations.',    path: '/settings'   },
  business:    { ar: 'الإدارة والاتفاقات',    en: 'Business & Agreements',descAr: 'الاشتراكات، نسب الأرباح، العقود، وروابط السداد.',              descEn: 'Subscriptions, profit share, agreements, and payment links.',      path: '/business'   },
};

const copy = {
  ar: {
    title: 'بوابة دخول Jnbk جنبك',
    sub: 'رابط موحد لكل الموظفين والمشغلين مع صلاحيات منفصلة لكل وظيفة.',
    username: 'اسم المستخدم',
    password: 'كلمة السر',
    login: 'دخول',
    bad: 'بيانات الدخول غير صحيحة لهذه الصلاحية',
    choose: 'اختر حساب الموظف',
    toggle: 'English',
    home: 'الرئيسية',
    note: 'كلمة السر الافتراضية لكل حسابات الموظفين هي 123456. يجب تغييرها بعد أول دخول.',
    noApi: 'وضع المعاينة — سيعمل التطبيق بدون خادم. تأكد من ربط NEXT_PUBLIC_API_URL للإنتاج.',
    show: 'إظهار',
    hide: 'إخفاء',
    connecting: 'جارٍ التحقق...',
  },
  en: {
    title: 'Jnbk Staff Portal',
    sub: 'One link for all operators and staff with separated permissions per job.',
    username: 'Username',
    password: 'Password',
    login: 'Login',
    bad: 'Invalid credentials for this role',
    choose: 'Choose staff account',
    toggle: 'العربية',
    home: 'Home',
    note: 'The default password for all staff accounts is 123456. Each staff member must change it after first login.',
    noApi: 'Preview mode — app works without a backend. Connect NEXT_PUBLIC_API_URL for production.',
    show: 'Show',
    hide: 'Hide',
    connecting: 'Verifying...',
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
  const [role, setRole] = useState<Role>('operations');
  const [username, setUsername] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const t = copy[lang];
  const ar = lang === 'ar';

  async function login(e: FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);

    if (!apiUrl) {
      // Preview mode: accept any credentials with a clear warning already shown
      storeSession(role, { username: username || role, role }, undefined);
      redirectAfterLogin(role, lang, pw === '123456');
      return;
    }

    try {
      const result = await staffLogin(username, pw, role);
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
      <section className="hero">
        <div className="heroTop">
          <div>
            <p className="kicker">Jnbk جنبك</p>
            <h1>{t.title}</h1>
            <p>{t.sub}</p>
          </div>
          <div className="topActions">
            <a className="languageSwitch" href="/">{t.home}</a>
            <a className="languageSwitch" href={`/portal?lang=${ar ? 'en' : 'ar'}`}>{t.toggle}</a>
          </div>
        </div>
      </section>

      {!apiUrl && (
        <div className="notice error" style={{ margin: '0 0 8px' }}>{t.noApi}</div>
      )}

      <section className="panel">
        <h2>{t.choose}</h2>
        <p className="muted">{t.note}</p>
        <div className="grid settingsGrid">
          {(Object.keys(roles) as Role[]).map((k) => (
            <button
              key={k}
              className="card buttonReset"
              type="button"
              onClick={() => setRole(k)}
              style={{ border: role === k ? '2px solid #D6A936' : '0', textAlign: ar ? 'right' : 'left' }}
            >
              <p>{ar ? roles[k].ar : roles[k].en}</p>
              <strong>{k}</strong>
              <p className="muted">{ar ? roles[k].descAr : roles[k].descEn}</p>
            </button>
          ))}
        </div>

        {err ? <div className="notice error">{err}</div> : null}

        <form className="formGrid" onSubmit={login}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t.username}
            autoComplete="username"
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
            <input
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
          <button className="primaryAction" type="submit" disabled={loading}>
            {loading ? t.connecting : `${t.login} — ${ar ? roles[role].ar : roles[role].en}`}
          </button>
        </form>
      </section>
    </main>
  );
}
