import http from 'node:http';
import { pool } from './database.js';
import { createApp } from './app.js';
import {createMailer} from './mailer.js';
import {sharedReviewRepository} from './repositories/shared-review.js';
import {localStorage} from './storage/local.js';
import {reconcileSharedUploads} from './shared-upload-recovery.js';
import {purgeExpired} from './maintenance.js';
import {sendNotificationDigests} from './notifications.js';
const mailer=createMailer();
const server = http.createServer(createApp({ pool, origin: process.env.APP_ORIGIN, mailer }));
server.listen(3000, '0.0.0.0');
let cleaning=false;
const reconcile=async()=>{if(cleaning)return;cleaning=true;try{const result=await reconcileSharedUploads(sharedReviewRepository(pool),localStorage());if(result.failed)console.error('shared_upload_cleanup_failed',result.failed);}catch{console.error('shared_upload_cleanup_unavailable');}finally{cleaning=false;}};
const cleanupTimer=setInterval(reconcile,60000);cleanupTimer.unref();reconcile();
const purge=()=>purgeExpired(pool).catch(()=>console.error('maintenance_purge_failed'));
const purgeTimer=setInterval(purge,3600000);purgeTimer.unref();purge();
let mailing=false;
const digest=async()=>{if(mailing)return;mailing=true;try{await sendNotificationDigests({pool,mailer,origin:process.env.APP_ORIGIN});}catch{console.error('notification_digest_failed');}finally{mailing=false;}};
const digestTimer=setInterval(digest,60000);digestTimer.unref();
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, () => {
    clearInterval(cleanupTimer);clearInterval(purgeTimer);clearInterval(digestTimer);
    const deadline = setTimeout(() => process.exit(1), 10000);
    deadline.unref();
    server.close(async () => { mailer.close();await pool.end(); clearTimeout(deadline); });
  });
}
