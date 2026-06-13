'use client';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost, apiPatch, isApiConfigured } from '../lib/apiClient';

type Lang = 'ar' | 'en';
type StaffRole = 'operations' | 'supervisor' | 'support' | 'accountant' | 'finance' | 'developer' | 'business';
type Staff = {
  id: string; name: string; phone?: string; email?: string;
  role: StaffRole; status: 'active' | 'paused'; username: string;
  temporaryPassword?: string; internalNotes?: string;
  createdAt?: string; shift?: string; workspace?: string;
};

const roleLabels: Record<StaffRole, { ar: string; en: string; workspace: string; level: string }> = {
  operations: { ar: 'مدير التشغيل',  en: 'Operations Manager', workspace: '/operations', level: 'L1'    },
  supervisor:  { ar: 'مشرف الوردية', en: 'Shift Supervisor',   workspace: '/operations', level: 'L2'    },
  support:     { ar: 'مسؤول العملاء',en: 'Customer Support',   workspace: '/operations', level: 'L2'    },
  accountant:  { ar: 'المحاسب',      en: 'Accountant',         workspace: '/finance',    level: 'L2'    },
  finance:     { ar: 'المالية',      en: 'Finance',            workspace: '/finance',    level: 'L2'    },
  developer:   { ar: 'المطور',       en: 'Developer',          workspace: '/settings',   level: 'Admin' },
  business:    { ar: 'الإدارة',      en: 'Management',         workspace: '/business',   level: 'Admin' },
};

const roleColors: Record<StaffRole, string> = {
  operations: '#0E8FB3',
  supervisor: '#3B82F6',
  support:    '#8B5CF6',
  accountant: '#10B981',
  finance:    '#059669',
  developer:  '#F59E0B',
  business:   '#D6A936',
};

const rolePlans: {
  role: StaffRole;
  missionAr: string; missionEn: string;
  kpiAr: string; kpiEn: string;
  handoverAr: string; handoverEn: string;
  dailyAr: string[]; dailyEn: string[];
  weeklyAr: string[]; weeklyEn: string[];
  limitsAr: string[]; limitsEn: string[];
}[] = [
  { role: 'operations',  missionAr: 'قيادة التشغيل اليومي وتوزيع الورديات ومتابعة مؤشرات الأداء.',            missionEn: 'Lead daily operations, shifts, and performance indicators.',            kpiAr: 'تقرير يومي + زمن استجابة أقل',  kpiEn: 'Daily report + lower response time',         handoverAr: 'يستلم من المشرفين ويرفع للإدارة.',              handoverEn: 'Receives from supervisors and reports to management.',        dailyAr: ['اعتماد خطة الوردية', 'متابعة الرحلات اليومية', 'مراجعة البلاغات الحرجة', 'رفع تقرير نهاية اليوم'],      dailyEn: ['Approve shift plan', 'Monitor daily rides', 'Review critical issues', 'Submit end-of-day report'],       weeklyAr: ['مراجعة جودة الجوكية', 'تحليل أوقات الذروة', 'اقتراح تحسينات تشغيلية'], weeklyEn: ['Review driver quality', 'Analyze peak hours', 'Suggest operations improvements'], limitsAr: ['لا يعدل العقود أو النسب', 'لا يغير إعدادات النظام'],         limitsEn: ['No contract/share editing', 'No system settings changes'] },
  { role: 'supervisor',  missionAr: 'متابعة الرحلات الحية والسائقين والتصعيد السريع.',                        missionEn: 'Track live rides, drivers, and fast escalation.',                       kpiAr: 'حل البلاغ العاجل فورًا',         kpiEn: 'Immediate urgent issue handling',            handoverAr: 'يستلم من الدعم ويسلم لمدير التشغيل.',           handoverEn: 'Receives from support and hands over to operations manager.', dailyAr: ['متابعة السائقين المتصلين', 'إدخال طلبات الهاتف/SMS', 'التدخل في الرحلات المتأخرة', 'تصعيد الحالات الأمنية'], dailyEn: ['Track online drivers', 'Enter phone/SMS orders', 'Handle delayed rides', 'Escalate safety cases'],       weeklyAr: ['تلخيص مشاكل الوردية', 'تقييم التغطية حسب الأحياء'],           weeklyEn: ['Summarize shift issues', 'Evaluate coverage by zones'],           limitsAr: ['لا يعتمد جوكي نهائيًا', 'لا يرى النسب والعقود'],               limitsEn: ['No final driver approval', 'No contracts/shares access']   },
  { role: 'support',     missionAr: 'استقبال العملاء والشكاوى والمفقودات وتوثيق الحلول.',                     missionEn: 'Handle customers, complaints, lost items, and resolutions.',            kpiAr: 'إغلاق الطلب خلال 24 ساعة',      kpiEn: 'Close ticket within 24 hours',               handoverAr: 'يصعد البلاغ العاجل للمشرف.',                    handoverEn: 'Escalates urgent issues to supervisor.',                      dailyAr: ['استلام الشكاوى', 'تصنيف طلب الدعم', 'متابعة المفقودات', 'إغلاق البلاغ بعد الحل'],                   dailyEn: ['Receive complaints', 'Classify tickets', 'Follow lost items', 'Close resolved cases'],                  weeklyAr: ['تقرير أكثر الشكاوى تكرارًا', 'اقتراح رسائل جاهزة للعملاء'],   weeklyEn: ['Report repeated complaints', 'Suggest customer reply templates'], limitsAr: ['لا يوقف السائق إلا بتصعيد', 'لا يعدل الأسعار'],               limitsEn: ['No driver suspension without escalation', 'No pricing edits'] },
  { role: 'accountant',  missionAr: 'إدارة التحصيل والمصروفات والتقارير المالية.',                             missionEn: 'Manage collections, costs, and financial reports.',                     kpiAr: 'مطابقة أسبوعية دقيقة',           kpiEn: 'Accurate weekly reconciliation',             handoverAr: 'يستلم بيانات التشغيل ويصدر تقريرًا للإدارة.',  handoverEn: 'Receives operations data and reports to management.',         dailyAr: ['مطابقة النقد والتحويلات', 'حساب الاشتراكات', 'تسجيل المصروفات', 'مراجعة المحافظ'],                   dailyEn: ['Reconcile cash/transfers', 'Calculate subscriptions', 'Record costs', 'Review wallets'],               weeklyAr: ['إصدار تقرير مالي', 'مطابقة الاشتراكات المتأخرة', 'رفع ملخص للإدارة'], weeklyEn: ['Issue finance report', 'Reconcile overdue subscriptions', 'Send management summary'], limitsAr: ['لا يغير النسب المقفلة', 'لا ينشئ عقدًا جديدًا'],             limitsEn: ['No locked share changes', 'No new contract creation']      },
  { role: 'finance',     missionAr: 'متابعة الماليات العامة والاشتراكات.',                                     missionEn: 'Track finance and subscriptions.',                                      kpiAr: 'تقرير منصرفات واضح',             kpiEn: 'Clear cost report',                          handoverAr: 'يرفع للمحاسب أو الإدارة حسب الحالة.',          handoverEn: 'Hands over to accountant or management.',                    dailyAr: ['متابعة الاشتراكات', 'مراجعة المنصرفات', 'تجهيز ملخص مالي', 'مطابقة الروابط'],                        dailyEn: ['Track subscriptions', 'Review costs', 'Prepare finance summary', 'Reconcile links'],                   weeklyAr: ['تحديث حالة الاشتراكات', 'تنبيه المنصرفات القادمة'],            weeklyEn: ['Update subscription status', 'Flag upcoming costs'],              limitsAr: ['لا يرى أسرار النظام', 'لا يعدل بيانات الموظفين'],             limitsEn: ['No secret access', 'No staff edits']                       },
  { role: 'developer',   missionAr: 'الربط التقني وإعدادات الخادم والإصدارات.',                                missionEn: 'Technical integrations, server settings, and releases.',               kpiAr: 'لا أعطال حرجة',                  kpiEn: 'No critical blockers',                       handoverAr: 'يستلم البلاغات التقنية من التشغيل.',            handoverEn: 'Receives technical issues from operations.',                  dailyAr: ['إدارة Firebase', 'إعدادات الخادم', 'إصلاح الأعطال', 'مراجعة الـ API'],                                dailyEn: ['Manage Firebase', 'Server settings', 'Fix bugs', 'Review API'],                                        weeklyAr: ['تجهيز APK', 'مراجعة الأداء', 'تحديث النسخة التجريبية'],       weeklyEn: ['Prepare APK', 'Review performance', 'Update preview build'],      limitsAr: ['لا يغير العقود والنسب', 'لا يدير الموظفين'],                  limitsEn: ['No contracts/shares', 'No staff management']               },
  { role: 'business',    missionAr: 'إدارة العقود والنسب والتوسعة وكل قرارات المنظومة.',                       missionEn: 'Manage contracts, shares, expansion, and system-wide decisions.',        kpiAr: 'قرارات موثقة بعقد',              kpiEn: 'Documented decisions by contract',           handoverAr: 'يعتمد من التقارير المالية والتشغيلية.',         handoverEn: 'Approves from finance and operations reports.',               dailyAr: ['مراجعة التقارير', 'اعتماد القرارات العليا', 'متابعة الموظفين', 'إدارة المناطق والأسعار'],              dailyEn: ['Review reports', 'Approve high-level decisions', 'Manage staff', 'Manage zones and pricing'],           weeklyAr: ['اعتماد المدن الجديدة', 'مراجعة الأرشيف التعاقدي', 'تحديث خطة التوسع'], weeklyEn: ['Approve new cities', 'Review contract archive', 'Update expansion plan'], limitsAr: ['أي تغيير جوهري يستلزم توثيقًا'],                              limitsEn: ['Any core change requires documentation']                   },
];

const copy = {
  ar: {
    title: 'إدارة الموظفين', sub: 'إضافة الموظفين وتحديد صلاحياتهم ومهامهم اليومية والأسبوعية.',
    back: 'الإدارة', portal: 'البوابة', logout: 'خروج', add: 'إضافة موظف جديد',
    name: 'الاسم الكامل', phone: 'رقم الهاتف', email: 'البريد الإلكتروني',
    role: 'الدور الوظيفي', shift: 'الوردية', internalNotes: 'ملاحظات داخلية',
    save: 'إنشاء الحساب', active: 'نشط', paused: 'موقوف',
    employees: 'الموظفون', tasks: 'مهام وصلاحيات كل دور',
    copy: 'نسخ بيانات الدخول', copied: 'تم النسخ', empty: 'لا يوجد موظفون بعد.',
    denied: 'هذه الصفحة مخصصة لحساب الإدارة فقط.',
    toggle: 'English', apiReady: 'متصل بالخادم', apiMissing: 'وضع المعاينة — لا يوجد خادم',
    saved: 'تم إنشاء الحساب وحفظه بنجاح.', failed: 'تعذر الحفظ على الخادم. تم حفظ محلي.',
    hidden: 'مخفية بعد الحفظ', credentials: 'بيانات الدخول', workspace: 'مساحة العمل',
    level: 'المستوى', open: 'فتح اللوحة', username: 'اسم المستخدم', password: 'كلمة المرور',
    activate: 'تفعيل', pause: 'إيقاف', defaultPass: 'كلمة المرور الافتراضية: 123456 — يجب تغييرها عند أول دخول.',
    mission: 'المهمة', kpi: 'مؤشر الأداء', handover: 'التسليم', daily: 'مهام يومية',
    weekly: 'مهام أسبوعية', limits: 'حدود الصلاحية',
  },
  en: {
    title: 'Staff Management', sub: 'Add staff, set permissions, and assign daily and weekly tasks.',
    back: 'Management', portal: 'Portal', logout: 'Logout', add: 'Add new employee',
    name: 'Full name', phone: 'Phone number', email: 'Email address',
    role: 'Job role', shift: 'Shift', internalNotes: 'Internal notes (admin only)',
    save: 'Create account', active: 'Active', paused: 'Paused',
    employees: 'Employees', tasks: 'Role tasks and permissions',
    copy: 'Copy login details', copied: 'Copied', empty: 'No employees yet.',
    denied: 'This page is only for the Management account.',
    toggle: 'العربية', apiReady: 'Connected to backend', apiMissing: 'Preview mode — no backend',
    saved: 'Account created and saved successfully.', failed: 'Backend unavailable. Saved locally.',
    hidden: 'Hidden after save', credentials: 'Login credentials', workspace: 'Workspace',
    level: 'Level', open: 'Open panel', username: 'Username', password: 'Password',
    activate: 'Activate', pause: 'Pause', defaultPass: 'Default password: 123456 — must be changed on first login.',
    mission: 'Mission', kpi: 'KPI', handover: 'Handover', daily: 'Daily tasks',
    weekly: 'Weekly tasks', limits: 'Access limits',
  },
};

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL || '/portal';

function makeId() { return `staff_${Date.now()}`; }
function makeUsername(name: string, role: StaffRole) {
  const clean = name.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '') || role;
  return `${clean}.${role}`;
}
function logout(lang: Lang) { sessionStorage.clear(); window.location.href = `/portal?lang=${lang}`; }
function initials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '?';
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#7A92A8', marginBottom: 5, letterSpacing: '0.3px', textTransform: 'uppercase' as const }}>
      {children}
    </label>
  );
}

function TaskList({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={{ background: '#F7FAFC', border: '1px solid #E7EEF5', borderRadius: 12, padding: '10px 14px' }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#7A92A8', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: 6 }}>{title}</div>
      <ol style={{ margin: 0, paddingInlineStart: 18 }}>
        {items.map((x, i) => <li key={i} style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.8, color: '#0D2137' }}>{x}</li>)}
      </ol>
    </div>
  );
}

export default function StaffPage() {
  const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
  const initial = (params.get('lang') === 'en' ? 'en' : 'ar') as Lang;
  const [lang] = useState<Lang>(initial);
  const [allowed, setAllowed] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selected, setSelected] = useState<Staff | null>(null);
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const t = copy[lang];
  const ar = lang === 'ar';

  useEffect(() => {
    const ok =
      sessionStorage.getItem('jnbk_business_auth') === 'true' &&
      sessionStorage.getItem('jnbk_active_role') === 'business';
    setAllowed(ok);
    if (!ok) return;
    apiGet<Staff[]>('/api/staff', [])
      .then((data) => { setStaff(data); })
      .catch(() => {
        const saved = localStorage.getItem('jnbk_staff');
        if (saved) setStaff(JSON.parse(saved));
      });
  }, []);

  useEffect(() => {
    if (!isApiConfigured()) localStorage.setItem('jnbk_staff', JSON.stringify(staff));
  }, [staff]);

  const stats = useMemo(() => ({
    total: staff.length,
    active: staff.filter((x) => x.status === 'active').length,
    roles: new Set(staff.map((x) => x.role)).size,
  }), [staff]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get('name') || '').trim();
    const role = String(f.get('role') || 'operations') as StaffRole;
    const shift = String(f.get('shift') || '').trim();
    const body = {
      name, role,
      phone: String(f.get('phone') || '').trim(),
      email: String(f.get('email') || '').trim(),
      username: makeUsername(name, role),
      notes: String(f.get('internalNotes') || '').trim(),
      shift,
      workspace: roleLabels[role].workspace,
    };
    try {
      const result = await apiPost<{ staff: Staff; temporaryPassword: string }>('/api/staff', body);
      const item: Staff = { ...result.staff, temporaryPassword: result.temporaryPassword, internalNotes: body.notes, shift, workspace: roleLabels[role].workspace };
      setStaff([item, ...staff]);
      setSelected(item);
      setNotice({ text: t.saved, type: 'success' });
    } catch {
      const item: Staff = {
        id: makeId(), name, phone: body.phone, email: body.email, role,
        status: 'active', username: body.username, temporaryPassword: '123456',
        internalNotes: body.notes, createdAt: new Date().toISOString(), shift, workspace: roleLabels[role].workspace,
      };
      setStaff([item, ...staff]);
      setSelected(item);
      setNotice({ text: t.failed, type: 'error' });
    }
    e.currentTarget.reset();
  }

  async function toggle(item: Staff) {
    const next = item.status === 'active' ? 'paused' : 'active';
    try {
      const result = await apiPatch<{ staff: Staff }>(`/api/staff/${item.id}`, { status: next });
      setStaff(prev => prev.map((x) => (x.id === item.id ? result.staff : x)));
      if (selected?.id === item.id) setSelected(result.staff);
    } catch {
      const updated = { ...item, status: next as 'active' | 'paused' };
      setStaff(prev => prev.map((x) => (x.id === item.id ? updated : x)));
      if (selected?.id === item.id) setSelected(updated);
    }
  }

  async function copyLogin(item: Staff) {
    const pass = item.temporaryPassword || t.hidden;
    const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}${PORTAL_URL}` : PORTAL_URL;
    const text = `Jnbk جنبك\n${ar ? 'الاسم' : 'Name'}: ${item.name}\n${ar ? 'الدور' : 'Role'}: ${ar ? roleLabels[item.role].ar : roleLabels[item.role].en}\n${ar ? 'اسم المستخدم' : 'Username'}: ${item.username}\n${ar ? 'كلمة المرور' : 'Password'}: ${pass}\n${ar ? 'البوابة' : 'Portal'}: ${portalUrl}`;
    try {
      await navigator.clipboard?.writeText(text);
      setNotice({ text: t.copied, type: 'success' });
    } catch {
      prompt(t.copy, text);
    }
  }

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

      {/* Header */}
      <section className="hero">
        <div className="heroTop">
          <div>
            <p className="kicker">Jnbk جنبك</p>
            <h1>{t.title}</h1>
            <p>{t.sub}</p>
          </div>
          <div className="topActions">
            <a className="languageSwitch" href={`/business?lang=${lang}`}>{t.back}</a>
            <a className="languageSwitch" href={`/staff?lang=${ar ? 'en' : 'ar'}`}>{t.toggle}</a>
            <button type="button" className="languageSwitch buttonReset" onClick={() => logout(lang)}>{t.logout}</button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid settingsGrid">
        <div className="card"><p>{t.employees}</p><strong>{stats.total}</strong></div>
        <div className="card"><p>{t.active}</p><strong style={{ color: '#10B981' } as React.CSSProperties}>{stats.active}</strong></div>
        <div className="card"><p>{t.role}</p><strong>{stats.roles}</strong></div>
        <div className="card"><p>API</p><strong style={{ fontSize: 13 } as React.CSSProperties}>{isApiConfigured() ? t.apiReady : t.apiMissing}</strong></div>
      </section>

      {notice && (
        <div className={`notice ${notice.type}`}>{notice.text}</div>
      )}

      {/* Add staff form */}
      <section className="panel">
        <h2>{t.add}</h2>
        <p className="muted" style={{ marginBottom: 0 }}>{t.defaultPass}</p>
        <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 18 }}>
          <div>
            <FieldLabel>{t.name} *</FieldLabel>
            <input name="name" required placeholder={ar ? 'محمد أحمد' : 'Full name'} style={{ width: '100%' }} />
          </div>
          <div>
            <FieldLabel>{t.phone}</FieldLabel>
            <input name="phone" placeholder="+249..." style={{ width: '100%' }} />
          </div>
          <div>
            <FieldLabel>{t.email}</FieldLabel>
            <input name="email" type="email" placeholder="email@example.com" style={{ width: '100%' }} />
          </div>
          <div>
            <FieldLabel>{t.role}</FieldLabel>
            <select name="role" style={{ width: '100%', appearance: 'none' as const }}>
              {(Object.keys(roleLabels) as StaffRole[]).map((r) => (
                <option key={r} value={r}>{ar ? roleLabels[r].ar : roleLabels[r].en}</option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>{t.shift}</FieldLabel>
            <input name="shift" placeholder={ar ? 'صباح / مساء' : 'Morning / Evening'} style={{ width: '100%' }} />
          </div>
          <div>
            <FieldLabel>{t.internalNotes}</FieldLabel>
            <textarea name="internalNotes" placeholder={t.internalNotes} style={{ width: '100%', minHeight: 60, resize: 'vertical' as const }} />
          </div>
          <button className="primaryAction" type="submit" style={{ gridColumn: '1 / -1' }}>{t.save}</button>
        </form>
      </section>

      {/* Selected employee credentials card */}
      {selected && (
        <section className="panel">
          <h2>{t.credentials}</h2>

          {/* Profile row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
            background: `${roleColors[selected.role]}0d`,
            border: `1px solid ${roleColors[selected.role]}25`,
            borderRadius: 16, marginBottom: 16,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${roleColors[selected.role]}, ${roleColors[selected.role]}99)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 900, fontSize: 17,
              boxShadow: `0 4px 16px ${roleColors[selected.role]}40`,
            }}>
              {initials(selected.name)}
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 17, color: '#0D2137' }}>{selected.name}</div>
              <span style={{
                display: 'inline-block', marginTop: 4,
                background: `${roleColors[selected.role]}18`, color: roleColors[selected.role],
                border: `1.5px solid ${roleColors[selected.role]}30`,
                borderRadius: 999, padding: '2px 10px', fontWeight: 800, fontSize: 12,
              }}>
                {ar ? roleLabels[selected.role].ar : roleLabels[selected.role].en}
              </span>
            </div>
          </div>

          {/* Credentials grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: '#F0F6FC', borderRadius: 14, padding: '16px 20px', marginBottom: 14 }}>
            {[
              { label: t.username, value: selected.username, mono: true },
              { label: t.password, value: selected.temporaryPassword || t.hidden, mono: true },
              { label: t.workspace, value: roleLabels[selected.role].workspace, mono: false },
              { label: t.level, value: roleLabels[selected.role].level, mono: false },
            ].map(({ label, value, mono }) => (
              <div key={label}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#7A92A8', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{label}</div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#063B63', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="primaryAction" style={{ gridColumn: 'auto', flex: 1, minWidth: 140 }} onClick={() => copyLogin(selected)}>
              {t.copy}
            </button>
            <a className="languageSwitch" href={`${roleLabels[selected.role].workspace}?lang=${lang}`} style={{ flex: 1, minWidth: 120, textAlign: 'center' as const }}>
              {t.open} →
            </a>
          </div>
        </section>
      )}

      {/* Employees list */}
      <section className="panel">
        <h2>{t.employees}</h2>
        <div className="table">
          {staff.length === 0 ? (
            <div className="empty">{t.empty}</div>
          ) : (
            staff.map((item) => {
              const color = roleColors[item.role];
              const isActive = item.status === 'active';
              return (
                <div
                  key={item.id}
                  className="row"
                  style={{ cursor: 'pointer', alignItems: 'center', borderInlineStart: `3px solid ${color}` }}
                  onClick={() => setSelected(item)}
                >
                  {/* Avatar + Name */}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                      background: `linear-gradient(135deg, ${color}, ${color}99)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 900, fontSize: 13,
                      boxShadow: `0 3px 10px ${color}40`,
                    }}>
                      {initials(item.name)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800 }}>{item.name}</div>
                      <small style={{ color: '#94a3b8', fontWeight: 600 }}>{item.phone || item.email || ''}</small>
                    </div>
                  </span>

                  {/* Role badge */}
                  <span>
                    <span style={{
                      display: 'inline-block', background: `${color}18`, color,
                      border: `1.5px solid ${color}30`, borderRadius: 999,
                      padding: '3px 10px', fontWeight: 800, fontSize: 12,
                    }}>
                      {ar ? roleLabels[item.role].ar : roleLabels[item.role].en}
                    </span>
                    <br />
                    <small style={{ color: '#94a3b8', fontWeight: 600 }}>{roleLabels[item.role].level}</small>
                  </span>

                  {/* Username */}
                  <span>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, background: '#F0F6FC', padding: '2px 8px', borderRadius: 6, fontWeight: 700, color: '#063B63' }}>
                      {item.username}
                    </span>
                    <br />
                    <a
                      href={`${roleLabels[item.role].workspace}?lang=${lang}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: '#0E8FB3', fontSize: 12, fontWeight: 700, textDecoration: 'none', marginTop: 4, display: 'inline-block' }}
                    >
                      {t.open} →
                    </a>
                  </span>

                  {/* Status + Toggle */}
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: isActive ? '#DCFCE7' : '#FEE2E2',
                      color: isActive ? '#166534' : '#991B1B',
                      borderRadius: 999, padding: '3px 10px', fontWeight: 800, fontSize: 12,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#16A34A' : '#EF4444', display: 'inline-block' }} />
                      {isActive ? t.active : t.paused}
                    </span>
                    <button
                      type="button"
                      className="buttonReset"
                      style={{ fontSize: 12, fontWeight: 700, cursor: 'pointer', color: isActive ? '#DC2626' : '#16A34A', background: 'none', border: 'none', padding: 0, fontFamily: 'inherit' }}
                      onClick={(e) => { e.stopPropagation(); toggle(item); }}
                    >
                      {isActive ? t.pause : t.activate}
                    </button>
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Role task cards */}
      <section className="panel">
        <h2>{t.tasks}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginTop: 4 }}>
          {rolePlans.map((plan) => {
            const color = roleColors[plan.role];
            return (
              <article key={plan.role} style={{ position: 'relative', borderTop: `3px solid ${color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                      {roleLabels[plan.role].level}
                    </div>
                    <h3 style={{ color: '#063B63', margin: '0 0 6px', fontSize: 18 }}>
                      {ar ? roleLabels[plan.role].ar : roleLabels[plan.role].en}
                    </h3>
                    <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                      {ar ? plan.missionAr : plan.missionEn}
                    </p>
                  </div>
                  <a
                    className="primaryAction"
                    href={`${roleLabels[plan.role].workspace}?lang=${lang}`}
                    style={{ display: 'inline-flex', padding: '8px 14px', fontSize: 13, gridColumn: 'auto' }}
                  >
                    {t.open}
                  </a>
                </div>

                <div style={{ background: `${color}10`, border: `1px solid ${color}25`, borderRadius: 10, padding: '8px 12px', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color }}>{t.kpi}: </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0D2137' }}>{ar ? plan.kpiAr : plan.kpiEn}</span>
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <TaskList title={t.daily}   items={ar ? plan.dailyAr   : plan.dailyEn}   />
                  <TaskList title={t.weekly}  items={ar ? plan.weeklyAr  : plan.weeklyEn}  />
                  <TaskList title={t.limits}  items={ar ? plan.limitsAr  : plan.limitsEn}  />
                </div>

                <p className="muted" style={{ marginTop: 10, marginBottom: 0, fontSize: 12 }}>
                  <b>{t.handover}: </b>{ar ? plan.handoverAr : plan.handoverEn}
                </p>
              </article>
            );
          })}
        </div>
      </section>

    </main>
  );
}
