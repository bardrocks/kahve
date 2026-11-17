import {getDatabase} from '@netlify/database';
import {getStore} from '@netlify/blobs';
import worker,{buildBackup} from '../../dist/server/index.js';
import {createPgD1} from '../../server/pg-d1.mjs';
import {blobBackups,hourlyBackup} from '../../server/backups.mjs';

let DB,BACKUPS;
export default async (req, context) => {
  DB ??= createPgD1(getDatabase().pool);
  BACKUPS ??= blobBackups(getStore('backups'));
  // Yazma işlemlerinden sonra (en fazla saatte bir) arka planda yedek; yanıtı geciktirmez.
  // Yazma sonrası yedek: yanıt dönmeden önce beklenir (saatte en fazla bir kez çalışır, diğer isteklerde anında döner).
  let job;
  const BACKUP_HOOK = () => { job = hourlyBackup({db: DB, store: BACKUPS, buildBackup}); };
  const BACKUP_NOW = async () => { const b = await buildBackup(DB), at = new Date().toISOString(); await BACKUPS.set('hourly/latest.json', b, {at}); return {key: 'hourly/latest.json', orders: b.orders.length, at}; };
  const res = await worker.fetch(req, {DB, BACKUPS, BACKUP_HOOK, BACKUP_NOW, ADMIN_KEY: Netlify.env.get('ADMIN_KEY')});
  if (job) await job;
  return res;
};
export const config = {path: '/*'};
