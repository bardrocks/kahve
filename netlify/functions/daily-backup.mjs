import {getDatabase} from '@netlify/database';
import {getStore} from '@netlify/blobs';
import {buildBackup} from '../../dist/server/index.js';
import {createPgD1} from '../../server/pg-d1.mjs';
import {blobBackups,dailyBackup} from '../../server/backups.mjs';

// Test/yerel kullanım için enjekte edilebilir çekirdek.
export const run=(db,store,now)=>dailyBackup({db,store,buildBackup,now});
export default async()=>{
  const result=await run(createPgD1(getDatabase().pool),blobBackups(getStore('backups')));
  console.log('Günlük yedek alındı:',JSON.stringify(result));
};
// Her gün UTC 00:00 (Türkiye saatiyle 03:00)
export const config={schedule:'0 0 * * *'};
