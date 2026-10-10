// Generate local secrets once. Never prints or replaces existing credentials.
import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (!existsSync('.env')) {
  const password = randomBytes(32).toString('hex');
  writeFileSync('.env', `POSTGRES_USER=ronda\nPOSTGRES_DB=ronda\nPOSTGRES_PASSWORD=${password}\nDATABASE_URL=postgresql://ronda:${password}@database:5432/ronda\nAPP_ORIGIN=https://ronda.repolite.link\n`, { mode: 0o600, flag: 'wx' });
  console.log('Local backend credentials created; no secrets printed.');
} else console.log('Existing backend credentials preserved.');
