'use client';
import { useEffect, useState } from 'react';

type Lang = 'ar' | 'en';

type SubscriptionRow = {
  name: string;
  purpose: string;
  url: string;
  costAr: string;
  costEn: string;
  noteAr: string;
  noteEn: string;
};

const rows: SubscriptionRow[] = [
  { name: 'Railway', purpose: 'Backend and PostgreSQL', url: 'https://railway.com/new', costAr: 'مدفوع غالبًا', costEn: 'Usually paid', noteAr: 'تشغيل الخادم وقاعدة البيانات يحتاج خطة تشغيل عند الإنتاج', noteEn: 'Production backend and database need a running plan.' },
  { name: 'Vercel', purpose: 'Admin dashboard hosting', url: 'https://vercel.com/new', costAr: 'مجاني كبداية / مدفوع عند التوسع', costEn: 'Free to start / paid when scaling', noteAr: 'استضافة لوحة الإدارة، وقد تحتاج ترقية حسب الاستخدام والنطاقات', noteEn: 'Admin hosting may need upgrade as usage and domains grow.' },
  { name: 'Expo', purpose: 'APK preview and builds', url: 'https://expo.dev', costAr: 'مجاني كبداية / مدفوع للبناء المتقدم', costEn: 'Free to start / paid for advanced builds', noteAr: 'المعاينة مجانية غالبًا، وبناء الإصدارات المتقدم قد يحتاج خطة', noteEn: 'Preview is often free; advanced builds may require a plan.' },
  { name: 'Google Play', purpose: 'Android publishing', url: 'https://play.google.com/console', costAr: 'مدفوع مرة واحدة', costEn: 'One-time paid', noteAr: 'حساب مطور Google Play مطلوب لنشر التطبيق', noteEn: 'Google Play developer account is required for publishing.' },
  { name: 'Cloudflare', purpose: 'DNS and SSL', url: 'https://dash.cloudflare.com', costAr: 'مجاني كبداية / مدفوع للميزات المتقدمة', costEn: 'Free to start / paid advanced features', noteAr: 'DNS و SSL غالبًا متاحان مجانًا، والحماية المتقدمة مدفوعة', noteEn: 'DNS and SSL are often free; advanced security is paid.' },
  { name: 'Domain', purpose: 'Domain purchase and renewal', url: 'https://www.namecheap.com/domains/', costAr: 'مدفوع سنويًا', costEn: 'Yearly paid', noteAr: 'شراء وتجديد النطاق سنويًا', noteEn: 'Domain purchase and renewal are yearly.' },
  { name: 'Maps', purpose: 'Maps and routing', url: 'https://console.cloud.google.com/google/maps-apis', costAr: 'مدفوع حسب الاستخدام', costEn: 'Usage-based paid', noteAr: 'الخرائط والتوجيه والفوترة حسب الاستهلاك', noteEn: 'Maps and routing are usage-billed.' },
  { name: 'SMS', purpose: 'OTP and notifications', url: 'https://www.twilio.com/console', costAr: 'مدفوع حسب الرسائل', costEn: 'Paid per usage', noteAr: 'رسائل OTP والتنبيهات تُحاسب غالبًا حسب عدد الرسائل', noteEn: 'OTP and notifications are usually charged per message.' },
];

const activeAgreement = {
  id: 'JNBK-AGR-001',
  version: '1.0',
  statusAr: 'ساري ومغلق',
  statusEn: 'Active and locked',
  owner: 70,
  dev: 30,
  period: 'monthly',
  effectiveFrom: '2026-05-04',
  archiveRef: 'لا يوجد عقد سابق',
};

const archive = [
  { id: 'JNBK-AGR-DRAFT-000', version: '0.9', statusAr: 'مسودة مؤرشفة', statusEn: 'Archived draft', owner: 70, dev: 30, date: '2026-05-03', reasonAr: 'تحويل المسودة إلى عقد ساري مغلق', reasonEn: 'Converted draft into locked active agreement' },
];

const copy = {
  ar: {
    title: 'قسم النسب والاتفاقات المغلقة',
    sub: 'النسب والاتفاقات لا تعدل مباشرة. أي تغيير يتم بعقد جديد، مع أرشفة العقد القديم والاحتفاظ بسجل النسخ.',
    denied: 'هذه الصفحة مخصصة لحساب الإدارة والاتفاقات فقط. سجّل الدخول من البوابة الموحدة.',
    portal: 'البوابة', staff: 'إدارة الموظفين', finance: 'المالية', operations: 'التشغيل', logout: 'الخروج والعودة للبوابة', toggle: 'English',
    activeContract: 'رقم العقد الساري', status: 'حالة العقد', ownerShare: 'نسبة المالك', devShare: 'نسبة المطور/المشغل',
    noEditRule: 'قاعدة عدم التعديل', noEditText: 'تم قفل النسب والاتفاقات: لا توجد حقول تعديل للنسب. أي تغيير لاحق يتطلب إنشاء عقد جديد برقم إصدار جديد، ثم أرشفة العقد الساري السابق تلقائيًا.',
    changeProcess: 'مسار التغيير', writtenRequest: 'طلب تعديل مكتوب', newVersion: 'عقد جديد بإصدار جديد', archiveOld: 'أرشفة القديم',
    editableHere: 'المسموح تعديله هنا', revenueOnly: 'الإيراد التقديري فقط للحساب', sharesLocked: 'النسب غير قابلة للتعديل', readOnly: 'قراءة فقط',
    calculator: 'الحاسبة التوضيحية المقفلة', calcText: 'يمكن إدخال الإيراد فقط لحساب الحصص وفق العقد الساري. النسب لا تظهر كحقول إدخال ولا يمكن تعديلها من اللوحة.',
    revenue: 'الإيراد التقديري', monthly: 'شهري', yearly: 'سنوي', ownerAmount: 'حصة صاحب التطبيق', devAmount: 'حصة المطور/المشغل', yearlyEstimate: 'سنوي تقديري', cycle: 'الدورة',
    archive: 'أرشيف العقود', agreementSummary: 'صيغة اتفاق مغلقة', agreementText: 'يتفق صاحب التطبيق والمطور أو المشغل على تطوير وتشغيل منصة Jnbk جنبك. يتم توزيع صافي الأرباح بعد خصم تكاليف التشغيل والاشتراكات حسب العقد الساري أعلاه. لا يجوز تعديل النسب أو الالتزامات من اللوحة. كل تعديل لا يكون نافذًا إلا بعقد جديد مكتوب ومؤرخ وموقع، مع أرشفة العقد السابق وإغلاقه للرجوع إليه.',
    links: 'روابط واشتراكات مطلوبة', review: 'راجع', version: 'الإصدار', date: 'التاريخ', reason: 'السبب', cost: 'التكلفة', purpose: 'الغرض', note: 'ملاحظة',
  },
  en: {
    title: 'Locked agreements and profit shares',
    sub: 'Profit shares and agreements are not directly editable. Any change requires a new contract, while the old contract is archived with version history.',
    denied: 'This page is only for the Business account. Log in from the unified portal.',
    portal: 'Portal', staff: 'Staff', finance: 'Finance', operations: 'Operations', logout: 'Logout and return to portal', toggle: 'العربية',
    activeContract: 'Active contract', status: 'Contract status', ownerShare: 'Owner share', devShare: 'Developer/operator share',
    noEditRule: 'No direct editing rule', noEditText: 'Shares and agreements are locked: there are no editable percentage fields. Any future change requires a new contract version, then archiving the previous active contract.',
    changeProcess: 'Change process', writtenRequest: 'Written change request', newVersion: 'New versioned contract', archiveOld: 'Archive old contract',
    editableHere: 'Editable here', revenueOnly: 'Estimated revenue only for calculation', sharesLocked: 'Shares are locked', readOnly: 'Read-only',
    calculator: 'Locked illustrative calculator', calcText: 'Only revenue can be entered to calculate shares under the active contract. Percentages are not input fields and cannot be edited from the dashboard.',
    revenue: 'Estimated revenue', monthly: 'Monthly', yearly: 'Yearly', ownerAmount: 'Owner share', devAmount: 'Developer/operator share', yearlyEstimate: 'Yearly estimate', cycle: 'Cycle',
    archive: 'Contract archive', agreementSummary: 'Locked agreement summary', agreementText: 'The owner and developer/operator agree to develop and operate Jnbk. Net profit after operating costs is split according to the active contract above. Shares and obligations cannot be edited from the dashboard. Any change is effective only through a new dated and signed written contract, with the previous contract archived and locked for reference.',
    links: 'Required links and subscriptions', review: 'Review', version: 'Version', date: 'Date', reason: 'Reason', cost: 'Cost', purpose: 'Purpose', note: 'Note',
  },
};

function logout(lang: Lang) {
  sessionStorage.clear();
  window.location.href = `/portal?lang=${lang}`;
}

function money(value: number) {
  return Math.round(value || 0).toLocaleString('en');
}

export default function Business() {
  const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
  const initial = (params.get('lang') === 'en' ? 'en' : 'ar') as Lang;
  const [lang, setLang] = useState<Lang>(initial);
  const [allowed, setAllowed] = useState(false);
  const [rev, setRev] = useState(1000000);
  const [period, setPeriod] = useState(activeAgreement.period);
  const t = copy[lang];
  const ar = lang === 'ar';

  useEffect(() => {
    setAllowed(sessionStorage.getItem('jnbk_business_auth') === 'true' && sessionStorage.getItem('jnbk_active_role') === 'business');
  }, []);

  const base = period === 'yearly' ? rev * 12 : rev;
  const ownerShare = Math.round(base * activeAgreement.owner / 100);
  const devShare = Math.round(base * activeAgreement.dev / 100);

  if (!allowed) {
    return (
      <main dir={ar ? 'rtl' : 'ltr'} style={{ textAlign: ar ? 'right' : 'left' }}>
        <section className="hero">
          <div className="heroTop">
            <div>
              <p className="kicker">Jnbk جنبك</p>
              <h1>{ar ? 'الإدارة والاتفاقات' : 'Business and agreements'}</h1>
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
          <div className="adminHeroActions">
            <a className="languageSwitch" href={`/staff?lang=${lang}`}>{t.staff}</a>
            <a className="languageSwitch" href={`/finance?lang=${lang}`}>{t.finance}</a>
            <a className="languageSwitch" href={`/operations?lang=${lang}`}>{t.operations}</a>
            <button className="languageSwitch buttonReset" onClick={() => logout(lang)}>{t.logout}</button>
            <button className="languageSwitch buttonReset" onClick={() => setLang(ar ? 'en' : 'ar')}>{t.toggle}</button>
          </div>
        </div>
      </section>

      <section className="adminStatGrid">
        <div className="card"><p>{t.activeContract}</p><strong>{activeAgreement.id}</strong></div>
        <div className="card"><p>{t.status}</p><strong>{ar ? activeAgreement.statusAr : activeAgreement.statusEn}</strong></div>
        <div className="card"><p>{t.ownerShare}</p><strong>{activeAgreement.owner}%</strong></div>
        <div className="card"><p>{t.devShare}</p><strong>{activeAgreement.dev}%</strong></div>
      </section>

      <section className="panel">
        <div className="adminSectionHeader" style={{ marginTop: 0 }}><h2>{t.noEditRule}</h2><span className="adminBadge adminBadgeSuccess">LOCKED</span></div>
        <div className="notice success">{t.noEditText}</div>
        <div className="financeList" style={{ marginTop: 12 }}>
          <div className="financeCard"><strong>{t.changeProcess}</strong><span className="adminBadge adminBadgeWarn">{t.writtenRequest}</span><span className="adminBadge adminBadgeMuted">{t.newVersion}</span><span className="adminBadge adminBadgeSuccess">{t.archiveOld}</span></div>
          <div className="financeCard"><strong>{t.editableHere}</strong><span className="adminBadge adminBadgeMuted">{t.revenueOnly}</span><span className="adminBadge adminBadgeDanger">{t.sharesLocked}</span><span className="adminBadge adminBadgeSuccess">{t.readOnly}</span></div>
        </div>
      </section>

      <section className="panel">
        <div className="adminSectionHeader" style={{ marginTop: 0 }}><div><h2>{t.calculator}</h2><p className="muted" style={{ margin: 0 }}>{t.calcText}</p></div></div>
        <div className="financeControls">
          <label className="label">{t.revenue}<input className="input" type="number" value={rev} onChange={e => setRev(Number(e.target.value || 0))} /></label>
          <label className="label">{t.cycle}<select className="input" value={period} onChange={e => setPeriod(e.target.value)}><option value="monthly">{t.monthly}</option><option value="yearly">{t.yearly}</option></select></label>
          <label className="label">{t.ownerShare}<input className="input" readOnly value={`${activeAgreement.owner}%`} title={ar ? 'مقفلة بالعقد' : 'Locked by contract'} /></label>
        </div>
        <section className="adminStatGrid" style={{ marginTop: 14 }}>
          <div className="card"><p>{t.ownerAmount}</p><strong>{money(ownerShare)}</strong></div>
          <div className="card"><p>{t.devAmount}</p><strong>{money(devShare)}</strong></div>
          <div className="card"><p>{t.yearlyEstimate}</p><strong>{money(rev * 12)}</strong></div>
          <div className="card"><p>{t.cycle}</p><strong>{period}</strong></div>
        </section>
      </section>

      <section className="panel">
        <div className="adminSectionHeader" style={{ marginTop: 0 }}><h2>{t.archive}</h2></div>
        <div className="financeList">
          {archive.map(item => (
            <div className="financeCard" key={item.id}>
              <strong>{item.id}</strong>
              <span className="adminBadge adminBadgeMuted">{t.version} {item.version}</span>
              <span className="adminBadge adminBadgeWarn">{ar ? item.statusAr : item.statusEn}</span>
              <span className="adminInfoMuted">{t.date}: {item.date}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="adminSectionHeader" style={{ marginTop: 0 }}><h2>{t.agreementSummary}</h2></div>
        <p className="muted">{t.agreementText}</p>
        <div className="financeList">
          {['Ownership and responsibilities', 'Operating costs and subscriptions', 'Locked profit split and payment cycle', 'Credentials and data confidentiality', 'New contract required for any amendment', 'Old contract archived before new version becomes active'].map((item, index) => (
            <div className="financeCard" key={item}><span className="adminBadge adminBadgeMuted">{index + 1}</span><strong>{item}</strong><span></span><span></span></div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="adminSectionHeader" style={{ marginTop: 0 }}><h2>{t.links}</h2></div>
        <div className="financeList">
          {rows.map(r => (
            <div className="financeCard" key={r.name}>
              <strong>{r.name}</strong>
              <span className="adminBadge adminBadgeMuted">{r.purpose}</span>
              <span><b>{ar ? r.costAr : r.costEn}</b><span className="adminInfoMuted">{ar ? r.noteAr : r.noteEn}</span></span>
              <a className="adminMiniButton adminMiniButtonSuccess" style={{ textDecoration: 'none', textAlign: 'center' }} href={r.url} target="_blank" rel="noreferrer">{t.review}</a>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
