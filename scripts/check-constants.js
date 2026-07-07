// Fails if the admin email literal appears in tracked code outside the
// allowed config locations.
const { execSync } = require('child_process');
const { readFileSync } = require('fs');
const { ADMIN_EMAIL } = require('../api/_lib/config');

const ALLOWED = new Set(['src/config.js', 'api/_lib/config.js', 'firestore.rules']);
const files = execSync(
  'git ls-files src api scripts public .github firestore.rules vercel.json package.json',
  { encoding: 'utf8' }
)
  .split('\n')
  .filter(Boolean);

const violations = files.filter((file) => (
  !ALLOWED.has(file) && readFileSync(file, 'utf8').includes(ADMIN_EMAIL)
));

if (violations.length) {
  console.error('Admin email literal found outside allowed config locations:');
  violations.forEach((file) => console.error(`  ${file}`));
  process.exit(1);
}

console.log('check:constants OK - admin email only in allowed locations.');
