'use client';

import { FormEvent, useMemo, useState } from 'react';

type Lang = 'ar' | 'en';
type SubmitState = { type: 'idle' | 'success' | 'error'; message: string };

const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

const copy = {
  ar: {
    title: 'إعدادات المطور',
    subtitle: 'مركز تنظيم التوسعة وإدارة المدن والمركبات وربط التشغيل الحقيقي لتطبيق Jnbk جنبك.',
    back: 'العودة للوحة الإدارة',
    toggle: 'English',
    apiStatus: 'حالة الربط',
    connected: 'رابط API مضبوط',
    notConnected: 'لم يتم ضبط رابط API بعد',
    cityTitle: 'إضافة مدينة أو منطقة تغطية',
    cityHint: 'استخدم هذه الاستمارة لإضافة أي مدينة داخل أو خارج السودان مع مناطق الانطلاق والوصول.',
    cityId: 'معرف المدينة بالإنجليزية الصغيرة مثل rufaa أو dammam',
    countryId: 'رمز الدولة مثل sd أو sa',
    cityAr: 'اسم المدينة بالعربية',
    cityEn: 'اسم المدينة بالإنجليزية',
    zonesAr: 'المناطق بالعربية مفصولة بفواصل',
    zonesEn: 'Zones in English separated by commas',
    vehicleTitle: 'إضافة نوع مركبة أو خدمة',
    vehicleHint: 'أضف ركشة أو سيارة أو فان أو أي خدمة نقل جديدة مع التسعير.',
    vehicleId: 'معرف الخدمة مثل rickshaw أو car_plus',
    vehicleAr: 'اسم الخدمة بالعربية',
    vehicleEn: 'اسم الخدمة بالإنجليزية',
    baseFare: 'سعر فتح الرحلة',
    perKmFare: 'سعر الكيلومتر',
    minimumFare: 'الحد الأدنى',
    submitCity: 'حفظ المدينة',
    submitVehicle: 'حفظ المركبة',
    workflow: 'تنظيم عمل المطور',
    env: 'متغيرات البيئة المطلوبة',
    endpoints: 'واجهات API المهمة',
    checklist: 'قائمة مراجعة قبل الإطلاق',
    saveSuccess: 'تم الحفظ بنجاح.',
    saveError: 'تعذر الحفظ. تأكد من رابط API وتشغيل الخادم.',
    required: 'أكمل الحقول المطلوبة أولًا.'
  },
  en: {
    title: 'Developer Settings',
    subtitle: 'Expansion control center for cities, service coverage, vehicles, pricing, and production readiness for Jnbk جنبك.',
    back: 'Back to dashboard',
    toggle: 'العربية',
    apiStatus: 'Connection status',
    connected: 'API URL configured',
    notConnected: 'API URL is not configured yet',
    cityTitle: 'Add city or coverage area',
    cityHint: 'Use this form to add any city inside or outside Sudan with pickup and destination zones.',
    cityId: 'City ID lowercase, e.g. rufaa or dammam',
    countryId: 'Country code, e.g. sd or sa',
    cityAr: 'City name in Arabic',
    cityEn: 'City name in English',
    zonesAr: 'Arabic zones separated by commas',
    zonesEn: 'English zones separated by commas',
    vehicleTitle: 'Add vehicle or service type',
    vehicleHint: 'Add rickshaw, car, van, or any transport service with pricing.',
    vehicleId: 'Service ID, e.g. rickshaw or car_plus',
    vehicleAr: 'Service name in Arabic',
    vehicleEn: 'Service name in English',
    baseFare: 'Base fare',
    perKmFare: 'Per km fare',
    minimumFare: 'Minimum fare',
    submitCity: 'Save city',
    submitVehicle: 'Save vehicle',
    workflow: 'Developer workflow',
    env: 'Required environment variables',
    endpoints: 'Key API endpoints',
    checklist: 'Pre-launch checklist',
    saveSuccess: 'Saved successfully.',
    saveError: 'Could not save. Check API URL and backend status.',
    required: 'Complete required fields first.'
  }
};

function splitList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

async function postJson(path: string, body: unknown) {
  if (!apiUrl) throw new Error('API URL missing');
  const response = await fetch(`${apiUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error('Request failed');
  return response.json();
}

export default function DeveloperSettings({ searchParams }: { searchParams?: { lang?: string } }) {
  const initialLang: Lang = searchParams?.lang === 'en' ? 'en' : 'ar';
  const [lang, setLang] = useState<Lang>(initialLang);
  const [state, setState] = useState<SubmitState>({ type: 'idle', message: '' });
  const t = copy[lang];
  const rtl = lang === 'ar';
  const status = useMemo(() => apiUrl ? t.connected : t.notConnected, [t]);

  async function submitCity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      id: String(form.get('id') || '').trim().toLowerCase(),
      countryId: String(form.get('countryId') || 'sd').trim().toLowerCase(),
      nameAr: String(form.get('nameAr') || '').trim(),
      nameEn: String(form.get('nameEn') || '').trim(),
      zonesAr: splitList(String(form.get('zonesAr') || '')),
      zonesEn: splitList(String(form.get('zonesEn') || ''))
    };
    if (!payload.id || !payload.nameAr || !payload.nameEn) return setState({ type: 'error', message: t.required });
    try {
      await postJson('/api/admin/cities', payload);
      setState({ type: 'success', message: t.saveSuccess });
      event.currentTarget.reset();
    } catch {
      setState({ type: 'error', message: t.saveError });
    }
  }

  async function submitVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      id: String(form.get('id') || '').trim().toLowerCase(),
      nameAr: String(form.get('nameAr') || '').trim(),
      nameEn: String(form.get('nameEn') || '').trim(),
      baseFare: Number(form.get('baseFare') || 0),
      perKmFare: Number(form.get('perKmFare') || 0),
      minimumFare: Number(form.get('minimumFare') || 0)
    };
    if (!payload.id || !payload.nameAr || !payload.nameEn || !payload.baseFare || !payload.perKmFare || !payload.minimumFare) return setState({ type: 'error', message: t.required });
    try {
      await postJson('/api/admin/vehicle-types', payload);
      setState({ type: 'success', message: t.saveSuccess });
      event.currentTarget.reset();
    } catch {
      setState({ type: 'error', message: t.saveError });
    }
  }

  return (
    <main dir={rtl ? 'rtl' : 'ltr'} style={{ textAlign: rtl ? 'right' : 'left' }}>
      <section className='hero'>
        <div className='heroTop'>
          <div>
            <p className='kicker'>Jnbk جنبك</p>
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
          </div>
          <div className='topActions'>
            <a className='languageSwitch' href='/'>{t.back}</a>
            <button className='languageSwitch buttonReset' onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>{t.toggle}</button>
          </div>
        </div>
      </section>

      <section className='grid settingsGrid'>
        <div className='card'><p>{t.apiStatus}</p><strong className={apiUrl ? 'status-online' : 'status-pending'}>{status}</strong></div>
        <div className='card'><p>API</p><strong>{apiUrl ? 'Ready' : 'Fallback'}</strong></div>
        <div className='card'><p>Coverage</p><strong>Multi-city</strong></div>
        <div className='card'><p>Services</p><strong>Vehicles</strong></div>
      </section>

      {state.message ? <div className={`notice ${state.type}`}>{state.message}</div> : null}

      <section className='panel'>
        <h2>{t.cityTitle}</h2>
        <p className='muted'>{t.cityHint}</p>
        <form className='formGrid' onSubmit={submitCity}>
          <input name='id' placeholder={t.cityId} />
          <input name='countryId' placeholder={t.countryId} defaultValue='sd' />
          <input name='nameAr' placeholder={t.cityAr} />
          <input name='nameEn' placeholder={t.cityEn} />
          <textarea name='zonesAr' placeholder={t.zonesAr} />
          <textarea name='zonesEn' placeholder={t.zonesEn} />
          <button className='primaryAction' type='submit'>{t.submitCity}</button>
        </form>
      </section>

      <section className='panel'>
        <h2>{t.vehicleTitle}</h2>
        <p className='muted'>{t.vehicleHint}</p>
        <form className='formGrid' onSubmit={submitVehicle}>
          <input name='id' placeholder={t.vehicleId} />
          <input name='nameAr' placeholder={t.vehicleAr} />
          <input name='nameEn' placeholder={t.vehicleEn} />
          <input name='baseFare' type='number' placeholder={t.baseFare} />
          <input name='perKmFare' type='number' placeholder={t.perKmFare} />
          <input name='minimumFare' type='number' placeholder={t.minimumFare} />
          <button className='primaryAction' type='submit'>{t.submitVehicle}</button>
        </form>
      </section>

      <section className='grid devGrid'>
        <div className='panel'><h2>{t.workflow}</h2><ol><li>Define city and zones.</li><li>Add vehicle/service pricing.</li><li>Test passenger flow.</li><li>Register drivers.</li><li>Review support requests.</li><li>Publish APK preview.</li></ol></div>
        <div className='panel'><h2>{t.env}</h2><code>DATABASE_URL</code><code>JWT_SECRET</code><code>NEXT_PUBLIC_API_URL</code><code>EXPO_PUBLIC_API_URL</code></div>
        <div className='panel'><h2>{t.endpoints}</h2><code>POST /api/admin/cities</code><code>POST /api/admin/vehicle-types</code><code>GET /api/config</code><code>GET /api/support</code></div>
        <div className='panel'><h2>{t.checklist}</h2><ol><li>Railway backend is healthy.</li><li>Vercel API URL updated.</li><li>Expo API URL updated.</li><li>Seed data reviewed.</li><li>Support flow tested.</li></ol></div>
      </section>
    </main>
  );
}
