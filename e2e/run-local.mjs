// pnpm e2e:local [playwright args]: disposable stack -> build -> tests -> cleanup.
import { execFileSync, spawnSync } from 'node:child_process';

const run = (cmd, args, env = {}) => spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } }).status;
const port = execFileSync(process.execPath, ['e2e/stack.mjs', 'start'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
let status = 1;
try {
  if (run('pnpm', ['build']) !== 0) throw new Error('build failed');
  status = run('pnpm', ['exec', 'playwright', 'test', ...process.argv.slice(2)], { E2E_API_PORT: port });
} finally {
  run(process.execPath, ['e2e/stack.mjs', 'stop']);
}
process.exit(status);
