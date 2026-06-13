'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch } from '../lib/apiClient';

type Lang = 'ar' | 'en';
type VehicleType = { id: string; nameAr: string; nameEn: string; baseFare: number; perKmFare: number; minimumFare: number };
type EditState = { baseFare: string; perKmFare: string; minimumFare: string; nameAr: string; nameEn: string };

const ALLOWED_ROLES = ['developer', 'operations', 'finance', 'supervisor', 'business'];

const ar = {
  title: 'إدارة التسعير',
  sub: 'عرض وتعديل أسعار خدمات رفاعة — التغييرات تُطبَّق فورًا على التطبيق.',
  back: 'رجوع',
  toggle: 'English',
  loading: 'جارٍ التحميل...',
  noApi: 'لم يتم ربط NEXT_PUBLIC_API_URL. الأسعار الظاهرة هي القيم الافتراضية.',
  id: 'المعرف',
  nameAr: 'الاسم عربي',
  nameEn: 'الاسم إنجليزي',
  base: 'فتح الرحلة',
  km: 'سعر الكيلومتر',
  min: 'الحد الأدنى',
  edit: 'تعديل',
  save: 'حفظ',
  cancel: 'إلغاء',
  add: 'إضافة نوع مركبة جديد',
  addHint: 'أدخل بيانات الخدمة كاملة — هذا الإجراء للمطور فقط.',
  addBtn: 'إضافة',
  saved: 'تم الحفظ بنجاح',
  failed: 'تعذر الحفظ. تحقق من الاتصال بالخادم.',
  required: 'أكمل جميع الحقول',
  currency: 'SDG',
  fareCalc: 'التسعيرة: فتح الرحلة + (المسافة × سعر الكيلومتر) — لا تقل عن الحد الأدنى',
  editFares: 'تعديل الأسعار',
  loginRequired: 'يجب تسجيل الدخول بصلاحية مناسبة (عمليات، مالية، مطور)',
  goPortal: 'الذهاب للبوابة',
  example: 'مثال: رحلة 3 كم →',
};

const en: typeof ar = {
  title: 'Pricing Management',
  sub: 'View and edit service fares — changes apply to the app immediately.',
  back: 'Back',
  toggle: 'العربية',
  loading: 'Loading...',
  noApi: 'NEXT_PUBLIC_API_URL not configured. Showing default values.',
  id: 'ID',
  nameAr: 'Name Arabic',
  nameEn: 'Name English',
  base: 'Base fare',
  km: 'Per km',
  min: 'Minimum',
  edit: 'Edit',
  save: 'Save',
  cancel: 'Cancel',
  add: 'Add new vehicle type',
  addHint: 'Enter complete service data — developer-only action.',
  addBtn: 'Add',
  saved: 'Saved successfully',
  failed: 'Could not save. Check server connection.',
  required: 'Complete all fields',
  currency: 'SDG',
  fareCalc: 'Formula: base fare + (distance × per-km fare), not less than minimum',
  editFares: 'Edit Fares',
  loginRequired: 'Login required with appropriate role (operations, finance, developer)',
  goPortal: 'Go to portal',
  example: 'Example: 3 km trip →',
};

const fallbackTypes: VehicleType[] = [
  { id: 'rickshaw', nameAr: 'ركشة',          nameEn: 'Rickshaw',   baseFare: 500,  perKmFare: 300, minimumFare: 1000 },
  { id: 'car',      nameAr: 'جنبك تاكسي',    nameEn: 'Jnbk Taxi',  baseFare: 900,  perKmFare: 550, minimumFare: 1800 },
  { id: 'van',      nameAr: 'حافلة صغيرة',   nameEn: 'Van',        baseFare: 1200, perKmFare: 700, minimumFare: 2500 },
];

function calcExample(vt: VehicleType) {
  return Math.max(vt.baseFare + 3 * vt.perKmFare, vt.minimumFare).toLocaleString('en');
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

  // Add form state (developer only)
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
        // Fallback to public config
        apiGet<{ vehicleTypes?: VehicleType[] }>('/api/config', {})
          .then((cfg) => {
            if (Array.isArray(cfg.vehicleTypes) && cfg.vehicleTypes.length) setVehicleTypes(cfg.vehicleTypes);
          })
          .finally(() => setLoading(false));
      });
  }, []);

  if (!role || !ALLOWED_ROLES.includes(role)) {
    return (
      <main dir={rtl ? 'rtl' : 'ltr'} style={{ textAlign: rtl ? 'right' : 'left' }}>
        <section className="hero">
          <div className="heroTop">
            <div><p className="kicker">Jnbk جنبك</p><h1>{t.loginRequired}</h1></div>
            <button className="languageSwitch buttonReset" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>{t.toggle}</button>
          </div>
        </section>
        <section className="panel">
          <button className="primaryAction" onClick={() => { window.location.href = `/portal?lang=${lang}`; }}>{t.goPortal}</button>
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
    if (!baseFare || !perKmFare || !minimumFare) return setNotice({ type: 'error', msg: t.required });
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
          <div className="topActions">
            <button className="languageSwitch buttonReset" onClick={() => window.location.href = '/'}>{t.back}</button>
            <button className="languageSwitch buttonReset" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>{t.toggle}</button>
          </div>
        </div>
      </section>

      {notice && (
        <div className={`notice ${notice.type}`} style={{ margin: '0 24px 8px' }}>
          {notice.msg}
        </div>
      )}

      <section className="panel">
        <p className="muted" style={{ marginBottom: 12 }}>{t.fareCalc}</p>

        {loading ? (
          <p className="muted">{t.loading}</p>
        ) : (
          <div className="table">
            {/* Header */}
            <div className="row" style={{ fontWeight: 900 }}>
              <span>{t.nameAr}</span>
              <span>{t.base}</span>
              <span>{t.km}</span>
              <span>{t.min}</span>
              <span>{t.example}</span>
              <span></span>
            </div>

            {vehicleTypes.map((vt) => (
              <div key={vt.id}>
                {editingId === vt.id ? (
                  /* ── Edit row ── */
                  <div className="row" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <input
                      style={inputStyle}
                      value={editForm.nameAr}
                      onChange={(e) => setEditForm((f) => ({ ...f, nameAr: e.target.value }))}
                      placeholder={t.nameAr}
                    />
                    <input
                      style={inputStyle}
                      type="number"
                      value={editForm.baseFare}
                      onChange={(e) => setEditForm((f) => ({ ...f, baseFare: e.target.value }))}
                      placeholder={t.base}
                    />
                    <input
                      style={inputStyle}
                      type="number"
                      value={editForm.perKmFare}
                      onChange={(e) => setEditForm((f) => ({ ...f, perKmFare: e.target.value }))}
                      placeholder={t.km}
                    />
                    <input
                      style={inputStyle}
                      type="number"
                      value={editForm.minimumFare}
                      onChange={(e) => setEditForm((f) => ({ ...f, minimumFare: e.target.value }))}
                      placeholder={t.min}
                    />
                    <span style={{ color: '#64748b', fontSize: 13 }}>
                      {(() => {
                        const b = Number(editForm.baseFare) || 0;
                        const k = Number(editForm.perKmFare) || 0;
                        const m = Number(editForm.minimumFare) || 0;
                        return `${Math.max(b + 3 * k, m).toLocaleString('en')} ${t.currency}`;
                      })()}
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="primaryAction" style={{ padding: '6px 16px', fontSize: 13 }} onClick={() => saveEdit(vt.id)} disabled={saving}>
                        {saving ? '...' : t.save}
                      </button>
                      <button className="languageSwitch buttonReset" style={{ padding: '6px 12px', fontSize: 13 }} onClick={cancelEdit}>
                        {t.cancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Display row ── */
                  <div className="row">
                    <span><b>{lang === 'ar' ? vt.nameAr : vt.nameEn}</b><br /><small style={{ color: '#94a3b8' }}>{vt.id}</small></span>
                    <span>{vt.baseFare.toLocaleString('en')} {t.currency}</span>
                    <span>{vt.perKmFare.toLocaleString('en')} {t.currency}</span>
                    <span>{vt.minimumFare.toLocaleString('en')} {t.currency}</span>
                    <span style={{ color: '#f59e0b', fontWeight: 900 }}>{calcExample(vt)} {t.currency}</span>
                    <button
                      className="primaryAction"
                      style={{ padding: '6px 14px', fontSize: 13 }}
                      onClick={() => startEdit(vt)}
                      disabled={!isApiReady}
                    >
                      {t.edit}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add new vehicle type — developer only */}
      {role === 'developer' && (
        <section className="panel">
          <h2>{t.add}</h2>
          <p className="muted">{t.addHint}</p>
          {!showAdd ? (
            <button className="primaryAction" style={{ marginTop: 8 }} onClick={() => setShowAdd(true)}>{t.add}</button>
          ) : (
            <div className="formGrid" style={{ marginTop: 12 }}>
              <input placeholder={t.id} value={addForm.id} onChange={(e) => setAddForm((f) => ({ ...f, id: e.target.value }))} />
              <input placeholder={t.nameAr} value={addForm.nameAr} onChange={(e) => setAddForm((f) => ({ ...f, nameAr: e.target.value }))} />
              <input placeholder={t.nameEn} value={addForm.nameEn} onChange={(e) => setAddForm((f) => ({ ...f, nameEn: e.target.value }))} />
              <input type="number" placeholder={t.base} value={addForm.baseFare} onChange={(e) => setAddForm((f) => ({ ...f, baseFare: e.target.value }))} />
              <input type="number" placeholder={t.km} value={addForm.perKmFare} onChange={(e) => setAddForm((f) => ({ ...f, perKmFare: e.target.value }))} />
              <input type="number" placeholder={t.min} value={addForm.minimumFare} onChange={(e) => setAddForm((f) => ({ ...f, minimumFare: e.target.value }))} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="primaryAction" onClick={submitAdd} disabled={saving}>{saving ? '...' : t.addBtn}</button>
                <button className="languageSwitch buttonReset" onClick={() => setShowAdd(false)}>{t.cancel}</button>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 10, border: '1.5px solid #d9e2ec',
  fontSize: 14, fontWeight: 700, width: 110, background: '#f8fafc',
};
