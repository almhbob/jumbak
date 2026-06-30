'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPatch } from '../lib/apiClient';

type Lang = 'ar' | 'en';

type Settings = {
  dailyRejectionLimit: number;
  suspensionHoursFirst: number;
  suspensionHoursDriverRepeat: number;
  walletDeductionSDG: number;
  dailyCancellationLimit: number;
  suspensionHoursPassengerFirst: number;
  suspensionHoursPassengerRepeat: number;
  offerTimeoutSeconds: number;
};

type FieldMeta = {
  key: keyof Settings;
  labelAr: string;
  labelEn: string;
  hintAr: string;
  hintEn: string;
  unit: string;
  min: number;
  max: number;
};

const FIELDS: FieldMeta[] = [
  {
    key: 'dailyRejectionLimit',
    labelAr: 'حد الرفض اليومي للسائق',
    labelEn: 'Driver daily rejection limit',
    hintAr: 'عدد مرات رفض الطلب المسموح بها قبل التعليق',
    hintEn: 'Number of ride rejections allowed before suspension',
    unit: 'مرة', min: 1, max: 20,
  },
  {
    key: 'suspensionHoursFirst',
    labelAr: 'مدة التعليق الأول (سائق)',
    labelEn: 'First suspension duration (driver)',
    hintAr: 'مدة التعليق عند المخالفة الأولى للسائق',
    hintEn: 'Suspension duration for first driver violation',
    unit: 'ساعة', min: 1, max: 168,
  },
  {
    key: 'suspensionHoursDriverRepeat',
    labelAr: 'مدة التعليق المتكرر (سائق)',
    labelEn: 'Repeat suspension duration (driver)',
    hintAr: 'مدة التعليق عند تكرار المخالفة + يُضاف خصم من المحفظة',
    hintEn: 'Suspension for repeated violations + wallet deduction applied',
    unit: 'ساعة', min: 1, max: 168,
  },
  {
    key: 'walletDeductionSDG',
    labelAr: 'مبلغ الخصم من المحفظة (مخالفة متكررة)',
    labelEn: 'Wallet deduction on repeat violation',
    hintAr: 'المبلغ المخصوم من محفظة السائق عند تكرار المخالفة',
    hintEn: 'Amount deducted from driver wallet on repeated violations',
    unit: 'SDG', min: 0, max: 5000,
  },
  {
    key: 'dailyCancellationLimit',
    labelAr: 'حد الإلغاء اليومي للراكب',
    labelEn: 'Passenger daily cancellation limit',
    hintAr: 'عدد مرات إلغاء الرحلة المسموح بها للراكب قبل التعليق',
    hintEn: 'Number of cancellations allowed before passenger suspension',
    unit: 'مرة', min: 1, max: 20,
  },
  {
    key: 'suspensionHoursPassengerFirst',
    labelAr: 'مدة التعليق الأول (راكب)',
    labelEn: 'First suspension duration (passenger)',
    hintAr: 'مدة التعليق عند المخالفة الأولى للراكب',
    hintEn: 'Suspension duration for first passenger violation',
    unit: 'ساعة', min: 1, max: 168,
  },
  {
    key: 'suspensionHoursPassengerRepeat',
    labelAr: 'مدة التعليق المتكرر (راكب)',
    labelEn: 'Repeat suspension duration (passenger)',
    hintAr: 'مدة التعليق عند تكرار الإلغاء خلال 7 أيام',
    hintEn: 'Suspension for repeated cancellations within 7 days',
    unit: 'ساعة', min: 1, max: 336,
  },
  {
    key: 'offerTimeoutSeconds',
    labelAr: 'مهلة قبول الطلب (سائق)',
    labelEn: 'Offer acceptance timeout',
    hintAr: 'الوقت المتاح للسائق للرد على طلب الرحلة قبل انتهائه تلقائياً',
    hintEn: 'Time window for driver to accept before auto-expiry',
    unit: 'ثانية', min: 10, max: 300,
  },
];

const DEFAULT_SETTINGS: Settings = {
  dailyRejectionLimit: 2,
  suspensionHoursFirst: 12,
  suspensionHoursDriverRepeat: 24,
  walletDeductionSDG: 50,
  dailyCancellationLimit: 2,
  suspensionHoursPassengerFirst: 12,
  suspensionHoursPassengerRepeat: 48,
  offerTimeoutSeconds: 60,
};

type Status = { type: 'idle' | 'loading' | 'success' | 'error'; message: string };

export default function PenaltiesPage() {
  const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
  const lang: Lang = params.get('lang') === 'en' ? 'en' : 'ar';
  const ar = lang === 'ar';

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [draft, setDraft] = useState<Settings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<Status>({ type: 'idle', message: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const role = sessionStorage.getItem('jnbk_staff_role');
    if (!['developer', 'supervisor', 'operations'].includes(role || '')) {
      window.location.href = `/portal?lang=${lang}`;
      return;
    }
    apiGet<{ settings: Settings }>('/api/admin/penalty-settings', { settings: DEFAULT_SETTINGS })
      .then((data) => {
        setSettings(data.settings);
        setDraft(data.settings);
      })
      .finally(() => setLoading(false));
  }, []);

  function change(key: keyof Settings, raw: string) {
    const n = Number(raw);
    if (!Number.isNaN(n)) setDraft((prev) => ({ ...prev, [key]: n }));
  }

  async function save() {
    setStatus({ type: 'loading', message: '' });
    try {
      const res = await apiPatch<{ settings: Settings }>('/api/admin/penalty-settings', draft);
      setSettings(res.settings);
      setDraft(res.settings);
      setStatus({ type: 'success', message: ar ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully' });
    } catch (e) {
      setStatus({ type: 'error', message: ar ? `فشل الحفظ: ${(e as Error).message}` : `Save failed: ${(e as Error).message}` });
    }
  }

  function reset(key: keyof Settings) {
    setDraft((prev) => ({ ...prev, [key]: DEFAULT_SETTINGS[key] }));
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

  return (
    <main dir={ar ? 'rtl' : 'ltr'} style={{ textAlign: ar ? 'right' : 'left' }}>
      <section className="hero">
        <div className="heroTop">
          <div>
            <p className="kicker">Jnbk جنبك</p>
            <h1>{ar ? 'إعدادات العقوبات والتوزيع' : 'Penalties & Dispatch Settings'}</h1>
            <p className="heroSub">
              {ar
                ? 'تحكم في حدود الرفض والإلغاء ومدد التعليق وخصومات المحفظة. التغييرات تُطبَّق فوراً دون إعادة تشغيل.'
                : 'Control rejection/cancellation limits, suspension durations, and wallet deductions. Changes apply immediately without a restart.'}
            </p>
          </div>
          <div className="topActions">
            <a className="languageSwitch" href={`/penalties?lang=${lang === 'ar' ? 'en' : 'ar'}`}>
              {ar ? 'English' : 'العربية'}
            </a>
            <a className="languageSwitch" href={`/?lang=${lang}`}>{ar ? 'الرئيسية' : 'Home'}</a>
          </div>
        </div>
      </section>

      {status.type !== 'idle' && (
        <section className="panel" style={{ paddingTop: 12, paddingBottom: 12 }}>
          <p
            className={status.type === 'success' ? 'successNote' : status.type === 'error' ? 'errorNote' : 'muted'}
            style={{ margin: 0 }}
          >
            {status.type === 'loading' ? (ar ? 'جاري الحفظ...' : 'Saving...') : status.message}
          </p>
        </section>
      )}

      {loading ? (
        <section className="panel">
          <p className="muted">{ar ? 'جاري التحميل...' : 'Loading...'}</p>
        </section>
      ) : (
        <>
          {/* Driver section */}
          <section className="panel">
            <h2>{ar ? 'قواعد السائق' : 'Driver rules'}</h2>
            <p className="muted" style={{ marginBottom: 24 }}>
              {ar
                ? 'تنطبق على السائقين الذين يرفضون الطلبات أو يخالفون متكرراً.'
                : 'Apply to drivers who reject requests or repeatedly violate policy.'}
            </p>
            <div className="formGrid">
              {FIELDS.filter((f) => ['dailyRejectionLimit', 'suspensionHoursFirst', 'suspensionHoursDriverRepeat', 'walletDeductionSDG'].includes(f.key)).map((f) => (
                <SettingField
                  key={f.key}
                  meta={f}
                  value={draft[f.key]}
                  original={settings[f.key]}
                  defaultVal={DEFAULT_SETTINGS[f.key]}
                  lang={lang}
                  onChange={(v) => change(f.key, v)}
                  onReset={() => reset(f.key)}
                />
              ))}
            </div>
          </section>

          {/* Passenger section */}
          <section className="panel">
            <h2>{ar ? 'قواعد الراكب' : 'Passenger rules'}</h2>
            <p className="muted" style={{ marginBottom: 24 }}>
              {ar
                ? 'تنطبق على الركاب الذين يلغون الرحلات بشكل متكرر.'
                : 'Apply to passengers who repeatedly cancel rides.'}
            </p>
            <div className="formGrid">
              {FIELDS.filter((f) => ['dailyCancellationLimit', 'suspensionHoursPassengerFirst', 'suspensionHoursPassengerRepeat'].includes(f.key)).map((f) => (
                <SettingField
                  key={f.key}
                  meta={f}
                  value={draft[f.key]}
                  original={settings[f.key]}
                  defaultVal={DEFAULT_SETTINGS[f.key]}
                  lang={lang}
                  onChange={(v) => change(f.key, v)}
                  onReset={() => reset(f.key)}
                />
              ))}
            </div>
          </section>

          {/* Dispatch section */}
          <section className="panel">
            <h2>{ar ? 'إعدادات التوزيع' : 'Dispatch settings'}</h2>
            <p className="muted" style={{ marginBottom: 24 }}>
              {ar
                ? 'المهلة الزمنية للسائق للرد على عرض الرحلة قبل انتهائه تلقائياً.'
                : 'Time window for the driver to respond to a ride offer before it auto-expires.'}
            </p>
            <div className="formGrid">
              {FIELDS.filter((f) => f.key === 'offerTimeoutSeconds').map((f) => (
                <SettingField
                  key={f.key}
                  meta={f}
                  value={draft[f.key]}
                  original={settings[f.key]}
                  defaultVal={DEFAULT_SETTINGS[f.key]}
                  lang={lang}
                  onChange={(v) => change(f.key, v)}
                  onReset={() => reset(f.key)}
                />
              ))}
            </div>
          </section>

          {/* Save bar */}
          <section className="panel" style={{ paddingTop: 16, paddingBottom: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                className="primaryAction"
                onClick={save}
                disabled={!dirty || status.type === 'loading'}
                style={{ opacity: dirty ? 1 : 0.4 }}
              >
                {ar ? 'حفظ التغييرات' : 'Save changes'}
              </button>
              {dirty && (
                <button
                  className="secondaryAction"
                  onClick={() => setDraft(settings)}
                  style={{ background: 'transparent', color: 'var(--muted)' }}
                >
                  {ar ? 'تراجع' : 'Cancel'}
                </button>
              )}
              {!dirty && (
                <span className="muted" style={{ fontSize: 13 }}>
                  {ar ? 'لا توجد تغييرات غير محفوظة' : 'No unsaved changes'}
                </span>
              )}
            </div>
          </section>

          {/* Legend */}
          <section className="panel" style={{ background: '#F8FAFC' }}>
            <h2>{ar ? 'كيف تعمل العقوبات' : 'How penalties work'}</h2>
            <div style={{ display: 'grid', gap: 12, marginTop: 8 }}>
              {(ar ? FLOW_AR : FLOW_EN).map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 20, lineHeight: 1.4 }}>{step.icon}</span>
                  <div>
                    <strong style={{ fontSize: 14 }}>{step.title}</strong>
                    <p className="muted" style={{ margin: '2px 0 0', fontSize: 13 }}>{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function SettingField({
  meta, value, original, defaultVal, lang, onChange, onReset,
}: {
  meta: FieldMeta;
  value: number;
  original: number;
  defaultVal: number;
  lang: Lang;
  onChange: (v: string) => void;
  onReset: () => void;
}) {
  const ar = lang === 'ar';
  const changed = value !== original;

  return (
    <div className="formGroup" style={{ borderLeft: changed ? '3px solid var(--teal)' : '3px solid transparent', paddingLeft: 10 }}>
      <label className="formLabel">
        {ar ? meta.labelAr : meta.labelEn}
        {changed && (
          <span style={{ marginRight: ar ? 0 : 8, marginLeft: ar ? 8 : 0, fontSize: 11, color: 'var(--teal)', fontWeight: 700 }}>
            {ar ? '(معدّل)' : '(modified)'}
          </span>
        )}
      </label>
      <p className="muted" style={{ fontSize: 12, margin: '2px 0 8px' }}>{ar ? meta.hintAr : meta.hintEn}</p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="number"
          className="formInput"
          value={value}
          min={meta.min}
          max={meta.max}
          step={1}
          onChange={(e) => onChange(e.target.value)}
          style={{ maxWidth: 120 }}
        />
        <span className="muted" style={{ fontSize: 13 }}>{meta.unit}</span>
        {value !== defaultVal && (
          <button
            onClick={onReset}
            style={{ fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', textDecoration: 'underline', padding: 0 }}
          >
            {ar ? `إعادة للافتراضي (${defaultVal})` : `Reset to default (${defaultVal})`}
          </button>
        )}
      </div>
    </div>
  );
}

const FLOW_AR = [
  { icon: '🚗', title: 'طلب رحلة جديد', body: 'يُرسَل الطلب لجميع السائقين المتاحين في نفس المدينة ونوع المركبة عبر Socket.io.' },
  { icon: '⏱', title: 'مهلة الرد', body: 'لدى السائق المهلة المحددة أعلاه للرد. إذا انتهت المهلة يُعدّ ذلك رفضاً تلقائياً.' },
  { icon: '❌', title: 'حد الرفض اليومي', body: 'إذا رفض السائق العدد المحدد من الطلبات في يوم واحد، يُعلَّق حسابه للمدة الأولى.' },
  { icon: '🔁', title: 'تكرار المخالفة', body: 'عند التعليق مجدداً، تُطبَّق مدة التعليق الأطول + خصم المبلغ المحدد من محفظته.' },
  { icon: '🚫', title: 'إلغاء الراكب', body: 'إذا ألغى الراكب أكثر من الحد المحدد في يوم واحد، يُعلَّق حسابه ولا يستطيع طلب رحلة جديدة.' },
];

const FLOW_EN = [
  { icon: '🚗', title: 'New ride request', body: 'Request is dispatched to all eligible drivers in the same city and vehicle type via Socket.io.' },
  { icon: '⏱', title: 'Response timeout', body: 'Driver has the configured window to respond. Expiry counts as an automatic rejection.' },
  { icon: '❌', title: 'Daily rejection limit', body: 'If a driver rejects the configured number of requests in one day, their account is suspended for the first duration.' },
  { icon: '🔁', title: 'Repeat violation', body: 'On the next suspension, the longer duration applies and the configured amount is deducted from their wallet.' },
  { icon: '🚫', title: 'Passenger cancellation', body: 'If a passenger cancels more than the limit in one day, their account is suspended and they cannot book a new ride.' },
];
