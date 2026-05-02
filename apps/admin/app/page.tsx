type AppConfig = {
  countries: Array<{ id: string; nameEn: string; currency: string }>;
  cities: Array<{ id: string; countryId: string; nameEn: string; zones?: unknown[]; zonesEn?: string[] }>;
  vehicleTypes: Array<{ id: string; nameEn: string; baseFare: number; perKmFare: number; minimumFare: number }>;
};

type Driver = { id: string; name: string; online?: boolean; verified?: boolean; cityId?: string };
type Ride = { id: string; status: string; estimatedFare: number; cityId?: string; vehicleTypeId?: string; createdAt?: string };
type SupportRequest = { id: string; category: string; message: string; lang?: string; status: string; createdAt?: string };

const fallbackConfig: AppConfig = {
  countries: [
    { id: 'sd', nameEn: 'Sudan', currency: 'SDG' },
    { id: 'sa', nameEn: 'Saudi Arabia', currency: 'SAR' }
  ],
  cities: [
    { id: 'rufaa', countryId: 'sd', nameEn: 'Rufaa', zonesEn: ['Market', 'Hospital', 'Station', 'Schools', 'Residential', 'University'] },
    { id: 'khartoum', countryId: 'sd', nameEn: 'Khartoum', zonesEn: ['Khartoum', 'Bahri', 'Omdurman', 'Arab Market', 'Airport'] },
    { id: 'dammam', countryId: 'sa', nameEn: 'Dammam', zonesEn: ['Central Dammam', 'Corniche', 'Al Shati', 'Al Faisaliyah', 'Airport'] }
  ],
  vehicleTypes: [
    { id: 'rickshaw', nameEn: 'Rickshaw', baseFare: 500, perKmFare: 300, minimumFare: 1000 },
    { id: 'car', nameEn: 'Car', baseFare: 900, perKmFare: 550, minimumFare: 1800 },
    { id: 'van', nameEn: 'Van', baseFare: 1200, perKmFare: 700, minimumFare: 2500 }
  ]
};

const fallbackDrivers: Driver[] = [
  { id: 'driver_1', name: 'Mohammed Ahmed', online: true, verified: true, cityId: 'rufaa' },
  { id: 'driver_2', name: 'Ali Altayeb', online: true, verified: true, cityId: 'rufaa' }
];

const fallbackSupport: SupportRequest[] = [
  { id: 'support_preview_1', category: 'Request new city', message: 'Preview item: customer support requests will appear here after backend connection.', lang: 'en', status: 'OPEN' }
];

async function apiGet<T>(path: string, fallback: T): Promise<T> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return fallback;

  try {
    const response = await fetch(`${apiUrl}${path}`, { cache: 'no-store' });
    if (!response.ok) return fallback;
    return response.json();
  } catch {
    return fallback;
  }
}

function countryName(config: AppConfig, countryId: string) {
  return config.countries.find((country) => country.id === countryId)?.nameEn || countryId.toUpperCase();
}

function zoneCount(city: AppConfig['cities'][number]) {
  return city.zones?.length || city.zonesEn?.length || 0;
}

function shortMessage(message: string) {
  return message.length > 74 ? `${message.slice(0, 74)}...` : message;
}

export default async function Dashboard() {
  const config = await apiGet<AppConfig>('/api/config', fallbackConfig);
  const drivers = await apiGet<Driver[]>('/api/drivers', fallbackDrivers);
  const rides = await apiGet<Ride[]>('/api/rides', []);
  const supportRequests = await apiGet<SupportRequest[]>('/api/support', fallbackSupport);

  const activeDrivers = drivers.filter((driver) => driver.online).length;
  const completedRides = rides.filter((ride) => ride.status === 'COMPLETED').length;
  const openSupport = supportRequests.filter((item) => item.status === 'OPEN' || item.status === 'IN_REVIEW').length;
  const totalRevenue = rides.reduce((sum, ride) => sum + Number(ride.estimatedFare || 0), 0);

  const metrics = [
    ['Trips total', String(rides.length)],
    ['Active drivers', String(activeDrivers)],
    ['Support open', String(openSupport)],
    ['Cities', String(config.cities.length)]
  ];

  return (
    <main>
      <section className='hero'>
        <p className='kicker'>JUMBAK CONTROL CENTER</p>
        <h1>Operations Dashboard</h1>
        <p>Live-ready admin view for cities, services, drivers, rides, support requests, and pricing.</p>
      </section>

      <section className='grid'>
        {metrics.map(([label, value]) => (
          <div className='card' key={label}>
            <p>{label}</p>
            <strong>{value}</strong>
          </div>
        ))}
      </section>

      <section className='panel'>
        <h2>Operations summary</h2>
        <div className='table'>
          <div className='row'>
            <span>Completed rides</span>
            <span>{completedRides}</span>
            <span>Total estimated revenue</span>
            <b>{totalRevenue} SDG</b>
          </div>
        </div>
      </section>

      <section className='panel'>
        <h2>Support requests</h2>
        <div className='table'>
          {supportRequests.length === 0 ? (
            <div className='empty'>No support requests yet.</div>
          ) : supportRequests.slice(0, 8).map((item) => (
            <div className='row' key={item.id}>
              <span>{item.category}</span>
              <span>{shortMessage(item.message)}</span>
              <span>{item.lang || 'ar'}</span>
              <b>{item.status}</b>
            </div>
          ))}
        </div>
      </section>

      <section className='panel'>
        <h2>Cities and launch areas</h2>
        <div className='table'>
          {config.cities.map((city) => (
            <div className='row' key={city.id}>
              <span>{city.nameEn}</span>
              <span>{countryName(config, city.countryId)}</span>
              <span>{zoneCount(city)} zones</span>
              <b>Ready</b>
            </div>
          ))}
        </div>
      </section>

      <section className='panel'>
        <h2>Vehicle types and pricing</h2>
        <div className='table'>
          {config.vehicleTypes.map((item) => (
            <div className='row' key={item.id}>
              <span>{item.nameEn}</span>
              <span>Base {item.baseFare}</span>
              <span>{item.perKmFare} / km</span>
              <b>{item.minimumFare} min</b>
            </div>
          ))}
        </div>
      </section>

      <section className='panel'>
        <h2>Drivers</h2>
        <div className='table'>
          {drivers.slice(0, 8).map((driver) => (
            <div className='row' key={driver.id}>
              <span>{driver.name}</span>
              <span>{driver.cityId || 'city'}</span>
              <span>{driver.verified ? 'Verified' : 'Pending'}</span>
              <b>{driver.online ? 'Online' : 'Offline'}</b>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
