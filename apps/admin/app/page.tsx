const metrics = [
  ['Trips today', '24'],
  ['Active drivers', '12'],
  ['Cities', '3'],
  ['Vehicle types', '3']
];

const cities = [
  ['Rufaa', 'Sudan', '6 zones', 'Active'],
  ['Khartoum', 'Sudan', '5 zones', 'Ready'],
  ['Dammam', 'Saudi Arabia', '5 zones', 'Ready']
];

const vehicleTypes = [
  ['Rickshaw', '500', '300 / km', '1000 min'],
  ['Car', '900', '550 / km', '1800 min'],
  ['Van', '1200', '700 / km', '2500 min']
];

export default function Dashboard() {
  return (
    <main>
      <section className='hero'>
        <p className='kicker'>JUMBAK CONTROL CENTER</p>
        <h1>Operations Dashboard</h1>
        <p>Manage cities, service types, drivers, rides, and pricing from one place.</p>
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
        <h2>Cities and launch areas</h2>
        <div className='table'>
          {cities.map((row) => (
            <div className='row' key={row[0]}>
              <span>{row[0]}</span>
              <span>{row[1]}</span>
              <span>{row[2]}</span>
              <b>{row[3]}</b>
            </div>
          ))}
        </div>
      </section>

      <section className='panel'>
        <h2>Vehicle types and pricing</h2>
        <div className='table'>
          {vehicleTypes.map((row) => (
            <div className='row' key={row[0]}>
              <span>{row[0]}</span>
              <span>Base {row[1]}</span>
              <span>{row[2]}</span>
              <b>{row[3]}</b>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
