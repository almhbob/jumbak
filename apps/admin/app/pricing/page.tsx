'use client';
import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost, apiPatch } from '../lib/apiClient';

type Lang = 'ar' | 'en';
type VehicleType = { id: string; nameAr: string; nameEn: string; baseFare: number; perKmFare: number; minimumFare: number; isVisible?: boolean };
type EditState = { baseFare: string; perKmFare: string; minimumFare: string; nameAr: string; nameEn: string };

const ALLOWED_ROLES = ['developer', 'operations', 'finance', 'supervisor', 'business'];

const ar = {
  title: 'إدارة التسعير',
  sub: 'عرض وتعديل أسعار خدمات رفاعة — التغييرات تُطبَّق فورًا على التطبيق.',
  back: 'الرئيسية', operations: 'التشغيل', portal: 'البوابة', toggle: 'English',
  loading: 'جارٍ التحميل...', noApi: 'لم يتم ربط NEXT_PUBLIC_API_URL. الأسعار الظاهرة هي القيم الافتراضية.',
  id: 'المعرف', nameAr: 'الاسم عربي', nameEn: 'الاسم إنجليزي', base: 'فتح الرحلة', km: 'سعر الكيلومتر', min: 'الحد الأدنى',
  edit: 'تعديل', save: 'حفظ', cancel: 'إلغاء', add: 'إضافة نوع مركبة جديد', addHint: 'أدخل بيانات الخدمة كاملة — هذا الإجراء للمطور فقط.', addBtn: 'إضافة',
  saved: 'تم الحفظ بنجاح', failed: 'تعذر الحفظ. تحقق من الاتصال بالخادم.', required: 'أكمل جميع الحقول',
  show: 'إظهار في التطبيق', hide: 'إخفاء من التطبيق', visible: 'ظاهر', hidden: 'مخفي', currency: 'SDG',
  fareCalc: 'التسعيرة = فتح الرحلة + (المسافة × سعر الكيلومتر)، ولا تقل عن الحد الأدنى.', editFares: 'تعديل الأسعار',
  loginRequired: 'يجب تسجيل الدخول بصلاحية مناسبة (عمليات، مالية، مطور)', goPortal: 'الذهاب للبوابة', example: 'مثال 3 كم',
  totalTypes: 'أنواع المركبات', visibleTypes: 'الظاهرة', hiddenTypes: 'المخفية', avgMinimum: 'متوسط الحد الأدنى', status: 'الحالة', actions: 'الإجراء',
};

const en: typeof ar = {
  title: 'Pricing Management',
  sub: 'View and edit service fares — changes apply to the app immediately.',
  back: 'Home', operations: 'Operations', portal: 'Portal', toggle: 'العربية',
  loading: 'Loading...', noApi: 'NEXT_PUBLIC_API_URL not configured. Showing default values.',
  id: 'ID', nameAr: 'Name Arabic', nameEn: 'Name English', base: 'Base fare', km: 'Per km', min: 'Minimum',
  edit: 'Edit', save: 'Save', cancel: 'Cancel', add: 'Add new vehicle type', addHint: 'Enter complete service data — developer-only action.', addBtn: 'Add',
  saved: 'Saved successfully', failed: 'Could not save. Check server connection.', required: 'Complete all fields',
  show: 'Show in app', hide: 'Hide from app', visible: 'Visible', hidden: 'Hidden', currency: 'SDG',
  fareCalc: 'Formula = base fare + (distance × per-km fare), not less than minimum.', editFares: 'Edit Fares',
  loginRequired: 'Login required with appropriate role (operations, finance, developer)', goPortal: 'Go to portal', example: '3 km example',
  totalTypes: 'Vehicle types', visibleTypes: 'Visible', hiddenTypes: 'Hidden', avgMinimum: 'Avg. minimum', status: 'Status', actions: 'Actions',
};

const fallbackTypes: VehicleType[] = [
  { id: 'rickshaw', nameAr: 'ركشة',          nameEn: 'Rickshaw',   baseFare: 500,  perKmFare: 300, minimumFare: 1000 },
  { id: 'car',      nameAr: 'جنبك تاكسي',    nameEn: 'Jnbk Taxi',  baseFare: 900,  perKmFare: 550, minimumFare: 1800 },
  { id: 'van',      nameAr: 'حافلة صغيرة',   nameEn: 'Van',        baseFare: 1200, perKmFare: 700, minimumFare: 2500 },
];

function calcExample(vt: VehicleType) {
  return Math.max(vt.baseFare + 3 * vt.perKmFare, vt.minimumFare).toLocaleString('en');
}

function formatMoney(value: number, currency: string) {
  return `${Number(value || 0).toLocaleString('en')} ${currency}`;
}

export default function Pricing() {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const initialLang: Lang = params.get('lang') === 'en' ? 'en' : 'ar';
  const [lang, setLang] = useState<Lang>(initialLang);
  const t = lang === 'ar' ? ar : en;
  const rtl = lang === 'ar';

  const [role, setRole] = useState<string | null>(null);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>(fallbackTypes);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditState>({ baseFare: '', perKmFare: '', minimumFare: '', nameAr: '', nameEn: '' });
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isApiReady, setIsApiReady] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ id: '', nameAr: '', nameEn: '', baseFare: '', perKmFare: '', minimumFare: '' });

  useEffect(() => {
    const activeRole = sessionStorage.getItem('jnbk_active_role') || '';
    setRole(activeRole);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    setIsApiReady(Boolean(apiUrl));

    if (!apiUrl) {
      setNotice({ type: 'info', msg: t.noApi });
      setLoading(false);
      return;
    }

    apiGet<VehicleType[]>('/api/admin/vehicle-types', fallbackTypes)
      .then((data) => {
        if (Array.isArray(data) && data.length) setVehicleTypes(data);
        setLoading(false);
      })
      .catch(() => {
        apiGet<{ vehicleTypes?: VehicleType[] }>('/api/config', {})
          .then((cfg) => {
            if (Array.isArray(cfg.vehicleTypes) && cfg.vehicleTypes.length) setVehicleTypes(cfg.vehicleTypes);
          })
          .finally(() => setLoading(false));
      });
  }, []);

  const stats = useMemo(() => {
    const visible = vehicleTypes.filter((x) => x.isVisible !== false).length;
    const hidden = vehicleTypes.length - visible;
    const avg = vehicleTypes.length ? Math.round(vehicleTypes.reduce((s, x) => s + Number(x.minimumFare || 0), 0) / vehicleTypes.length) : 0;
    return { total: vehicleTypes.length, visible, hidden, avg };
  }, [vehicleTypes]);

  if (!role || !ALLOWED_ROLES.includes(role)) {
    return (
      <main dir={rtl ? 'rtl' : 'ltr'} style={{ textAlign: rtl ? 'right' : 'left' }}>
        <section className="hero">
          <div className="heroTop">
            <div><p className="kicker">Jnbk جنبك</p><h1>{t.loginRequired}</h1></div>
            <div className="adminHeroActions">
              <button className="languageSwitch buttonReset" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>{t.toggle}</button>
              <button className="primaryAction" onClick={() => { window.location.href = `/portal?lang=${lang}`; }}>{t.goPortal}</button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  function startEdit(vt: VehicleType) {
    setEditingId(vt.id);
    setEditForm({ baseFare: String(vt.baseFare), perKmFare: String(vt.perKmFare), minimumFare: String(vt.minimumFare), nameAr: vt.nameAr, nameEn: vt.nameEn });
    setNotice(null);
  }

  function cancelEdit() { setEditingId(null); setNotice(null); }

  async function saveEdit(id: string) {
    const baseFare = Number(editForm.baseFare);
    const perKmFare = Number(editForm.perKmFare);
    const minimumFare = Number(editForm.minimumFare);
    if (!baseFare || !perKmFare || !minimumFare || !editForm.nameAr || !editForm.nameEn) return setNotice({ type: 'error', msg: t.required });
    setSaving(true);
    try {
      const updated = await apiPatch<VehicleType>(`/api/admin/vehicle-types/${id}`, { baseFare, perKmFare, minimumFare, nameAr: editForm.nameAr, nameEn: editForm.nameEn });
      setVehicleTypes((prev) => prev.map((v) => v.id === id ? { ...v, ...updated } : v));
      setEditingId(null);
      setNotice({ type: 'success', msg: t.saved });
    } catch {
      setNotice({ type: 'error', msg: t.failed });
    } finally {
      setSaving(false);
    }
  }

  async function toggleVisibility(vt: VehicleType) {
    const newVal = !vt.isVisible;
    try {
      await apiPatch(`/api/admin/vehicle-types/${vt.id}`, { isVisible: newVal });
      setVehicleTypes((prev) => prev.map((v) => v.id === vt.id ? { ...v, isVisible: newVal } : v));
      setNotice({ type: 'success', msg: t.saved });
    } catch {
      setNotice({ type: 'error', msg: t.failed });
    }
  }

  async function submitAdd() {
    const body = { id: addForm.id.trim().toLowerCase(), nameAr: addForm.nameAr.trim(), nameEn: addForm.nameEn.trim(), baseFare: Number(addForm.baseFare), perKmFare: Number(addForm.perKmFare), minimumFare: Number(addForm.minimumFare) };
    if (!body.id || !body.nameAr || !body.nameEn || !body.baseFare || !body.perKmFare || !body.minimumFare) return setNotice({ type: 'error', msg: t.required });
    setSaving(true);
    try {
      const created = await apiPost<VehicleType>('/api/admin/vehicle-types', body);
      setVehicleTypes((prev) => { const idx = prev.findIndex((v) => v.id === created.id); return idx >= 0 ? prev.map((v) => v.id === created.id ? created : v) : [...prev, created]; });
      setShowAdd(false);
      setAddForm({ id: '', nameAr: '', nameEn: '', baseFare: '', perKmFare: '', minimumFare: '' });
      setNotice({ type: 'success', msg: t.saved });
    } catch {
      setNotice({ type: 'error', msg: t.failed });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main dir={rtl ? 'rtl' : 'ltr'} style={{ textAlign: rtl ? 'right' : 'left' }}>
      <section className="hero">
        <div className="heroTop">
          <div>
            <p className="kicker">Jnbk جنبك</p>
            <h1>{t.title}</h1>
            <p>{t.sub}</p>
          </div>
          <div className="adminHeroActions">
            <button className="languageSwitch buttonReset" onClick={() => window.location.href = '/'}>{t.back}</button>
            <button className="languageSwitch buttonReset" onClick={() => window.location.href = `/operations?lang=${lang}`}>{t.operations}</button>
            <button className="languageSwitch buttonReset" onClick={() => window.location.href = `/portal?lang=${lang}`}>{t.portal}</button>
            <button className="languageSwitch buttonReset" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>{t.toggle}</button>
          </div>
        </div>
      </section>

      <section className="adminStatGrid">
        <div className="card"><p>{t.totalTypes}</p><strong>{stats.total}</strong></div>
        <div className="card"><p>{t.visibleTypes}</p><strong style={{ background: 'none', WebkitTextFillColor: '#10b981', color: '#10b981' }}>{stats.visible}</strong></div>
        <div className="card"><p>{t.hiddenTypes}</p><strong style={{ background: 'none', WebkitTextFillColor: '#ef4444', color: '#ef4444' }}>{stats.hidden}</strong></div>
        <div className="card"><p>{t.avgMinimum}</p><strong>{formatMoney(stats.avg, t.currency)}</strong></div>
      </section>

      {notice && (
        <div className={`notice ${notice.type}`} style={{ margin: '12px 0' }}>{notice.msg}</div>
      )}

      <section className="panel">
        <div className="adminSectionHeader" style={{ marginTop: 0 }}>
          <div>
            <h2>{t.editFares}</h2>
            <p className="muted" style={{ margin: 0 }}>{t.fareCalc}</p>
          </div>
          <span className={isApiReady ? 'adminBadge adminBadgeSuccess' : 'adminBadge adminBadgeWarn'}>
            {isApiReady ? 'API' : 'Preview'}
          </span>
        </div>

        {loading ? (
          <p className="muted">{t.loading}</p>
        ) : (
          <div className="pricingList">
            {vehicleTypes.map((vt) => (
              <div key={vt.id}>
                {editingId === vt.id ? (
                  <div className="pricingEditGrid">
                    <label className="label">{t.nameAr}<input className="input" value={editForm.nameAr} onChange={(e) => setEditForm((f) => ({ ...f, nameAr: e.target.value }))} placeholder={t.nameAr} /></label>
                    <label className="label">{t.nameEn}<input className="input" value={editForm.nameEn} onChange={(e) => setEditForm((f) => ({ ...f, nameEn: e.target.value }))} placeholder={t.nameEn} /></label>
                    <label className="label">{t.base}<input className="input" type="number" value={editForm.baseFare} onChange={(e) => setEditForm((f) => ({ ...f, baseFare: e.target.value }))} placeholder={t.base} /></label>
                    <label className="label">{t.km}<input className="input" type="number" value={editForm.perKmFare} onChange={(e) => setEditForm((f) => ({ ...f, perKmFare: e.target.value }))} placeholder={t.km} /></label>
                    <label className="label">{t.min}<input className="input" type="number" value={editForm.minimumFare} onChange={(e) => setEditForm((f) => ({ ...f, minimumFare: e.target.value }))} placeholder={t.min} /></label>
                    <div className="pricingActions">
                      <button className="adminMiniButton adminMiniButtonSuccess" onClick={() => saveEdit(vt.id)} disabled={saving}>{saving ? '...' : t.save}</button>
                      <button className="adminMiniButton adminMiniButtonMuted" onClick={cancelEdit}>{t.cancel}</button>
                    </div>
                  </div>
                ) : (
                  <div className={`pricingCard ${vt.isVisible === false ? 'pricingCardHidden' : ''}`}>
                    <div className="pricingName">
                      <strong>{lang === 'ar' ? vt.nameAr : vt.nameEn}</strong>
                      <span className="adminInfoMuted">{vt.id}</span>
                      <span className={vt.isVisible === false ? 'adminBadge adminBadgeDanger' : 'adminBadge adminBadgeSuccess'}>{vt.isVisible === false ? t.hidden : t.visible}</span>
                    </div>
                    <div className="pricingMetric"><label>{t.base}</label><b>{formatMoney(vt.baseFare, t.currency)}</b></div>
                    <div className="pricingMetric"><label>{t.km}</label><b>{formatMoney(vt.perKmFare, t.currency)}</b></div>
                    <div className="pricingMetric"><label>{t.min}</label><b>{formatMoney(vt.minimumFare, t.currency)}</b></div>
                    <div className="pricingMetric"><label>{t.example}</label><b style={{ color: '#f59e0b' }}>{calcExample(vt)} {t.currency}</b></div>
                    <div className="pricingActions">
                      <button className="adminMiniButton adminMiniButtonSuccess" onClick={() => startEdit(vt)} disabled={!isApiReady}>{t.edit}</button>
                      <button className={vt.isVisible === false ? 'adminMiniButton adminMiniButtonSuccess' : 'adminMiniButton adminMiniButtonWarn'} onClick={() => toggleVisibility(vt)} disabled={!isApiReady}>
                        {vt.isVisible === false ? t.show : t.hide}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {role === 'developer' && (
        <section className="panel">
          <div className="adminSectionHeader" style={{ marginTop: 0 }}>
            <div>
              <h2>{t.add}</h2>
              <p className="muted" style={{ margin: 0 }}>{t.addHint}</p>
            </div>
            {!showAdd && <button className="primaryAction" onClick={() => setShowAdd(true)}>{t.add}</button>}
          </div>
          {showAdd && (
            <div className="formGrid" style={{ marginTop: 12 }}>
              <input placeholder={t.id} value={addForm.id} onChange={(e) => setAddForm((f) => ({ ...f, id: e.target.value }))} />
              <input placeholder={t.nameAr} value={addForm.nameAr} onChange={(e) => setAddForm((f) => ({ ...f, nameAr: e.target.value }))} />
              <input placeholder={t.nameEn} value={addForm.nameEn} onChange={(e) => setAddForm((f) => ({ ...f, nameEn: e.target.value }))} />
              <input type="number" placeholder={t.base} value={addForm.baseFare} onChange={(e) => setAddForm((f) => ({ ...f, baseFare: e.target.value }))} />
              <input type="number" placeholder={t.km} value={addForm.perKmFare} onChange={(e) => setAddForm((f) => ({ ...f, perKmFare: e.target.value }))} />
              <input type="number" placeholder={t.min} value={addForm.minimumFare} onChange={(e) => setAddForm((f) => ({ ...f, minimumFare: e.target.value }))} />
              <div className="pricingActions">
                <button className="adminMiniButton adminMiniButtonSuccess" onClick={submitAdd} disabled={saving}>{saving ? '...' : t.addBtn}</button>
                <button className="adminMiniButton adminMiniButtonMuted" onClick={() => setShowAdd(false)}>{t.cancel}</button>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
