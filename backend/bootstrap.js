// Generate local secrets once. Never prints or replaces existing credentials.
import { writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
const password = randomBytes(32).toString('hex');
try {
  // 'wx' creates the file only if it does not exist, in one step.
  writeFileSync('.env', `POSTGRES_USER=ronda\nPOSTGRES_DB=ronda\nPOSTGRES_PASSWORD=${password}\nDATABASE_URL=postgresql://ronda:${password}@database:5432/ronda\nAPP_ORIGIN=https://ronda.repolite.link\n`, { mode: 0o600, flag: 'wx' });
  console.log('Local backend credentials created; no secrets printed.');
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log('Existing backend credentials preserved.');
}
