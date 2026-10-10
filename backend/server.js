import http from 'node:http';
import { pool } from './database.js';
import { createApp } from './app.js';
import {createMailer} from './mailer.js';
const mailer=createMailer();
const server = http.createServer(createApp({ pool, origin: process.env.APP_ORIGIN, mailer }));
server.listen(3000, '0.0.0.0');
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, () => {
    const deadline = setTimeout(() => process.exit(1), 10000);
    deadline.unref();
    server.close(async () => { mailer.close();await pool.end(); clearTimeout(deadline); });
  });
}
