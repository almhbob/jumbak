const requiredBackend = ['DATABASE_URL', 'JWT_SECRET'];
const requiredAdmin = ['NEXT_PUBLIC_API_URL'];
const requiredMobile = ['EXPO_PUBLIC_API_URL'];

function checkGroup(title, keys) {
  console.log(`\n${title}`);
  let ok = true;
  for (const key of keys) {
    const hasValue = Boolean(process.env[key]);
    console.log(`${hasValue ? '✅' : '❌'} ${key}`);
    if (!hasValue) ok = false;
  }
  return ok;
}

console.log('Jnbk | جنبك production readiness check');
const backendOk = checkGroup('Backend', requiredBackend);
const adminOk = checkGroup('Admin dashboard', requiredAdmin);
const mobileOk = checkGroup('Mobile app', requiredMobile);

console.log('\nSummary');
console.log(`Backend: ${backendOk ? 'ready' : 'missing values'}`);
console.log(`Admin: ${adminOk ? 'ready' : 'missing values'}`);
console.log(`Mobile: ${mobileOk ? 'ready' : 'missing values'}`);

if (!backendOk || !adminOk || !mobileOk) {
  console.log('\nAdd the missing values in Railway, Vercel, and EAS before production launch.');
  process.exit(1);
}

console.log('\nAll required production variables are present.');
