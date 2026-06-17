'use client';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { apiGet, apiPost, apiPatch, apiDelete } from '../lib/apiClient';

type Lang = 'ar' | 'en';
type Zone = { id: string; nameAr: string; nameEn: string; category: string; cityId: string; fixedFare?: number | null };

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
    title: 'إدارة المناطق والأسعار',
    sub: 'عرض وتعديل مناطق المدينة وأسعار المشوار الثابتة. السعر المحدد هنا يظهر مباشرة في التطبيق.',
    back: 'خروج', home: 'الرئيسية', operations: 'التشغيل', pricing: 'التسعير',
    toggle: 'English', denied: 'هذه الصفحة مخصصة لحسابات المطور والتشغيل فقط.', goPortal: 'فتح البوابة',
    city: 'المدينة', cityPlaceholder: 'rufaa', search: 'بحث في المناطق...', filter: 'تصفية حسب الفئة', allCats: 'جميع الفئات',
    addZone: 'إضافة منطقة جديدة', nameAr: 'الاسم بالعربية', nameEn: 'الاسم بالإنجليزية', category: 'الفئة',
    save: 'حفظ', cancel: 'إلغاء', edit: 'تعديل', delete: 'حذف', deleteConfirm: 'هل تريد حذف هذه المنطقة؟ لا يمكن التراجع.',
    total: 'إجمالي المناطق', loading: 'جاري التحميل...', noResults: 'لا توجد نتائج', success: 'تم الحفظ بنجاح.', deleteSuccess: 'تم الحذف.',
    fail: 'تعذرت العملية. تحقق من الاتصال بالخادم.', required: 'الاسم بالعربية مطلوب.', source: 'مصدر البيانات',
    fixedFare: 'سعر المشوار', noFare: 'بدون سعر ثابت', clearFare: 'إلغاء السعر', priced: 'بسعر ثابت', categories: 'الفئات', results: 'النتائج',
    cityHint: 'اكتب معرف المدينة ثم اخرج من الحقل للتحديث', actions: 'الإجراءات',
  },
  en: {
    title: 'Zone Management & Pricing',
    sub: 'View and edit city zones with fixed fares. Prices set here appear directly in the app.',
    back: 'Logout', home: 'Home', operations: 'Operations', pricing: 'Pricing',
    toggle: 'العربية', denied: 'This page is only for developer and operations accounts.', goPortal: 'Open portal',
    city: 'City', cityPlaceholder: 'rufaa', search: 'Search zones...', filter: 'Filter by category', allCats: 'All categories',
    addZone: 'Add new zone', nameAr: 'Arabic name', nameEn: 'English name', category: 'Category',
    save: 'Save', cancel: 'Cancel', edit: 'Edit', delete: 'Delete', deleteConfirm: 'Delete this zone? This cannot be undone.',
    total: 'Total zones', loading: 'Loading...', noResults: 'No results', success: 'Saved successfully.', deleteSuccess: 'Deleted.',
    fail: 'Operation failed. Check server connection.', required: 'Arabic name is required.', source: 'Data source',
    fixedFare: 'Fixed fare', noFare: 'No fixed fare', clearFare: 'Clear fare', priced: 'Priced', categories: 'Categories', results: 'Results',
    cityHint: 'Type the city ID then leave the field to refresh', actions: 'Actions',
  },
};

function logout(lang: Lang) { sessionStorage.clear(); window.location.href = `/portal?lang=${lang}`; }
function fareLabel(fare: number | null | undefined, lang: Lang, noFare: string) {
  if (fare == null) return noFare;
  return `${fare.toLocaleString('en')} ${lang === 'ar' ? 'ج' : 'SDG'}`;
}

export default function Zones() {
  const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
  const lang: Lang = params.get('lang') === 'en' ? 'en' : 'ar';
  const t = copy[lang];
  const rtl = lang === 'ar';

  const [allowed, setAllowed] = useState(false);
  const [cityId, setCityId] = useState('rufaa');
  const [zones, setZones] = useState<Zone[]>([]);
  const [categories, setCategories] = useState<string[]>(CATEGORIES);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok');

  const [showAdd, setShowAdd] = useState(false);
  const [addNameAr, setAddNameAr] = useState('');
  const [addNameEn, setAddNameEn] = useState('');
  const [addCategory, setAddCategory] = useState(CATEGORIES[0]);
  const [addFixedFare, setAddFixedFare] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editNameAr, setEditNameAr] = useState('');
  const [editNameEn, setEditNameEn] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editFixedFare, setEditFixedFare] = useState<string>('');

  useEffect(() => {
    const role = sessionStorage.getItem('jnbk_active_role') || '';
    const ok = role === 'developer' || role === 'business' ||
      (sessionStorage.getItem('jnbk_operations_auth') === 'true' && ['operations', 'supervisor'].includes(role));
    setAllowed(ok);
  }, []);

  useEffect(() => {
    if (!allowed) return;
    fetchZones();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, cityId]);

  async function fetchZones() {
    setLoading(true);
    const data = await apiGet<{ zones: Zone[]; categories: string[] }>(
      `/api/admin/zones?cityId=${cityId}`,
      { zones: [], categories: [] }
    );
    setZones(data.zones || []);
    if (data.categories && data.categories.length > 0) {
      setCategories(data.categories);
      setAddCategory((prev) => data.categories.includes(prev) ? prev : data.categories[0]);
    }
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
        fixedFare: addFixedFare.trim() === '' ? null : Number(addFixedFare),
      });
      flash(t.success, 'ok');
      setShowAdd(false);
      setAddNameAr(''); setAddNameEn(''); setAddCategory(CATEGORIES[0]); setAddFixedFare('');
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
    setEditCategory(zone.category || categories[0]);
    setEditFixedFare(zone.fixedFare != null ? String(zone.fixedFare) : '');
  }

  async function saveZone(fixedFareOverride?: number | null) {
    if (!editId || !editNameAr.trim()) return flash(t.required, 'err');
    const fixedFare = fixedFareOverride !== undefined ? fixedFareOverride : (editFixedFare.trim() === '' ? null : Number(editFixedFare));
    try {
      await apiPatch(`/api/admin/zones/${editId}`, {
        nameAr: editNameAr.trim(),
        nameEn: editNameEn.trim() || editNameAr.trim(),
        category: editCategory,
        fixedFare,
      });
      flash(t.success, 'ok');
      setEditId(null);
      await fetchZones();
    } catch {
      flash(t.fail, 'err');
    }
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault();
    await saveZone();
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

  const categoryCounts = categories.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = zones.filter((z) => z.category === cat).length;
    return acc;
  }, {});

  const stats = useMemo(() => {
    const priced = zones.filter((z) => z.fixedFare != null).length;
    const activeCats = categories.filter((cat) => categoryCounts[cat] > 0).length;
    return { total: zones.length, priced, activeCats, results: filtered.length };
  }, [zones, categories, filtered.length, categoryCounts]);

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
        <div className="adminToolbar" style={{ marginInlineStart: 'auto' }}>
          <button className="languageSwitch buttonReset" onClick={() => logout(lang)}>{t.back}</button>
          <a className="languageSwitch" href={`/?lang=${lang}`}>{t.home}</a>
          <a className="languageSwitch" href={`/operations?lang=${lang}`}>{t.operations}</a>
          <a className="languageSwitch" href={`/pricing?lang=${lang}`}>{t.pricing}</a>
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

      {msg && <div className={`notice ${msgType === 'ok' ? 'success' : 'error'}`} style={{ margin: '12px 0' }}>{msg}</div>}

      <section className="adminStatGrid">
        <div className="card"><p>{t.city}</p><strong>{cityId}</strong></div>
        <div className="card"><p>{t.total}</p><strong>{stats.total}</strong></div>
        <div className="card"><p>{t.priced}</p><strong style={{ background: 'none', WebkitTextFillColor: '#10b981', color: '#10b981' }}>{stats.priced}</strong></div>
        <div className="card"><p>{t.categories}</p><strong>{stats.activeCats}</strong></div>
      </section>

      <section className="panel">
        <div className="adminSectionHeader" style={{ marginTop: 0 }}>
          <div>
            <h2>{t.filter}</h2>
            <p className="muted" style={{ margin: 0 }}>{t.cityHint}</p>
          </div>
          <span className="adminBadge adminBadgeMuted">{stats.results} {t.results}</span>
        </div>
        <div className="zoneToolbar">
          <label className="label">{t.city}
            <input className="input" defaultValue={cityId} placeholder={t.cityPlaceholder} onBlur={(e) => { if (e.target.value.trim()) setCityId(e.target.value.trim().toLowerCase()); }} />
          </label>
          <label className="label">{t.search}
            <input className="input" placeholder={t.search} value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <button className="btn" onClick={() => { setShowAdd(!showAdd); setMsg(''); }}>{showAdd ? t.cancel : `+ ${t.addZone}`}</button>
        </div>
      </section>

      <section className="panel">
        <div className="adminSectionHeader" style={{ marginTop: 0 }}>
          <h2>{t.category}</h2>
        </div>
        <div className="zoneCategoryGrid">
          <button className={`chip${!activeCategory ? ' chipActive' : ''}`} onClick={() => setActiveCategory('')}>
            {t.allCats} ({zones.length})
          </button>
          {categories.filter((c) => categoryCounts[c] > 0).map((cat) => (
            <button key={cat} className={`chip${activeCategory === cat ? ' chipActive' : ''}`} onClick={() => setActiveCategory(activeCategory === cat ? '' : cat)}>
              {CATEGORY_ICONS[cat] || '📍'} {cat} ({categoryCounts[cat]})
            </button>
          ))}
        </div>
      </section>

      {showAdd && (
        <section className="panel">
          <div className="adminSectionHeader" style={{ marginTop: 0 }}>
            <h2>{t.addZone}</h2>
          </div>
          <form onSubmit={submitAdd} className="zoneAddGrid">
            <label className="label">{t.nameAr}<input className="input" value={addNameAr} onChange={(e) => setAddNameAr(e.target.value)} required dir="rtl" /></label>
            <label className="label">{t.nameEn}<input className="input" value={addNameEn} onChange={(e) => setAddNameEn(e.target.value)} /></label>
            <label className="label">{t.category}<select className="input" value={addCategory} onChange={(e) => setAddCategory(e.target.value)}>{categories.map((c) => <option key={c} value={c}>{CATEGORY_ICONS[c] || '📍'} {c}</option>)}</select></label>
            <label className="label">{t.fixedFare}<input className="input" type="number" min="0" step="500" placeholder={t.noFare} value={addFixedFare} onChange={(e) => setAddFixedFare(e.target.value)} /></label>
            <div className="pricingActions">
              <button type="submit" className="adminMiniButton adminMiniButtonSuccess" disabled={addLoading}>{addLoading ? '...' : t.save}</button>
              <button type="button" className="adminMiniButton adminMiniButtonMuted" onClick={() => setShowAdd(false)}>{t.cancel}</button>
            </div>
          </form>
        </section>
      )}

      <section className="panel">
        <div className="adminSectionHeader" style={{ marginTop: 0 }}>
          <h2>{t.title}</h2>
          <span className="adminBadge adminBadgeMuted">{t.source}: /api/admin/zones?cityId={cityId}</span>
        </div>

        {loading ? (
          <p className="muted">{t.loading}</p>
        ) : filtered.length === 0 ? (
          <p className="muted">{t.noResults}</p>
        ) : (
          <div className="zoneList">
            {filtered.map((zone) => (
              <div key={zone.id}>
                {editId === zone.id ? (
                  <form onSubmit={submitEdit} className="zoneEditGrid">
                    <label className="label">{t.nameAr}<input className="input" value={editNameAr} onChange={(e) => setEditNameAr(e.target.value)} dir="rtl" required /></label>
                    <label className="label">{t.nameEn}<input className="input" value={editNameEn} onChange={(e) => setEditNameEn(e.target.value)} /></label>
                    <label className="label">{t.category}<select className="input" value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>{categories.map((c) => <option key={c} value={c}>{CATEGORY_ICONS[c] || '📍'} {c}</option>)}</select></label>
                    <label className="label">{t.fixedFare}<input className="input" type="number" min="0" step="500" placeholder={t.noFare} value={editFixedFare} onChange={(e) => setEditFixedFare(e.target.value)} /></label>
                    <div className="pricingActions">
                      <button type="submit" className="adminMiniButton adminMiniButtonSuccess">{t.save}</button>
                      <button type="button" className="adminMiniButton adminMiniButtonWarn" onClick={() => saveZone(null)}>{t.clearFare}</button>
                      <button type="button" className="adminMiniButton adminMiniButtonMuted" onClick={() => setEditId(null)}>{t.cancel}</button>
                    </div>
                  </form>
                ) : (
                  <div className="zoneCard">
                    <div className="zoneName">
                      <strong>{zone.nameAr}</strong>
                      <span className="adminInfoMuted">{zone.nameEn || zone.nameAr}</span>
                    </div>
                    <span className="adminBadge">{CATEGORY_ICONS[zone.category] || '📍'} {zone.category}</span>
                    <span className={zone.fixedFare != null ? 'zoneFare' : 'zoneFare zoneFareEmpty'}>{fareLabel(zone.fixedFare, lang, t.noFare)}</span>
                    <span className="pricingActions">
                      <button className="adminMiniButton adminMiniButtonSuccess" onClick={() => startEdit(zone)}>{t.edit}</button>
                      <button className="adminMiniButton adminMiniButtonWarn" onClick={() => handleDelete(zone.id)}>{t.delete}</button>
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
