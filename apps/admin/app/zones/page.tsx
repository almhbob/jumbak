'use client';
import { FormEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import { apiGet, apiPost, apiPatch, apiDelete } from '../lib/apiClient';

type Lang = 'ar' | 'en';
type Zone = { id: string; nameAr: string; nameEn: string; category: string; cityId: string };

const CATEGORIES = [
  'أحياء وشوارع',
  'مرافق ومعالم',
  'مستشفيات وعيادات',
  'مساجد وزوايا',
  'مدارس وجامعات',
  'حكومية وأمنية',
  'أندية رياضية',
  'مناطق محيطة',
];

const CATEGORY_ICONS: Record<string, string> = {
  'أحياء وشوارع': '🏘',
  'مرافق ومعالم': '📍',
  'مستشفيات وعيادات': '🏥',
  'مساجد وزوايا': '🕌',
  'مدارس وجامعات': '🎓',
  'حكومية وأمنية': '🏛',
  'أندية رياضية': '⚽',
  'مناطق محيطة': '🌾',
};

const copy = {
  ar: {
    title: 'إدارة المناطق',
    sub: 'عرض وإضافة وتعديل وحذف مناطق المدينة. تُستخدم هذه المناطق في التطبيق لتحديد نقطة الانطلاق والوجهة.',
    back: 'خروج',
    toggle: 'English',
    denied: 'هذه الصفحة مخصصة لحسابات المطور والتشغيل فقط.',
    goPortal: 'فتح البوابة',
    city: 'المدينة',
    cityPlaceholder: 'rufaa',
    search: 'بحث في المناطق...',
    filter: 'تصفية حسب الفئة',
    allCats: 'جميع الفئات',
    addZone: 'إضافة منطقة جديدة',
    nameAr: 'الاسم بالعربية',
    nameEn: 'الاسم بالإنجليزية',
    category: 'الفئة',
    save: 'حفظ',
    cancel: 'إلغاء',
    edit: 'تعديل',
    delete: 'حذف',
    deleteConfirm: 'هل تريد حذف هذه المنطقة؟ لا يمكن التراجع.',
    total: 'منطقة',
    loading: 'جاري التحميل...',
    noResults: 'لا توجد نتائج',
    success: 'تم الحفظ بنجاح.',
    deleteSuccess: 'تم الحذف.',
    fail: 'تعذرت العملية. تحقق من الاتصال بالخادم.',
    required: 'الاسم بالعربية مطلوب.',
    source: 'مصدر البيانات',
  },
  en: {
    title: 'Zone Management',
    sub: 'View, add, edit, and delete city zones. These zones are used in the app for pickup and destination selection.',
    back: 'Logout',
    toggle: 'العربية',
    denied: 'This page is only for developer and operations accounts.',
    goPortal: 'Open portal',
    city: 'City',
    cityPlaceholder: 'rufaa',
    search: 'Search zones...',
    filter: 'Filter by category',
    allCats: 'All categories',
    addZone: 'Add new zone',
    nameAr: 'Arabic name',
    nameEn: 'English name',
    category: 'Category',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    deleteConfirm: 'Delete this zone? This cannot be undone.',
    total: 'zones',
    loading: 'Loading...',
    noResults: 'No results',
    success: 'Saved successfully.',
    deleteSuccess: 'Deleted.',
    fail: 'Operation failed. Check server connection.',
    required: 'Arabic name is required.',
    source: 'Data source',
  },
};

function logout(lang: Lang) { sessionStorage.clear(); window.location.href = `/portal?lang=${lang}`; }

export default function Zones() {
  const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
  const lang: Lang = params.get('lang') === 'en' ? 'en' : 'ar';
  const t = copy[lang];
  const rtl = lang === 'ar';

  const [allowed, setAllowed] = useState(false);
  const [cityId, setCityId] = useState('rufaa');
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok');

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [addNameAr, setAddNameAr] = useState('');
  const [addNameEn, setAddNameEn] = useState('');
  const [addCategory, setAddCategory] = useState(CATEGORIES[0]);
  const [addLoading, setAddLoading] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editNameAr, setEditNameAr] = useState('');
  const [editNameEn, setEditNameEn] = useState('');
  const [editCategory, setEditCategory] = useState('');

  useEffect(() => {
    const role = sessionStorage.getItem('jnbk_active_role') || '';
    const devAuth = sessionStorage.getItem('jnbk_dev_auth') === 'true' && role === 'developer';
    const opsAuth = sessionStorage.getItem('jnbk_operations_auth') === 'true' && ['operations', 'supervisor'].includes(role);
    setAllowed(devAuth || opsAuth);
  }, []);

  useEffect(() => {
    if (!allowed) return;
    fetchZones();
  }, [allowed, cityId]);

  async function fetchZones() {
    setLoading(true);
    const data = await apiGet<{ zones: Zone[]; categories: string[] }>(
      `/api/admin/zones?cityId=${cityId}`,
      { zones: [], categories: [] }
    );
    setZones(data.zones || []);
    setLoading(false);
  }

  function flash(message: string, type: 'ok' | 'err') {
    setMsg(message); setMsgType(type);
    setTimeout(() => setMsg(''), 3500);
  }

  async function submitAdd(e: FormEvent) {
    e.preventDefault();
    if (!addNameAr.trim()) return flash(t.required, 'err');
    setAddLoading(true);
    try {
      await apiPost('/api/admin/zones', {
        cityId,
        nameAr: addNameAr.trim(),
        nameEn: addNameEn.trim() || addNameAr.trim(),
        category: addCategory,
      });
      flash(t.success, 'ok');
      setShowAdd(false);
      setAddNameAr(''); setAddNameEn(''); setAddCategory(CATEGORIES[0]);
      await fetchZones();
    } catch {
      flash(t.fail, 'err');
    } finally {
      setAddLoading(false);
    }
  }

  function startEdit(zone: Zone) {
    setEditId(zone.id);
    setEditNameAr(zone.nameAr);
    setEditNameEn(zone.nameEn || zone.nameAr);
    setEditCategory(zone.category || CATEGORIES[0]);
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault();
    if (!editId || !editNameAr.trim()) return flash(t.required, 'err');
    try {
      await apiPatch(`/api/admin/zones/${editId}`, {
        nameAr: editNameAr.trim(),
        nameEn: editNameEn.trim() || editNameAr.trim(),
        category: editCategory,
      });
      flash(t.success, 'ok');
      setEditId(null);
      await fetchZones();
    } catch {
      flash(t.fail, 'err');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t.deleteConfirm)) return;
    try {
      await apiDelete(`/api/admin/zones/${id}`);
      flash(t.deleteSuccess, 'ok');
      setZones((z) => z.filter((x) => x.id !== id));
    } catch {
      flash(t.fail, 'err');
    }
  }

  const filtered = zones.filter((z) => {
    const matchesQuery = !query || z.nameAr.includes(query) || (z.nameEn || '').toLowerCase().includes(query.toLowerCase());
    const matchesCat = !activeCategory || z.category === activeCategory;
    return matchesQuery && matchesCat;
  });

  const categoryCounts = CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = zones.filter((z) => z.category === cat).length;
    return acc;
  }, {});

  if (!allowed) {
    return (
      <main dir={rtl ? 'rtl' : 'ltr'} style={{ textAlign: rtl ? 'right' : 'left' }}>
        <header className="site-header">
          <Image src="/logo.png" alt="Jnbk جنبك" width={120} height={52} className="site-logo" />
        </header>
        <section className="hero">
          <div className="heroTop">
            <div>
              <p className="kicker">Jnbk جنبك</p>
              <h1>{t.title}</h1>
              <p>{t.denied}</p>
            </div>
            <a className="languageSwitch" href={`/portal?lang=${lang}`}>{t.goPortal}</a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main dir={rtl ? 'rtl' : 'ltr'} style={{ textAlign: rtl ? 'right' : 'left' }}>
      <header className="site-header">
        <Image src="/logo.png" alt="Jnbk جنبك" width={120} height={52} className="site-logo" />
        <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 8 }}>
          <button className="languageSwitch buttonReset" onClick={() => logout(lang)}>{t.back}</button>
          <a className="languageSwitch" href={`/settings?lang=${lang}`}>{rtl ? 'الإعدادات' : 'Settings'}</a>
          <a className="languageSwitch" href={`?lang=${lang === 'ar' ? 'en' : 'ar'}`}>{t.toggle}</a>
        </div>
      </header>

      <section className="hero">
        <div className="heroTop">
          <div>
            <p className="kicker">Jnbk جنبك</p>
            <h1>{t.title}</h1>
            <p>{t.sub}</p>
          </div>
        </div>
      </section>

      {/* Flash message */}
      {msg && (
        <section className="panel" style={{ paddingTop: 10, paddingBottom: 10 }}>
          <p style={{ color: msgType === 'ok' ? '#2f855a' : '#c53030', fontWeight: 700, margin: 0 }}>{msg}</p>
        </section>
      )}

      {/* City selector + stats */}
      <section className="grid settingsGrid">
        <div className="card">
          <p className="muted">{t.city}</p>
          <input
            className="input"
            defaultValue={cityId}
            placeholder={t.cityPlaceholder}
            onBlur={(e) => { if (e.target.value.trim()) setCityId(e.target.value.trim().toLowerCase()); }}
            style={{ marginTop: 8 }}
          />
        </div>
        <div className="card">
          <p className="muted">{t.total}</p>
          <strong style={{ fontSize: 32 }}>{zones.length}</strong>
        </div>
        {CATEGORIES.slice(0, 2).map((cat) => (
          <div className="card" key={cat}>
            <p className="muted">{CATEGORY_ICONS[cat]} {cat}</p>
            <strong>{categoryCounts[cat] || 0}</strong>
          </div>
        ))}
      </section>

      {/* Category breakdown */}
      <section className="panel">
        <h2 style={{ marginBottom: 12 }}>{t.filter}</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button
            className={`chip${!activeCategory ? ' chipActive' : ''}`}
            onClick={() => setActiveCategory('')}
          >
            {t.allCats} ({zones.length})
          </button>
          {CATEGORIES.filter((c) => categoryCounts[c] > 0).map((cat) => (
            <button
              key={cat}
              className={`chip${activeCategory === cat ? ' chipActive' : ''}`}
              onClick={() => setActiveCategory(activeCategory === cat ? '' : cat)}
            >
              {CATEGORY_ICONS[cat]} {cat} ({categoryCounts[cat]})
            </button>
          ))}
        </div>
      </section>

      {/* Search + Add */}
      <section className="panel">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          <input
            className="input"
            style={{ flex: 1, minWidth: 0 }}
            placeholder={t.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn" onClick={() => { setShowAdd(!showAdd); setMsg(''); }}>
            {showAdd ? t.cancel : `+ ${t.addZone}`}
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <form onSubmit={submitAdd} style={{ background: 'var(--surface)', borderRadius: 16, padding: 20, marginBottom: 16, border: '1px solid var(--glass-border-dark)' }}>
            <h3 style={{ marginBottom: 12 }}>{t.addZone}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 12 }}>
              <div>
                <label className="label">{t.nameAr}</label>
                <input className="input" value={addNameAr} onChange={(e) => setAddNameAr(e.target.value)} required dir="rtl" />
              </div>
              <div>
                <label className="label">{t.nameEn}</label>
                <input className="input" value={addNameEn} onChange={(e) => setAddNameEn(e.target.value)} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="label">{t.category}</label>
              <select className="input" value={addCategory} onChange={(e) => setAddCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn" disabled={addLoading}>{addLoading ? '...' : t.save}</button>
              <button type="button" className="btn btnGhost" onClick={() => setShowAdd(false)}>{t.cancel}</button>
            </div>
          </form>
        )}

        {/* Zone list */}
        {loading ? (
          <p className="muted">{t.loading}</p>
        ) : filtered.length === 0 ? (
          <p className="muted">{t.noResults}</p>
        ) : (
          <div className="table">
            <div className="row" style={{ fontWeight: 800, opacity: 0.6, fontSize: 13 }}>
              <span>{CATEGORY_ICONS['مرافق ومعالم']} {lang === 'ar' ? 'الفئة' : 'Category'}</span>
              <span>{lang === 'ar' ? 'الاسم' : 'Name'}</span>
              <span>{lang === 'ar' ? 'الإنجليزية' : 'English'}</span>
              <span>{lang === 'ar' ? 'إجراءات' : 'Actions'}</span>
            </div>
            {filtered.map((zone) => (
              <div key={zone.id}>
                {editId === zone.id ? (
                  <form onSubmit={submitEdit} style={{ padding: '12px 0', borderBottom: '1px solid var(--glass-border-dark)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, alignItems: 'center' }}>
                      <select className="input" value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>)}
                      </select>
                      <input className="input" value={editNameAr} onChange={(e) => setEditNameAr(e.target.value)} dir="rtl" required />
                      <input className="input" value={editNameEn} onChange={(e) => setEditNameEn(e.target.value)} />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="submit" className="btn" style={{ padding: '6px 12px', fontSize: 13 }}>{t.save}</button>
                        <button type="button" className="btn btnGhost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => setEditId(null)}>{t.cancel}</button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="row">
                    <span>{CATEGORY_ICONS[zone.category] || '📍'} {zone.category}</span>
                    <span style={{ fontWeight: 700 }}>{zone.nameAr}</span>
                    <span className="muted">{zone.nameEn}</span>
                    <span style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btnGhost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => startEdit(zone)}>{t.edit}</button>
                      <button className="btn" style={{ padding: '4px 10px', fontSize: 12, background: '#e53e3e', borderColor: '#e53e3e' }} onClick={() => handleDelete(zone.id)}>{t.delete}</button>
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <p className="muted" style={{ fontSize: 13 }}>
          {t.source}: {lang === 'ar' ? 'واجهة برمجية — /api/admin/zones?cityId=' : 'API — /api/admin/zones?cityId='}{cityId}
        </p>
      </section>
    </main>
  );
}
