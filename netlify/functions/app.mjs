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
  const BACKUP_HOOK = () => { const job = hourlyBackup({db: DB, store: BACKUPS, buildBackup}); try { context?.waitUntil?.(job); } catch {} };
  return worker.fetch(req, {DB, BACKUPS, BACKUP_HOOK, ADMIN_KEY: Netlify.env.get('ADMIN_KEY')});
};
export const config = {path: '/*'};
