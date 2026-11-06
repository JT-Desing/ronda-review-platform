// Disposable stack for local E2E runs: its own network, PostgreSQL and API
// containers, all labelled ronda.e2e. It never reads backend/.env and never
// touches the production containers or volumes that live on this machine.
// CI does not use this file: there the tests run against the compose stack.
//   node e2e/stack.mjs start   -> prints the API port, writes e2e/.stack.json
//   node e2e/stack.mjs stop    -> removes only containers/network it created
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const STATE = fileURLToPath(new URL('./.stack.json', import.meta.url));
const BACKEND = fileURLToPath(new URL('../backend/', import.meta.url));
const LABEL = 'ronda.e2e=1';
const APP_ORIGIN = process.env.E2E_APP_ORIGIN || 'http://localhost:4173';
const READY_TIMEOUT_MS = 90_000;

const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const quiet = (...args) => { try { docker(...args); } catch { /* already gone */ } };

async function waitForApi(name, port) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try { if ((await fetch(`http://127.0.0.1:${port}/api/health`)).ok) return; } catch { /* not up yet */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`E2E API not healthy after ${READY_TIMEOUT_MS / 1000}s:\n${docker('logs', '--tail', '50', `${name}-api`)}`);
}

// No exists-then-act checks: read and handle ENOENT, so there is no race window.
function readState() {
  try { return JSON.parse(readFileSync(STATE, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function start() {
  stop();
  const id = randomBytes(4).toString('hex');
  const name = `ronda-e2e-${id}`;
  const password = randomBytes(18).toString('hex');
  writeFileSync(STATE, JSON.stringify({ name }), { mode: 0o600 });
  docker('network', 'create', '--label', LABEL, name);
  docker('run', '-d', '--name', `${name}-db`, '--label', LABEL, '--network', name, '--network-alias', 'database',
    '-e', 'POSTGRES_USER=ronda', '-e', 'POSTGRES_DB=ronda', '-e', `POSTGRES_PASSWORD=${password}`, 'postgres:17-alpine');
  docker('build', '-q', '-t', 'ronda-api:e2e', BACKEND);
  // The API runs migrate.js on start and retries while PostgreSQL boots.
  docker('run', '-d', '--name', `${name}-api`, '--label', LABEL, '--network', name, '--network-alias', 'api',
    '-e', `DATABASE_URL=postgres://ronda:${password}@database:5432/ronda`, '-e', `APP_ORIGIN=${APP_ORIGIN}`,
    '-p', '127.0.0.1::3000', 'ronda-api:e2e');
  const port = docker('port', `${name}-api`, '3000/tcp').split(':').at(-1);
  writeFileSync(STATE, JSON.stringify({ name, port }), { mode: 0o600 });
  await waitForApi(name, port);
  process.stdout.write(`${port}\n`);
}

function stop() {
  const state = readState();
  if (!state) return;
  const { name } = state;
  if (!/^ronda-e2e-[0-9a-f]{8}$/.test(name)) throw new Error('Refusing to remove a non-E2E stack');
  for (const suffix of ['-api', '-db']) {
    const label = (() => { try { return docker('inspect', '--format', '{{index .Config.Labels "ronda.e2e"}}', name + suffix); } catch { return ''; } })();
    if (label === '1') quiet('rm', '-f', '-v', name + suffix);
  }
  quiet('network', 'rm', name);
  rmSync(STATE, { force: true });
}

const command = process.argv[2];
if (command === 'start') await start().catch(error => { stop(); throw error; });
else if (command === 'stop') stop();
else { console.error('Usage: node e2e/stack.mjs start|stop'); process.exit(2); }
