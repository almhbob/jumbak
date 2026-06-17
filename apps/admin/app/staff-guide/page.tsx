'use client';
import { useEffect, useState } from 'react';

type Lang = 'ar' | 'en';
type StaffRole = 'operations' | 'supervisor' | 'support' | 'accountant' | 'finance' | 'developer' | 'business';

const roleGuides: Record<StaffRole, {
  titleAr: string; titleEn: string; route: string; level: string; color: string;
  summaryAr: string; summaryEn: string;
  dailyAr: string[]; dailyEn: string[];
  allowedAr: string[]; allowedEn: string[];
  blockedAr: string[]; blockedEn: string[];
}> = {
  operations: {
    titleAr: 'مدير التشغيل', titleEn: 'Operations Manager', route: '/operations', level: 'تشغيل رئيسي', color: '#0E8FB3',
    summaryAr: 'يدير الرحلات اليومية، السائقين، الدعم، ومؤشرات التشغيل.',
    summaryEn: 'Manages daily rides, drivers, support, and operations indicators.',
    dailyAr: ['متابعة الرحلات النشطة', 'متابعة توفر الجوكية', 'تصعيد البلاغات الحرجة', 'مراجعة طلبات الجوكية عند الحاجة'],
    dailyEn: ['Monitor active rides', 'Track driver availability', 'Escalate critical issues', 'Review driver applications when needed'],
    allowedAr: ['لوحة التشغيل', 'مراجعة طلبات الجوكية', 'متابعة الدعم', 'متابعة السائقين'],
    allowedEn: ['Operations dashboard', 'Driver application review', 'Support follow-up', 'Driver monitoring'],
    blockedAr: ['لا يعدل العقود والنسب', 'لا يدير حسابات الموظفين', 'لا يغير إعدادات الخادم'],
    blockedEn: ['No contracts/shares editing', 'No staff management', 'No server settings'],
  },
  supervisor: {
    titleAr: 'مشرف الوردية', titleEn: 'Shift Supervisor', route: '/operations', level: 'تشغيل ميداني', color: '#3B82F6',
    summaryAr: 'يتابع الوردية والطلبات الحية ويتدخل سريعًا عند التعطيل.',
    summaryEn: 'Tracks live shift activity and responds to blockers quickly.',
    dailyAr: ['متابعة الجوكية المتصلين', 'متابعة الطلبات المتأخرة', 'التدخل في الحالات العاجلة', 'رفع تقرير للعمليات'],
    dailyEn: ['Track online drivers', 'Watch delayed requests', 'Handle urgent cases', 'Report to operations'],
    allowedAr: ['لوحة التشغيل', 'مراجعة طلبات الجوكية', 'إغلاق بلاغات التشغيل'],
    allowedEn: ['Operations dashboard', 'Driver application review', 'Close operational tickets'],
    blockedAr: ['لا يرى صفحة الموظفين', 'لا يعدل العقود', 'لا يغير إعدادات النظام'],
    blockedEn: ['No staff page', 'No contracts editing', 'No system settings'],
  },
  support: {
    titleAr: 'مسؤول العملاء', titleEn: 'Customer Support', route: '/operations', level: 'دعم العملاء', color: '#8B5CF6',
    summaryAr: 'يركز على الشكاوى والمفقودات وطلبات الهاتف ولا يعتمد الجوكية.',
    summaryEn: 'Handles complaints, lost items, and phone orders. Cannot approve drivers.',
    dailyAr: ['استقبال الشكاوى', 'تصنيف البلاغات', 'متابعة المفقودات', 'تصعيد الحالات للمشرف'],
    dailyEn: ['Receive complaints', 'Classify tickets', 'Follow lost items', 'Escalate cases to supervisor'],
    allowedAr: ['لوحة التشغيل للدعم', 'متابعة البلاغات', 'إغلاق البلاغات بعد الحل'],
    allowedEn: ['Support operations view', 'Ticket follow-up', 'Close resolved tickets'],
    blockedAr: ['لا يعتمد الجوكية', 'لا يعدل الأسعار', 'لا يرى المالية أو العقود'],
    blockedEn: ['No driver approval', 'No pricing edits', 'No finance/contracts access'],
  },
  accountant: {
    titleAr: 'المحاسب', titleEn: 'Accountant', route: '/finance', level: 'مالية', color: '#10B981',
    summaryAr: 'يدير المحافظ والتحصيل والمصروفات وطلبات السحب.',
    summaryEn: 'Manages wallets, collections, expenses, and withdrawal requests.',
    dailyAr: ['مراجعة طلبات السحب', 'مطابقة التحصيل', 'تسجيل المصروفات', 'إعداد تقرير مالي'],
    dailyEn: ['Review withdrawals', 'Reconcile collections', 'Record costs', 'Prepare finance report'],
    allowedAr: ['صفحة المالية', 'طلبات السحب', 'التحصيل والمصروفات'],
    allowedEn: ['Finance page', 'Withdrawals', 'Collections and costs'],
    blockedAr: ['لا يعدل العقود والنسب', 'لا يعتمد الجوكية', 'لا يغير إعدادات الخادم'],
    blockedEn: ['No contracts/shares editing', 'No driver approval', 'No server settings'],
  },
  finance: {
    titleAr: 'المالية', titleEn: 'Finance', route: '/finance', level: 'متابعة مالية', color: '#059669',
    summaryAr: 'يتابع الاشتراكات والمصروفات والتقارير المالية العامة.',
    summaryEn: 'Tracks subscriptions, expenses, and finance summaries.',
    dailyAr: ['متابعة الاشتراكات', 'مراجعة المصروفات', 'تجهيز ملخص مالي'],
    dailyEn: ['Track subscriptions', 'Review expenses', 'Prepare finance summary'],
    allowedAr: ['صفحة المالية', 'التقارير المالية', 'حالة الاشتراكات'],
    allowedEn: ['Finance page', 'Finance reports', 'Subscription status'],
    blockedAr: ['لا يدير الموظفين', 'لا يعتمد الجوكية', 'لا يغير إعدادات النظام'],
    blockedEn: ['No staff management', 'No driver approval', 'No system settings'],
  },
  developer: {
    titleAr: 'المطور', titleEn: 'Developer', route: '/settings', level: 'تقني', color: '#F59E0B',
    summaryAr: 'يدير الربط التقني، الخادم، الإعدادات، والإصدارات.',
    summaryEn: 'Manages integrations, backend, settings, and releases.',
    dailyAr: ['فحص الخادم', 'إصلاح الأعطال', 'ضبط المتغيرات', 'إعداد الإصدارات'],
    dailyEn: ['Check backend', 'Fix bugs', 'Set environment values', 'Prepare releases'],
    allowedAr: ['الإعدادات', 'مراجعة طلبات الجوكية تقنيًا', 'إدارة الربط'],
    allowedEn: ['Settings', 'Technical driver review', 'Integration management'],
    blockedAr: ['لا يغير العقود والنسب إلا بإذن الإدارة', 'لا يستبدل قرارات الإدارة'],
    blockedEn: ['No contract/share changes without management', 'Does not override management decisions'],
  },
  business: {
    titleAr: 'الإدارة', titleEn: 'Management', route: '/business', level: 'إدارة عليا', color: '#D6A936',
    summaryAr: 'يدير القرارات، العقود، النسب، الموظفين، والمدن.',
    summaryEn: 'Manages decisions, contracts, shares, staff, and cities.',
    dailyAr: ['مراجعة التقارير', 'اعتماد القرارات', 'إدارة الموظفين', 'متابعة التوسع'],
    dailyEn: ['Review reports', 'Approve decisions', 'Manage staff', 'Track expansion'],
    allowedAr: ['الإدارة', 'إدارة الموظفين', 'المالية', 'الإعدادات العامة', 'مراجعة طلبات الجوكية'],
    allowedEn: ['Business', 'Staff management', 'Finance', 'General settings', 'Driver application review'],
    blockedAr: ['أي تغيير جوهري يجب توثيقه', 'النسب لا تتغير إلا بعقد جديد'],
    blockedEn: ['Core changes must be documented', 'Shares change only through a new contract'],
  },
};

const copy = {
  ar: {
    title: 'دليل مهام وصلاحيات الموظفين',
    sub: 'صفحة مبسطة توضح لكل موظف أين يدخل، ماذا يفعل يوميًا، وما هي حدود صلاحياته.',
    portal: 'بوابة الدخول', staff: 'إدارة الموظفين', business: 'الإدارة', drivers: 'طلبات الجوكية', toggle: 'English',
    route: 'صفحة العمل', daily: 'المهام اليومية', allowed: 'مسموح له', blocked: 'غير مسموح', open: 'فتح الصفحة',
    driverNote: 'طلبات الجوكية موجودة في صفحة مراجعة ملفات الجوكية /drivers، ومسموحة للإدارة ومدير التشغيل والمشرف والمطور فقط.',
  },
  en: {
    title: 'Staff Roles and Permissions Guide',
    sub: 'A simple page showing each employee where to work, what to do daily, and permission boundaries.',
    portal: 'Portal', staff: 'Staff', business: 'Business', drivers: 'Driver applications', toggle: 'العربية',
    route: 'Workspace', daily: 'Daily tasks', allowed: 'Allowed', blocked: 'Not allowed', open: 'Open page',
    driverNote: 'Driver applications are in /drivers, allowed only for management, operations manager, supervisor, and developer.',
  },
};

function logout(lang: Lang) { sessionStorage.clear(); window.location.href = `/portal?lang=${lang}`; }

export default function StaffGuide() {
  const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
  const lang: Lang = params.get('lang') === 'en' ? 'en' : 'ar';
  const ar = lang === 'ar';
  const t = copy[lang];
  const roles = Object.keys(roleGuides) as StaffRole[];

  useEffect(() => {
    const role = sessionStorage.getItem('jnbk_active_role') || '';
    if (!['business', 'developer', 'operations', 'supervisor'].includes(role)) {
      window.location.href = `/portal?lang=${lang}`;
    }
  }, [lang]);

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
            <a className="languageSwitch" href={`/staff?lang=${lang}`}>{t.staff}</a>
            <a className="languageSwitch" href={`/business?lang=${lang}`}>{t.business}</a>
            <a className="languageSwitch" href={`/drivers?lang=${lang}`}>{t.drivers}</a>
            <a className="languageSwitch" href={`/staff-guide?lang=${ar ? 'en' : 'ar'}`}>{t.toggle}</a>
            <button className="languageSwitch buttonReset" onClick={() => logout(lang)}>{t.portal}</button>
          </div>
        </div>
      </section>

      <div className="notice success" style={{ marginBottom: 14 }}>{t.driverNote}</div>

      <section className="financeList">
        {roles.map((role) => {
          const item = roleGuides[role];
          return (
            <article className="panel" key={role} style={{ borderInlineStart: `5px solid ${item.color}` }}>
              <div className="adminSectionHeader" style={{ marginTop: 0 }}>
                <div>
                  <span className="adminBadge adminBadgeMuted">{item.level}</span>
                  <h2 style={{ marginTop: 8 }}>{ar ? item.titleAr : item.titleEn}</h2>
                  <p className="muted" style={{ margin: 0 }}>{ar ? item.summaryAr : item.summaryEn}</p>
                </div>
                <a className="adminMiniButton adminMiniButtonSuccess" style={{ textDecoration: 'none' }} href={`${item.route}?lang=${lang}`}>{t.open}</a>
              </div>

              <section className="adminStatGrid" style={{ marginTop: 14 }}>
                <div className="adminInfoBlock"><strong>{t.route}</strong><span className="adminInfoLine">{item.route}</span></div>
                <div className="adminInfoBlock"><strong>{t.daily}</strong>{(ar ? item.dailyAr : item.dailyEn).map((x) => <span key={x} className="adminInfoMuted">• {x}</span>)}</div>
                <div className="adminInfoBlock"><strong>{t.allowed}</strong>{(ar ? item.allowedAr : item.allowedEn).map((x) => <span key={x} className="adminInfoMuted">✓ {x}</span>)}</div>
                <div className="adminInfoBlock"><strong>{t.blocked}</strong>{(ar ? item.blockedAr : item.blockedEn).map((x) => <span key={x} className="adminInfoMuted">× {x}</span>)}</div>
              </section>
            </article>
          );
        })}
      </section>
    </main>
  );
}
