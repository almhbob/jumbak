'use client';
import { FormEvent, useEffect, useState } from 'react';
import { apiPost, apiPatch } from '../lib/apiClient';

type Lang = 'ar' | 'en';
type State = { type: 'idle' | 'success' | 'error'; message: string };
type VehicleType = { id: string; nameAr: string; nameEn: string; baseFare: number; perKmFare: number; minimumFare: number };
type City = { id: string; nameAr: string; nameEn: string; countryId: string };

const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

const subscriptions = [
  ['Firebase', 'Firestore and app data', 'Environment variables', 'Required'],
  ['Cloudflare Pages', 'Admin dashboard hosting', 'jnbk-admin.pages.dev', 'Active'],
  ['Expo / EAS', 'Mobile preview and APK builds', 'EAS profile', 'Required before APK'],
  ['Google Play', 'Android publishing', 'Developer account', 'Pending'],
  ['Maps', 'Routing and map services', 'API key', 'Optional now'],
  ['SMS', 'OTP and offline requests', 'Provider account', 'Launch phase'],
];

const systemItems = [
  ['NEXT_PUBLIC_API_URL', apiUrl || 'Not configured', 'Admin API connection'],
  ['EXPO_PUBLIC_API_URL', 'Set in Expo/EAS', 'Mobile API connection'],
  ['Firebase config', 'Set in Cloudflare and Expo env', 'Firestore connection'],
  ['DATABASE_URL', 'Railway secret', 'Backend database'],
  ['JWT_SECRET', 'Railway secret', 'Staff/API sessions'],
  ['ALLOWED_ORIGINS', 'Comma-separated URLs', 'CORS whitelist'],
  ['Legal docs', 'Privacy + Terms', 'Launch requirement'],
];

const ar = {
  login: 'دخول المطور أو الإدارة',
  loginHint: 'سجّل الدخول عبر البوابة الموحدة باختيار حساب المطور أو الإدارة.',
  goPortal: 'فتح البوابة',
  title: 'الإعدادات والبنية التحتية',
  sub: 'إدارة المدن والمناطق وأنواع المركبات والأسعار وإعدادات النظام والاشتراكات التقنية في Jnbk جنبك.',
  back: 'الرئيسية',
  toggle: 'English',
  important: 'نسخة الاتفاقات',
  importantHint: 'النسب والاتفاقات ومنصرفات التطبيق تظهر للإدارة للعلم فقط.',
  openImportant: 'فتح نسخة الاتفاقات',
  api: 'حالة الربط',
  connected: 'رابط API مضبوط',
  missing: 'رابط API غير مضبوط؛ ستظهر الصفحة لكن الحفظ لن يعمل حتى ربط Railway.',
  city: 'إضافة مدينة أو منطقة تغطية',
  cityHint: 'أدخل المدينة ومناطقها بالعربية والإنجليزية.',
  cityId: 'معرف المدينة مثل rufaa',
  country: 'رمز الدولة مثل sd',
  cityAr: 'اسم المدينة بالعربية',
  cityEn: 'اسم المدينة بالإنجليزية',
  zonesAr: 'المناطق بالعربية مفصولة بفواصل',
  zonesEn: 'المناطق بالإنجليزية مفصولة بفواصل',
  vehicle: 'إضافة مركبة أو خدمة',
  vehicleHint: 'أدخل نوع الخدمة وأسعارها.',
  vehicleId: 'معرف الخدمة مثل rickshaw',
  vehicleAr: 'اسم الخدمة بالعربية',
  vehicleEn: 'اسم الخدمة بالإنجليزية',
  base: 'سعر فتح الرحلة',
  km: 'سعر الكيلومتر',
  min: 'الحد الأدنى',
  saveCity: 'حفظ المدينة',
  saveVehicle: 'حفظ المركبة',
  success: 'تم الحفظ بنجاح.',
  fail: 'تعذر الحفظ. اربط NEXT_PUBLIC_API_URL برابط Railway أولًا.',
  required: 'أكمل الحقول المطلوبة.',
  workflow: 'تنظيم العمل',
  env: 'إعدادات النظام',
  subscriptions: 'الاشتراكات التقنية',
  endpoints: 'واجهات API',
  status: 'الحالة',
  details: 'التفاصيل',
  existingVehicles: 'المركبات والخدمات الحالية',
  existingVehiclesHint: 'انقر تعديل لتحديث أسعار أي خدمة.',
  existingCities: 'المدن الحالية',
  edit: 'تعديل',
  cancel: 'إلغاء',
  saving: 'جارٍ الحفظ...',
  saveEdit: 'حفظ التعديل',
  noVehicles: 'لا توجد مركبات مسجلة بعد.',
  noCities: 'لا توجد مدن مسجلة بعد.',
  sdg: 'ج.س',
};

const en: typeof ar = {
  login: 'Developer or business login',
  loginHint: 'Log in from the unified portal by selecting the Developer or Business account.',
  goPortal: 'Open portal',
  title: 'Settings and Infrastructure',
  sub: 'Manage cities, zones, vehicle types, pricing, system settings, and technical subscriptions for Jnbk جنبك.',
  back: 'Back to dashboard',
  toggle: 'العربية',
  important: 'Agreements copy',
  importantHint: 'Profit shares, agreements, and app costs are visible to management for awareness only.',
  openImportant: 'Open agreements',
  api: 'Connection status',
  connected: 'API URL configured',
  missing: 'API URL is missing; page is visible but saving requires Railway backend.',
  city: 'Add city or coverage area',
  cityHint: 'Enter the city and its Arabic/English zones.',
  cityId: 'City ID e.g. rufaa',
  country: 'Country code e.g. sd',
  cityAr: 'City name Arabic',
  cityEn: 'City name English',
  zonesAr: 'Arabic zones separated by commas',
  zonesEn: 'English zones separated by commas',
  vehicle: 'Add vehicle or service',
  vehicleHint: 'Enter the service type and pricing.',
  vehicleId: 'Service ID e.g. rickshaw',
  vehicleAr: 'Service name Arabic',
  vehicleEn: 'Service name English',
  base: 'Base fare',
  km: 'Per km fare',
  min: 'Minimum fare',
  saveCity: 'Save city',
  saveVehicle: 'Save vehicle',
  success: 'Saved successfully.',
  fail: 'Could not save. Connect NEXT_PUBLIC_API_URL to Railway first.',
  required: 'Complete required fields.',
  workflow: 'Workflow',
  env: 'System settings',
  subscriptions: 'Technical subscriptions',
  endpoints: 'API endpoints',
  status: 'Status',
  details: 'Details',
  existingVehicles: 'Current vehicles and services',
  existingVehiclesHint: 'Click edit to update pricing for any service.',
  existingCities: 'Current cities',
  edit: 'Edit',
  cancel: 'Cancel',
  saving: 'Saving...',
  saveEdit: 'Save changes',
  noVehicles: 'No vehicles registered yet.',
  noCities: 'No cities registered yet.',
  sdg: 'SDG',
};

function list(v: string): string[] {
  return v.split(',').map((x) => x.trim()).filter(Boolean);
}

export default function Settings() {
  const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
  const initial: Lang = params.get('lang') === 'en' ? 'en' : 'ar';
  const [lang] = useState<Lang>(initial);
  const [state, setState] = useState<State>({ type: 'idle', message: '' });

  const [vehicles, setVehicles] = useState<VehicleType[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [editVehicle, setEditVehicle] = useState<VehicleType | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const t = lang === 'ar' ? ar : en;
  const rtl = lang === 'ar';

  const activeRole = typeof window !== 'undefined' ? sessionStorage.getItem('jnbk_active_role') : null;
  const isAuthorized = activeRole === 'developer' || activeRole === 'business';

  function go(path: string) {
    if (typeof window !== 'undefined') window.location.href = path;
  }

  useEffect(() => {
    if (!isAuthorized || !apiUrl) return;
    const token = sessionStorage.getItem('jnbk_staff_token') || '';
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(`${apiUrl}/api/config`, { headers })
      .then((r) => r.ok ? r.json() : { vehicleTypes: [], cities: [] })
      .then((data) => {
        setVehicles(Array.isArray(data.vehicleTypes) ? data.vehicleTypes : []);
        setCities(Array.isArray(data.cities) ? data.cities : []);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveVehicleEdit() {
    if (!editVehicle) return;
    setEditSaving(true);
    try {
      await apiPatch(`/api/admin/vehicle-types/${editVehicle.id}`, {
        nameAr: editVehicle.nameAr,
        nameEn: editVehicle.nameEn,
        baseFare: editVehicle.baseFare,
        perKmFare: editVehicle.perKmFare,
        minimumFare: editVehicle.minimumFare,
      });
      setVehicles((prev) => prev.map((v) => v.id === editVehicle.id ? editVehicle : v));
      setEditVehicle(null);
      setState({ type: 'success', message: t.success });
    } catch {
      setState({ type: 'error', message: t.fail });
    } finally {
      setEditSaving(false);
    }
  }

  async function submitCity(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      id: String(f.get('id') || '').trim().toLowerCase(),
      countryId: String(f.get('countryId') || 'sd').trim().toLowerCase(),
      nameAr: String(f.get('nameAr') || '').trim(),
      nameEn: String(f.get('nameEn') || '').trim(),
      zonesAr: list(String(f.get('zonesAr') || '')),
      zonesEn: list(String(f.get('zonesEn') || '')),
    };
    if (!body.id || !body.nameAr || !body.nameEn) return setState({ type: 'error', message: t.required });
    try {
      await apiPost('/api/admin/cities', body);
      setState({ type: 'success', message: t.success });
      setCities((prev) => prev.some(c => c.id === body.id) ? prev.map(c => c.id === body.id ? { ...c, ...body } : c) : [...prev, body]);
      e.currentTarget.reset();
    } catch {
      setState({ type: 'error', message: t.fail });
    }
  }

  async function submitVehicle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      id: String(f.get('id') || '').trim().toLowerCase(),
      nameAr: String(f.get('nameAr') || '').trim(),
      nameEn: String(f.get('nameEn') || '').trim(),
      baseFare: Number(f.get('baseFare') || 0),
      perKmFare: Number(f.get('perKmFare') || 0),
      minimumFare: Number(f.get('minimumFare') || 0),
    };
    if (!body.id || !body.nameAr || !body.nameEn || !body.baseFare || !body.perKmFare || !body.minimumFare) {
      return setState({ type: 'error', message: t.required });
    }
    try {
      await apiPost('/api/admin/vehicle-types', body);
      setState({ type: 'success', message: t.success });
      setVehicles((prev) => prev.some(v => v.id === body.id) ? prev.map(v => v.id === body.id ? body : v) : [...prev, body]);
      e.currentTarget.reset();
    } catch {
      setState({ type: 'error', message: t.fail });
    }
  }

  if (!isAuthorized) {
    return (
      <main dir={rtl ? 'rtl' : 'ltr'} style={{ textAlign: rtl ? 'right' : 'left' }}>
        <section className="hero">
          <div className="heroTop">
            <div>
              <p className="kicker">Jnbk جنبك</p>
              <h1>{t.login}</h1>
              <p>{t.loginHint}</p>
            </div>
            <button className="languageSwitch buttonReset" onClick={() => go(`/settings?lang=${lang === 'ar' ? 'en' : 'ar'}`)}>
              {t.toggle}
            </button>
          </div>
        </section>
        <section className="panel">
          <button className="primaryAction" onClick={() => go(`/portal?lang=${lang}`)}>
            {t.goPortal}
          </button>
        </section>
      </main>
    );
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
            <button className="languageSwitch buttonReset" onClick={() => go('/')}>{t.back}</button>
            <button className="languageSwitch buttonReset" onClick={() => go(`/zones?lang=${lang}`)}>
              {lang === 'ar' ? 'المناطق' : 'Zones'}
            </button>
            <button className="languageSwitch buttonReset" onClick={() => go(`/settings?lang=${lang === 'ar' ? 'en' : 'ar'}`)}>
              {t.toggle}
            </button>
          </div>
        </div>
      </section>

      {/* ── Status cards ── */}
      <section className="grid settingsGrid">
        <div className="card">
          <p>{t.api}</p>
          <strong className={apiUrl ? 'status-online' : 'status-pending'}>{apiUrl ? t.connected : t.missing}</strong>
        </div>
        <div className="card"><p>{lang === 'ar' ? 'الدور النشط' : 'Active role'}</p><strong>{activeRole}</strong></div>
        <div className="card"><p>{lang === 'ar' ? 'المركبات' : 'Vehicles'}</p><strong>{vehicles.length}</strong></div>
        <div className="card"><p>{lang === 'ar' ? 'المدن' : 'Cities'}</p><strong>{cities.length}</strong></div>
      </section>

      {state.message ? <div className={`notice ${state.type}`}>{state.message}</div> : null}

      {/* ── Existing vehicle types ── */}
      <section className="panel">
        <h2>{t.existingVehicles}</h2>
        <p className="muted">{t.existingVehiclesHint}</p>

        {vehicles.length === 0 ? (
          <div className="empty">{t.noVehicles}</div>
        ) : (
          <div className="table">
            {/* Header row */}
            <div className="row" style={{ background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-mid) 100%)', color: 'white' }}>
              {['ID', lang === 'ar' ? 'الاسم' : 'Name', lang === 'ar' ? 'فتح الرحلة' : 'Base fare', lang === 'ar' ? 'كيلومتر' : 'Per km', lang === 'ar' ? 'الحد الأدنى' : 'Minimum', ''].map((h) => (
                <span key={h} style={{ color: 'rgba(255,255,255,.85)', fontWeight: 900, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</span>
              ))}
            </div>

            {vehicles.map((v) => (
              <div key={v.id}>
                {editVehicle?.id === v.id ? (
                  /* ── Inline edit row ── */
                  <div style={{ background: 'rgba(214,169,54,.06)', border: '1.5px solid var(--gold)', borderRadius: 12, padding: '16px 20px', marginBottom: 4, display: 'grid', gap: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>{lang === 'ar' ? 'الاسم عربي' : 'Name AR'}</label>
                        <input value={editVehicle.nameAr} onChange={e => setEditVehicle({ ...editVehicle, nameAr: e.target.value })} style={{ width: '100%', marginTop: 4 }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>{lang === 'ar' ? 'الاسم إنجليزي' : 'Name EN'}</label>
                        <input value={editVehicle.nameEn} onChange={e => setEditVehicle({ ...editVehicle, nameEn: e.target.value })} style={{ width: '100%', marginTop: 4 }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>{t.base}</label>
                        <input type="number" value={editVehicle.baseFare} onChange={e => setEditVehicle({ ...editVehicle, baseFare: Number(e.target.value) })} style={{ width: '100%', marginTop: 4 }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>{t.km}</label>
                        <input type="number" value={editVehicle.perKmFare} onChange={e => setEditVehicle({ ...editVehicle, perKmFare: Number(e.target.value) })} style={{ width: '100%', marginTop: 4 }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>{t.min}</label>
                        <input type="number" value={editVehicle.minimumFare} onChange={e => setEditVehicle({ ...editVehicle, minimumFare: Number(e.target.value) })} style={{ width: '100%', marginTop: 4 }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={saveVehicleEdit}
                        disabled={editSaving}
                        style={{ background: 'linear-gradient(135deg, var(--teal) 0%, #0A7A63 100%)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 900, fontSize: 13, cursor: editSaving ? 'not-allowed' : 'pointer', opacity: editSaving ? 0.6 : 1 }}
                      >
                        {editSaving ? t.saving : t.saveEdit}
                      </button>
                      <button
                        onClick={() => setEditVehicle(null)}
                        style={{ background: 'var(--card-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                      >
                        {t.cancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="row" style={{ alignItems: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: 'var(--gold)' }}>{v.id}</span>
                    <span style={{ fontWeight: 700 }}>{lang === 'ar' ? v.nameAr : v.nameEn}</span>
                    <span>{v.baseFare.toLocaleString()} <small style={{ color: 'var(--text-muted)' }}>{t.sdg}</small></span>
                    <span>{v.perKmFare.toLocaleString()} <small style={{ color: 'var(--text-muted)' }}>{t.sdg}</small></span>
                    <span>{v.minimumFare.toLocaleString()} <small style={{ color: 'var(--text-muted)' }}>{t.sdg}</small></span>
                    <button
                      onClick={() => setEditVehicle({ ...v })}
                      style={{ background: 'none', border: '1.5px solid var(--navy)', color: 'var(--navy)', borderRadius: 8, padding: '5px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
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

      {/* ── Existing cities ── */}
      <section className="panel">
        <h2>{t.existingCities}</h2>
        {cities.length === 0 ? (
          <div className="empty">{t.noCities}</div>
        ) : (
          <div className="table">
            <div className="row" style={{ background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-mid) 100%)', color: 'white' }}>
              {['ID', lang === 'ar' ? 'الاسم عربي' : 'Name AR', lang === 'ar' ? 'الاسم إنجليزي' : 'Name EN', lang === 'ar' ? 'الدولة' : 'Country'].map((h) => (
                <span key={h} style={{ color: 'rgba(255,255,255,.85)', fontWeight: 900, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</span>
              ))}
            </div>
            {cities.map((c) => (
              <div className="row" key={c.id}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: 'var(--teal)' }}>{c.id}</span>
                <span style={{ fontWeight: 700 }}>{c.nameAr}</span>
                <span>{c.nameEn}</span>
                <span style={{ color: 'var(--text-muted)' }}>{c.countryId?.toUpperCase()}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Add city form ── */}
      <section className="panel">
        <h2>{t.city}</h2>
        <p className="muted">{t.cityHint}</p>
        <form className="formGrid" onSubmit={submitCity}>
          <input name="id" placeholder={t.cityId} />
          <input name="countryId" placeholder={t.country} defaultValue="sd" />
          <input name="nameAr" placeholder={t.cityAr} />
          <input name="nameEn" placeholder={t.cityEn} />
          <textarea name="zonesAr" placeholder={t.zonesAr} />
          <textarea name="zonesEn" placeholder={t.zonesEn} />
          <button className="primaryAction" type="submit">{t.saveCity}</button>
        </form>
      </section>

      {/* ── Add vehicle form ── */}
      <section className="panel">
        <h2>{t.vehicle}</h2>
        <p className="muted">{t.vehicleHint}</p>
        <form className="formGrid" onSubmit={submitVehicle}>
          <input name="id" placeholder={t.vehicleId} />
          <input name="nameAr" placeholder={t.vehicleAr} />
          <input name="nameEn" placeholder={t.vehicleEn} />
          <input name="baseFare" type="number" placeholder={t.base} />
          <input name="perKmFare" type="number" placeholder={t.km} />
          <input name="minimumFare" type="number" placeholder={t.min} />
          <button className="primaryAction" type="submit">{t.saveVehicle}</button>
        </form>
      </section>

      {/* ── Agreements link ── */}
      <section className="panel">
        <h2>{t.important}</h2>
        <p className="muted">{t.importantHint}</p>
        <button className="primaryAction" style={{ display: 'inline-block', marginTop: 12 }} onClick={() => go('/business')}>
          {t.openImportant}
        </button>
      </section>

      {/* ── Developer-only sections ── */}
      {activeRole === 'developer' && (
        <>
          <section className="panel">
            <h2>{t.env}</h2>
            <div className="table">
              {systemItems.map((r) => (
                <div className="row" key={r[0]}>
                  <span>{r[0]}</span>
                  <span>{r[1]}</span>
                  <span>{t.details}</span>
                  <b>{r[2]}</b>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>{t.subscriptions}</h2>
            <div className="table">
              {subscriptions.map((r) => (
                <div className="row" key={r[0]}>
                  <span>{r[0]}</span>
                  <span>{r[1]}</span>
                  <span>{r[2]}</span>
                  <b>{r[3]}</b>
                </div>
              ))}
            </div>
          </section>

          <section className="grid devGrid">
            <div className="panel">
              <h2>{t.workflow}</h2>
              <ol>
                <li>Define city and zones.</li>
                <li>Add vehicle pricing.</li>
                <li>Test passenger flow.</li>
                <li>Register drivers.</li>
              </ol>
            </div>
            <div className="panel">
              <h2>{t.endpoints}</h2>
              <code>POST /api/admin/cities</code>
              <code>POST /api/admin/vehicle-types</code>
              <code>PATCH /api/admin/vehicle-types/:id</code>
              <code>GET /api/config</code>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
