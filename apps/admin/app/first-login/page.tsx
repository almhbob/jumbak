'use client';
import { FormEvent, useState } from 'react';
import { changePassword } from '../lib/apiClient';

type Lang = 'ar' | 'en';
type Role = 'operations' | 'supervisor' | 'support' | 'accountant' | 'finance' | 'developer' | 'business';

const paths: Record<Role, string> = {
  operations: '/operations',
  supervisor: '/operations',
  support: '/operations',
  accountant: '/finance',
  finance: '/finance',
  developer: '/settings',
  business: '/business',
};

const copy = {
  ar: {
    title: 'تحديث رمز الدخول',
    sub: 'لأمان الحساب يجب تغيير الرمز الافتراضي بعد أول دخول.',
    current: 'الرمز الحالي (123456)',
    a: 'الرمز الجديد',
    b: 'تأكيد الرمز الجديد',
    save: 'حفظ ومتابعة',
    errMismatch: 'الرمزان غير متطابقان.',
    errShort: 'يجب أن يكون الرمز 6 خانات على الأقل.',
    errSame: 'لا يمكن استخدام الرمز الافتراضي 123456 مرة أخرى.',
    errApi: 'تعذر الحفظ على الخادم. تأكد من بيانات الدخول وحاول مجددًا.',
    done: 'تم تغيير الرمز بنجاح. جارٍ التوجيه...',
    portal: 'بوابة الدخول',
    noApi: 'وضع المعاينة: تغيير كلمة السر يتطلب ربط الخادم.',
  },
  en: {
    title: 'Update access code',
    sub: 'For account security, update the default access code after first login.',
    current: 'Current code (123456)',
    a: 'New code',
    b: 'Confirm new code',
    save: 'Save and continue',
    errMismatch: 'Codes do not match.',
    errShort: 'Code must be at least 6 characters.',
    errSame: 'Cannot reuse the default password 123456.',
    errApi: 'Could not save to server. Check your credentials and try again.',
    done: 'Password changed successfully. Redirecting...',
    portal: 'Portal',
    noApi: 'Preview mode: changing password requires a connected backend.',
  },
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

export default function FirstLogin() {
  const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
  const lang: Lang = params.get('lang') === 'en' ? 'en' : 'ar';
  const ar = lang === 'ar';
  const t = copy[lang];

  const role = (typeof window !== 'undefined'
    ? (sessionStorage.getItem('jnbk_active_role') || 'operations')
    : 'operations') as Role;

  const [current, setCurrent] = useState('');
  const [v, setV] = useState('');
  const [c, setC] = useState('');
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  function showError(text: string) { setMsg(text); setIsError(true); }
  function showSuccess(text: string) { setMsg(text); setIsError(false); }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg('');

    if (v.length < 6) return showError(t.errShort);
    if (v !== c) return showError(t.errMismatch);
    if (v === '123456') return showError(t.errSame);

    if (!apiUrl) {
      return showError(t.noApi);
    }

    setLoading(true);
    try {
      await changePassword(current || '123456', v);
      showSuccess(t.done);
      sessionStorage.removeItem('jnbk_must_change_password');
      setTimeout(() => {
        window.location.href = `${paths[role] || '/'}?lang=${lang}`;
      }, 800);
    } catch {
      showError(t.errApi);
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
          <a className="languageSwitch" href={`/portal?lang=${lang}`}>{t.portal}</a>
        </div>
      </section>

      {msg ? <div className={`notice ${isError ? 'error' : 'success'}`}>{msg}</div> : null}

      <section className="panel">
        <form className="formGrid" onSubmit={submit}>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder={t.current}
            autoComplete="current-password"
          />
          <input
            type="password"
            value={v}
            onChange={(e) => setV(e.target.value)}
            placeholder={t.a}
            autoComplete="new-password"
          />
          <input
            type="password"
            value={c}
            onChange={(e) => setC(e.target.value)}
            placeholder={t.b}
            autoComplete="new-password"
          />
          <button className="primaryAction" type="submit" disabled={loading}>
            {loading ? '...' : t.save}
          </button>
        </form>
      </section>
    </main>
  );
}
