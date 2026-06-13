'use client';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete, isApiConfigured } from '../lib/apiClient';

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
  operations: '#0E8FB3', supervisor: '#3B82F6', support: '#8B5CF6',
  accountant: '#10B981', finance: '#059669', developer: '#F59E0B', business: '#D6A936',
};

const rolePlans: {
  role: StaffRole; missionAr: string; missionEn: string; kpiAr: string; kpiEn: string;
  handoverAr: string; handoverEn: string; dailyAr: string[]; dailyEn: string[];
  weeklyAr: string[]; weeklyEn: string[]; limitsAr: string[]; limitsEn: string[];
}[] = [
  { role: 'operations',  missionAr: 'قيادة التشغيل اليومي وتوزيع الورديات ومتابعة مؤشرات الأداء.',            missionEn: 'Lead daily operations, shifts, and performance indicators.',            kpiAr: 'تقرير يومي + زمن استجابة أقل',  kpiEn: 'Daily report + lower response time',  handoverAr: 'يستلم من المشرفين ويرفع للإدارة.',           handoverEn: 'Receives from supervisors, reports to management.',  dailyAr: ['اعتماد خطة الوردية', 'متابعة الرحلات اليومية', 'مراجعة البلاغات الحرجة', 'رفع تقرير نهاية اليوم'], dailyEn: ['Approve shift plan', 'Monitor daily rides', 'Review critical issues', 'Submit end-of-day report'], weeklyAr: ['مراجعة جودة الجوكية', 'تحليل أوقات الذروة', 'اقتراح تحسينات تشغيلية'], weeklyEn: ['Review driver quality', 'Analyze peak hours', 'Suggest improvements'], limitsAr: ['لا يعدل العقود أو النسب', 'لا يغير إعدادات النظام'], limitsEn: ['No contract editing', 'No system settings'] },
  { role: 'supervisor',  missionAr: 'متابعة الرحلات الحية والسائقين والتصعيد السريع.',                        missionEn: 'Track live rides, drivers, and fast escalation.',                       kpiAr: 'حل البلاغ العاجل فورًا',         kpiEn: 'Immediate urgent issue handling',     handoverAr: 'يستلم من الدعم ويسلم لمدير التشغيل.',          handoverEn: 'Receives from support, hands to ops manager.',       dailyAr: ['متابعة السائقين المتصلين', 'إدخال طلبات الهاتف', 'التدخل في الرحلات المتأخرة', 'تصعيد الحالات الأمنية'], dailyEn: ['Track online drivers', 'Enter phone orders', 'Handle delayed rides', 'Escalate safety cases'], weeklyAr: ['تلخيص مشاكل الوردية', 'تقييم التغطية حسب الأحياء'], weeklyEn: ['Summarize shift issues', 'Evaluate zone coverage'], limitsAr: ['لا يعتمد جوكي نهائيًا', 'لا يرى النسب والعقود'], limitsEn: ['No final driver approval', 'No contracts access'] },
  { role: 'support',     missionAr: 'استقبال العملاء والشكاوى والمفقودات وتوثيق الحلول.',                     missionEn: 'Handle customers, complaints, lost items, and resolutions.',            kpiAr: 'إغلاق الطلب خلال 24 ساعة',      kpiEn: 'Close ticket within 24 hours',        handoverAr: 'يصعد البلاغ العاجل للمشرف.',                   handoverEn: 'Escalates urgent issues to supervisor.',             dailyAr: ['استلام الشكاوى', 'تصنيف طلب الدعم', 'متابعة المفقودات', 'إغلاق البلاغ بعد الحل'], dailyEn: ['Receive complaints', 'Classify tickets', 'Follow lost items', 'Close resolved cases'], weeklyAr: ['تقرير أكثر الشكاوى تكرارًا', 'اقتراح رسائل جاهزة'], weeklyEn: ['Report repeated complaints', 'Suggest reply templates'], limitsAr: ['لا يوقف السائق إلا بتصعيد', 'لا يعدل الأسعار'], limitsEn: ['No driver suspension without escalation', 'No pricing edits'] },
  { role: 'accountant',  missionAr: 'إدارة التحصيل والمصروفات والتقارير المالية.',                             missionEn: 'Manage collections, costs, and financial reports.',                     kpiAr: 'مطابقة أسبوعية دقيقة',           kpiEn: 'Accurate weekly reconciliation',      handoverAr: 'يستلم بيانات التشغيل ويصدر تقريرًا للإدارة.',  handoverEn: 'Receives operations data, reports to management.',   dailyAr: ['مطابقة النقد والتحويلات', 'حساب الاشتراكات', 'تسجيل المصروفات', 'مراجعة المحافظ'], dailyEn: ['Reconcile cash/transfers', 'Calculate subscriptions', 'Record costs', 'Review wallets'], weeklyAr: ['إصدار تقرير مالي', 'مطابقة الاشتراكات المتأخرة'], weeklyEn: ['Issue finance report', 'Reconcile overdue subscriptions'], limitsAr: ['لا يغير النسب المقفلة', 'لا ينشئ عقدًا جديدًا'], limitsEn: ['No locked share changes', 'No new contracts'] },
  { role: 'finance',     missionAr: 'متابعة الماليات العامة والاشتراكات.',                                     missionEn: 'Track finance and subscriptions.',                                      kpiAr: 'تقرير منصرفات واضح',             kpiEn: 'Clear cost report',                   handoverAr: 'يرفع للمحاسب أو الإدارة.',                     handoverEn: 'Hands over to accountant or management.',            dailyAr: ['متابعة الاشتراكات', 'مراجعة المنصرفات', 'تجهيز ملخص مالي'], dailyEn: ['Track subscriptions', 'Review costs', 'Prepare finance summary'], weeklyAr: ['تحديث حالة الاشتراكات', 'تنبيه المنصرفات القادمة'], weeklyEn: ['Update subscription status', 'Flag upcoming costs'], limitsAr: ['لا يرى أسرار النظام', 'لا يعدل بيانات الموظفين'], limitsEn: ['No secret access', 'No staff edits'] },
  { role: 'developer',   missionAr: 'الربط التقني وإعدادات الخادم والإصدارات.',                                missionEn: 'Technical integrations, server settings, and releases.',               kpiAr: 'لا أعطال حرجة',                  kpiEn: 'No critical blockers',                handoverAr: 'يستلم البلاغات التقنية من التشغيل.',            handoverEn: 'Receives technical issues from operations.',          dailyAr: ['إدارة Firebase', 'إعدادات الخادم', 'إصلاح الأعطال'], dailyEn: ['Manage Firebase', 'Server settings', 'Fix bugs'], weeklyAr: ['تجهيز APK', 'مراجعة الأداء'], weeklyEn: ['Prepare APK', 'Review performance'], limitsAr: ['لا يغير العقود والنسب'], limitsEn: ['No contracts/shares'] },
  { role: 'business',    missionAr: 'إدارة العقود والنسب والتوسعة وكل قرارات المنظومة.',                       missionEn: 'Manage contracts, shares, expansion, and system decisions.',            kpiAr: 'قرارات موثقة بعقد',              kpiEn: 'Documented decisions',                handoverAr: 'يعتمد من التقارير المالية والتشغيلية.',         handoverEn: 'Approves from finance and operations reports.',       dailyAr: ['مراجعة التقارير', 'اعتماد القرارات', 'إدارة الموظفين'], dailyEn: ['Review reports', 'Approve decisions', 'Manage staff'], weeklyAr: ['اعتماد المدن الجديدة', 'مراجعة العقود'], weeklyEn: ['Approve new cities', 'Review contracts'], limitsAr: ['أي تغيير جوهري يستلزم توثيقًا'], limitsEn: ['Core changes require documentation'] },
];

const copy = {
  ar: {
    title: 'إدارة الموظفين', sub: 'إضافة وتعديل وحذف حسابات الموظفين مع إدارة الصلاحيات.',
    back: 'الإدارة', portal: 'البوابة', logout: 'خروج',
    add: 'إضافة موظف جديد', edit: 'تعديل بيانات الموظف', cancelEdit: 'إلغاء التعديل',
    name: 'الاسم الكامل', phone: 'رقم الهاتف', email: 'البريد الإلكتروني',
    role: 'الدور الوظيفي', shift: 'الوردية', internalNotes: 'ملاحظات داخلية',
    save: 'إنشاء الحساب', update: 'حفظ التعديلات',
    active: 'نشط', paused: 'موقوف', activate: 'تفعيل', pause: 'إيقاف',
    deleteStaff: 'حذف', confirmDelete: 'هل تريد حذف هذا الموظف نهائياً؟',
    employees: 'الموظفون', tasks: 'مهام وصلاحيات كل دور',
    copy: 'نسخ بيانات الدخول', copied: 'تم النسخ', empty: 'لا يوجد موظفون.',
    noResults: 'لا توجد نتائج للبحث.',
    denied: 'هذه الصفحة مخصصة لحساب الإدارة فقط.',
    toggle: 'English', apiReady: 'متصل', apiMissing: 'معاينة',
    saved: 'تم إنشاء الحساب بنجاح.', updated: 'تم حفظ التعديلات.', failed: 'تعذر الاتصال بالخادم.',
    deleted: 'تم حذف الموظف.', hidden: 'مخفية', credentials: 'بيانات الدخول',
    workspace: 'مساحة العمل', level: 'المستوى', open: 'فتح', username: 'اسم المستخدم', password: 'كلمة المرور',
    defaultPass: 'كلمة المرور الافتراضية: 123456 — يجب تغييرها عند أول دخول.',
    searchPlaceholder: 'بحث بالاسم أو اسم المستخدم...', filterAll: 'الكل',
    mission: 'المهمة', kpi: 'مؤشر الأداء', handover: 'التسليم', daily: 'مهام يومية',
    weekly: 'مهام أسبوعية', limits: 'حدود الصلاحية',
  },
  en: {
    title: 'Staff Management', sub: 'Add, edit, and delete staff accounts with permission management.',
    back: 'Management', portal: 'Portal', logout: 'Logout',
    add: 'Add new employee', edit: 'Edit staff member', cancelEdit: 'Cancel edit',
    name: 'Full name', phone: 'Phone', email: 'Email',
    role: 'Job role', shift: 'Shift', internalNotes: 'Internal notes (admin only)',
    save: 'Create account', update: 'Save changes',
    active: 'Active', paused: 'Paused', activate: 'Activate', pause: 'Pause',
    deleteStaff: 'Delete', confirmDelete: 'Permanently delete this staff member?',
    employees: 'Employees', tasks: 'Role tasks and permissions',
    copy: 'Copy login details', copied: 'Copied', empty: 'No employees yet.',
    noResults: 'No search results.',
    denied: 'This page is only for the Management account.',
    toggle: 'العربية', apiReady: 'Connected', apiMissing: 'Preview',
    saved: 'Account created successfully.', updated: 'Changes saved.', failed: 'Could not reach server.',
    deleted: 'Staff member deleted.', hidden: 'Hidden', credentials: 'Login credentials',
    workspace: 'Workspace', level: 'Level', open: 'Open', username: 'Username', password: 'Password',
    defaultPass: 'Default password: 123456 — must be changed on first login.',
    searchPlaceholder: 'Search by name or username...', filterAll: 'All',
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
  const [editingItem, setEditingItem] = useState<Staff | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [filterRole, setFilterRole] = useState<StaffRole | 'all'>('all');
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const t = copy[lang];
  const ar = lang === 'ar';

  useEffect(() => {
    const role = sessionStorage.getItem('jnbk_active_role') || '';
    const ok = role === 'business' || role === 'developer';
    setAllowed(ok);
    if (!ok) return;
    apiGet<Staff[]>('/api/staff', []).then(setStaff).catch(() => {
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

  const filtered = useMemo(() => staff.filter(x => {
    if (filterRole !== 'all' && x.role !== filterRole) return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      return x.name.toLowerCase().includes(q) || x.username.toLowerCase().includes(q) || (x.phone || '').includes(q);
    }
    return true;
  }), [staff, filterRole, searchQ]);

  function startEdit(item: Staff) {
    setEditingItem(item);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function cancelEdit() {
    setEditingItem(null);
    formRef.current?.reset();
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get('name') || '').trim();
    const role = String(f.get('role') || 'operations') as StaffRole;
    const shift = String(f.get('shift') || '').trim();
    const phone = String(f.get('phone') || '').trim();
    const email = String(f.get('email') || '').trim();
    const notes = String(f.get('internalNotes') || '').trim();

    if (editingItem) {
      // Update existing
      try {
        const result = await apiPatch<{ staff: Staff }>(`/api/staff/${editingItem.id}`, { name, role, phone, email, notes });
        setStaff(prev => prev.map(x => x.id === editingItem.id ? { ...x, ...result.staff } : x));
        setSelected(prev => prev?.id === editingItem.id ? { ...prev, ...result.staff } : prev);
        setNotice({ text: t.updated, type: 'success' });
      } catch {
        const updated = { ...editingItem, name, role, phone, email };
        setStaff(prev => prev.map(x => x.id === editingItem.id ? updated : x));
        setNotice({ text: t.failed, type: 'error' });
      }
      setEditingItem(null);
      e.currentTarget.reset();
      return;
    }

    // Create new
    const body = { name, role, phone, email, username: makeUsername(name, role), notes, shift, workspace: roleLabels[role].workspace };
    try {
      const result = await apiPost<{ staff: Staff; temporaryPassword: string }>('/api/staff', body);
      const item: Staff = { ...result.staff, temporaryPassword: result.temporaryPassword, internalNotes: notes, shift, workspace: roleLabels[role].workspace };
      setStaff([item, ...staff]);
      setSelected(item);
      setNotice({ text: t.saved, type: 'success' });
    } catch {
      const item: Staff = {
        id: makeId(), name, phone, email, role, status: 'active',
        username: body.username, temporaryPassword: '123456',
        internalNotes: notes, createdAt: new Date().toISOString(), shift, workspace: roleLabels[role].workspace,
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
      setStaff(prev => prev.map(x => x.id === item.id ? result.staff : x));
      if (selected?.id === item.id) setSelected(result.staff);
    } catch {
      const updated = { ...item, status: next as 'active' | 'paused' };
      setStaff(prev => prev.map(x => x.id === item.id ? updated : x));
      if (selected?.id === item.id) setSelected(updated);
    }
  }

  async function deleteStaff(item: Staff) {
    if (!window.confirm(t.confirmDelete)) return;
    try {
      await apiDelete(`/api/staff/${item.id}`);
    } catch { /* remove locally regardless */ }
    setStaff(prev => prev.filter(x => x.id !== item.id));
    if (selected?.id === item.id) setSelected(null);
    if (editingItem?.id === item.id) setEditingItem(null);
    setNotice({ text: t.deleted, type: 'success' });
  }

  async function copyLogin(item: Staff) {
    const pass = item.temporaryPassword || t.hidden;
    const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}${PORTAL_URL}` : PORTAL_URL;
    const text = `Jnbk جنبك\n${ar ? 'الاسم' : 'Name'}: ${item.name}\n${ar ? 'الدور' : 'Role'}: ${ar ? roleLabels[item.role].ar : roleLabels[item.role].en}\n${ar ? 'اسم المستخدم' : 'Username'}: ${item.username}\n${ar ? 'كلمة المرور' : 'Password'}: ${pass}\n${ar ? 'البوابة' : 'Portal'}: ${portalUrl}`;
    try { await navigator.clipboard?.writeText(text); setNotice({ text: t.copied, type: 'success' }); }
    catch { prompt(t.copy, text); }
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
        <div className="card"><p>{t.active}</p><strong>{stats.active}</strong></div>
        <div className="card"><p>{ar ? 'الأدوار' : 'Roles'}</p><strong>{stats.roles}</strong></div>
        <div className="card"><p>API</p><strong style={{ fontSize: 13 } as React.CSSProperties}>{isApiConfigured() ? t.apiReady : t.apiMissing}</strong></div>
      </section>

      {notice && <div className={`notice ${notice.type}`}>{notice.text}</div>}

      {/* Add / Edit form */}
      <section className="panel" ref={formRef as React.RefObject<HTMLElement>}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ margin: 0 }}>{editingItem ? `${t.edit}: ${editingItem.name}` : t.add}</h2>
          {editingItem && (
            <button type="button" className="languageSwitch buttonReset" onClick={cancelEdit} style={{ color: '#EF4444' }}>
              {t.cancelEdit}
            </button>
          )}
        </div>
        {!editingItem && <p className="muted" style={{ marginBottom: 0 }}>{t.defaultPass}</p>}
        <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
          <div>
            <FieldLabel>{t.name} *</FieldLabel>
            <input name="name" required defaultValue={editingItem?.name || ''} placeholder={ar ? 'محمد أحمد' : 'Full name'} style={{ width: '100%' }} key={editingItem?.id || 'new-name'} />
          </div>
          <div>
            <FieldLabel>{t.phone}</FieldLabel>
            <input name="phone" defaultValue={editingItem?.phone || ''} placeholder="+249..." style={{ width: '100%' }} key={editingItem?.id || 'new-phone'} />
          </div>
          <div>
            <FieldLabel>{t.email}</FieldLabel>
            <input name="email" type="email" defaultValue={editingItem?.email || ''} placeholder="email@example.com" style={{ width: '100%' }} key={editingItem?.id || 'new-email'} />
          </div>
          <div>
            <FieldLabel>{t.role}</FieldLabel>
            <select name="role" defaultValue={editingItem?.role || 'operations'} style={{ width: '100%', appearance: 'none' as const }} key={editingItem?.id || 'new-role'}>
              {(Object.keys(roleLabels) as StaffRole[]).map((r) => (
                <option key={r} value={r}>{ar ? roleLabels[r].ar : roleLabels[r].en}</option>
              ))}
            </select>
          </div>
          {!editingItem && (
            <div>
              <FieldLabel>{t.shift}</FieldLabel>
              <input name="shift" placeholder={ar ? 'صباح / مساء' : 'Morning / Evening'} style={{ width: '100%' }} />
            </div>
          )}
          <div style={editingItem ? {} : {}}>
            <FieldLabel>{t.internalNotes}</FieldLabel>
            <textarea name="internalNotes" defaultValue={editingItem?.internalNotes || ''} placeholder={t.internalNotes} style={{ width: '100%', minHeight: 60, resize: 'vertical' as const }} key={editingItem?.id || 'new-notes'} />
          </div>
          <button className="primaryAction" type="submit" style={{ gridColumn: '1 / -1' }}>
            {editingItem ? t.update : t.save}
          </button>
        </form>
      </section>

      {/* Selected credentials card */}
      {selected && !editingItem && (
        <section className="panel">
          <h2>{t.credentials}</h2>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
            background: `${roleColors[selected.role]}0d`, border: `1px solid ${roleColors[selected.role]}25`,
            borderRadius: 16, marginBottom: 16,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${roleColors[selected.role]}, ${roleColors[selected.role]}99)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 900, fontSize: 17, boxShadow: `0 4px 16px ${roleColors[selected.role]}40`,
            }}>
              {initials(selected.name)}
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 17, color: '#0D2137' }}>{selected.name}</div>
              <span style={{ display: 'inline-block', marginTop: 4, background: `${roleColors[selected.role]}18`, color: roleColors[selected.role], border: `1.5px solid ${roleColors[selected.role]}30`, borderRadius: 999, padding: '2px 10px', fontWeight: 800, fontSize: 12 }}>
                {ar ? roleLabels[selected.role].ar : roleLabels[selected.role].en}
              </span>
            </div>
          </div>
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
            <button type="button" className="primaryAction" style={{ gridColumn: 'auto', flex: 1, minWidth: 140 }} onClick={() => copyLogin(selected)}>{t.copy}</button>
            <a className="languageSwitch" href={`${roleLabels[selected.role].workspace}?lang=${lang}`} style={{ flex: 1, minWidth: 120, textAlign: 'center' as const }}>{t.open} →</a>
          </div>
        </section>
      )}

      {/* Employees list */}
      <section className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ margin: 0 }}>{t.employees} ({filtered.length})</h2>
        </div>

        {/* Search + filter */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder={t.searchPlaceholder}
            style={{ flex: 1, minWidth: 180, padding: '10px 14px', borderRadius: 12, border: '1.5px solid rgba(6,59,99,0.12)', fontSize: 14, fontFamily: 'inherit', fontWeight: 600, background: '#FAFCFF' }}
          />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['all', ...Object.keys(roleLabels)] as (StaffRole | 'all')[]).map(r => (
              <button
                key={r}
                type="button"
                className="buttonReset"
                onClick={() => setFilterRole(r)}
                style={{
                  padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 800, cursor: 'pointer',
                  fontFamily: 'inherit', border: '1.5px solid',
                  background: filterRole === r ? (r === 'all' ? '#063B63' : roleColors[r as StaffRole]) : 'transparent',
                  color: filterRole === r ? '#fff' : (r === 'all' ? '#063B63' : roleColors[r as StaffRole]),
                  borderColor: r === 'all' ? '#063B63' : roleColors[r as StaffRole],
                }}
              >
                {r === 'all' ? t.filterAll : (ar ? roleLabels[r as StaffRole].ar : roleLabels[r as StaffRole].en)}
              </button>
            ))}
          </div>
        </div>

        <div className="table">
          {filtered.length === 0 ? (
            <div className="empty">{searchQ || filterRole !== 'all' ? t.noResults : t.empty}</div>
          ) : (
            filtered.map((item) => {
              const color = roleColors[item.role];
              const isActive = item.status === 'active';
              return (
                <div key={item.id} className="row" style={{ alignItems: 'center', borderInlineStart: `3px solid ${color}` }}>
                  {/* Avatar + Name — click to select */}
                  <span
                    style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                    onClick={() => setSelected(item)}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                      background: `linear-gradient(135deg, ${color}, ${color}99)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 900, fontSize: 13, boxShadow: `0 3px 10px ${color}40`,
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
                    <span style={{ display: 'inline-block', background: `${color}18`, color, border: `1.5px solid ${color}30`, borderRadius: 999, padding: '3px 10px', fontWeight: 800, fontSize: 12 }}>
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
                    <a href={`${roleLabels[item.role].workspace}?lang=${lang}`} style={{ color: '#0E8FB3', fontSize: 12, fontWeight: 700, textDecoration: 'none', marginTop: 4, display: 'inline-block' }}>
                      {t.open} →
                    </a>
                  </span>

                  {/* Status + Actions */}
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: isActive ? '#DCFCE7' : '#FEE2E2', color: isActive ? '#166534' : '#991B1B', borderRadius: 999, padding: '3px 10px', fontWeight: 800, fontSize: 12 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#16A34A' : '#EF4444', display: 'inline-block' }} />
                      {isActive ? t.active : t.paused}
                    </span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button type="button" className="buttonReset" style={{ fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#0E8FB3', fontFamily: 'inherit', background: 'none', border: 'none', padding: 0 }} onClick={() => startEdit(item)}>
                        {ar ? 'تعديل' : 'Edit'}
                      </button>
                      <button type="button" className="buttonReset" style={{ fontSize: 11, fontWeight: 700, cursor: 'pointer', color: isActive ? '#DC2626' : '#16A34A', fontFamily: 'inherit', background: 'none', border: 'none', padding: 0 }} onClick={() => toggle(item)}>
                        {isActive ? t.pause : t.activate}
                      </button>
                      <button type="button" className="buttonReset" style={{ fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#9CA3AF', fontFamily: 'inherit', background: 'none', border: 'none', padding: 0 }} onClick={() => deleteStaff(item)}>
                        {t.deleteStaff}
                      </button>
                    </div>
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
                    <div style={{ fontSize: 11, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{roleLabels[plan.role].level}</div>
                    <h3 style={{ color: '#063B63', margin: '0 0 6px', fontSize: 18 }}>{ar ? roleLabels[plan.role].ar : roleLabels[plan.role].en}</h3>
                    <p className="muted" style={{ margin: 0, fontSize: 13 }}>{ar ? plan.missionAr : plan.missionEn}</p>
                  </div>
                  <a className="primaryAction" href={`${roleLabels[plan.role].workspace}?lang=${lang}`} style={{ display: 'inline-flex', padding: '8px 14px', fontSize: 13, gridColumn: 'auto' }}>{t.open}</a>
                </div>
                <div style={{ background: `${color}10`, border: `1px solid ${color}25`, borderRadius: 10, padding: '8px 12px', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color }}>{t.kpi}: </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0D2137' }}>{ar ? plan.kpiAr : plan.kpiEn}</span>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  <TaskList title={t.daily}  items={ar ? plan.dailyAr  : plan.dailyEn}  />
                  <TaskList title={t.weekly} items={ar ? plan.weeklyAr : plan.weeklyEn} />
                  <TaskList title={t.limits} items={ar ? plan.limitsAr : plan.limitsEn} />
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
