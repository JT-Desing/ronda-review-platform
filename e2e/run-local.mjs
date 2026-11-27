// pnpm e2e:local [playwright args]: disposable stack -> build -> tests -> cleanup.
import { execFileSync, spawnSync } from 'node:child_process';

const run = (cmd, args, env = {}) => spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } }).status;
// When invoked from pnpm on Windows, call its JS entry point through Node;
// spawnSync cannot reliably launch the pnpm.cmd shim without a shell.
const packageManager = process.env.npm_execpath
  ? { command: process.execPath, args: [process.env.npm_execpath] }
  : { command: 'pnpm', args: [] };
const port = execFileSync(process.execPath, ['e2e/stack.mjs', 'start'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
let status = 1;
try {
  if (run(packageManager.command, [...packageManager.args, 'build']) !== 0) throw new Error('build failed');
  status = run(packageManager.command, [...packageManager.args, 'exec', 'playwright', 'test', ...process.argv.slice(2)], { E2E_API_PORT: port });
} finally {
  run(process.execPath, ['e2e/stack.mjs', 'stop']);
}
process.exit(status);
