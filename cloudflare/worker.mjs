// Cloudflare Workers girişi: aynı worker'ı D1 (env.DB) ve KV yedek deposuyla çalıştırır.
import worker,{buildBackup} from '../dist/server/index.js';
import {dailyBackup,hourlyBackup} from '../server/backups.mjs';

// KV üzerinde yedek deposu (server/backups.mjs'in beklediği {list,get,set,delete,getMetadata} arayüzü).
export function kvBackups(kv){return {
  async list(prefix=''){const out=[];let cursor;do{const r=await kv.list({prefix,cursor});out.push(...r.keys.map(k=>k.name));cursor=r.list_complete?null:r.cursor}while(cursor);return out},
  async get(key){return await kv.get(key,{type:'json'})},
  async set(key,value,metadata){await kv.put(key,JSON.stringify(value),metadata?{metadata}:undefined)},
  async delete(key){await kv.delete(key)},
  async getMetadata(key){const r=await kv.getWithMetadata(key);return r?.metadata||null}}}

export default {
  async fetch(req,env,ctx){
    const BACKUPS=env.BACKUPS_KV?kvBackups(env.BACKUPS_KV):undefined;
    const BACKUP_HOOK=BACKUPS?()=>ctx.waitUntil(hourlyBackup({db:env.DB,store:BACKUPS,buildBackup})):undefined;
    const BACKUP_NOW=BACKUPS?async()=>{const b=await buildBackup(env.DB),at=new Date().toISOString();await BACKUPS.set('hourly/latest.json',b,{at});return {key:'hourly/latest.json',orders:b.orders.length,at}}:undefined;
    return worker.fetch(req,{DB:env.DB,BACKUPS,BACKUP_HOOK,BACKUP_NOW,ADMIN_KEY:env.ADMIN_KEY});
  },
  // Her gün UTC 00:00 (Türkiye saatiyle 03:00) otomatik yedek
  async scheduled(event,env,ctx){
    if(env.BACKUPS_KV)ctx.waitUntil(dailyBackup({db:env.DB,store:kvBackups(env.BACKUPS_KV),buildBackup}));
  }
};
