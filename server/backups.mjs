// Otomatik yedek yardımcıları. Blob erişimi enjekte edilir: {list(prefix),get(key),set(key,value,metadata),delete(key)}.
export const KEEP_DAYS=30,HOURLY_MS=3600e3;
export function blobBackups(store){return {
  async list(prefix=''){const out=[];const r=await store.list({prefix});for(const b of r.blobs||[])out.push(b.key);return out},
  async get(key){return await store.get(key,{type:'json'})},
  async set(key,value,metadata){await store.setJSON(key,value,metadata?{metadata}:undefined)},
  async delete(key){await store.delete(key)},
  async getMetadata(key){const r=await store.getMetadata(key);return r?.metadata||null}}}
export function memoryBackups(){const m=new Map();return {m,
  async list(prefix=''){return [...m.keys()].filter(k=>k.startsWith(prefix)).sort()},
  async get(key){const v=m.get(key);return v?structuredClone(v.value):null},
  async set(key,value,metadata){m.set(key,{value:structuredClone(value),metadata:metadata||null})},
  async delete(key){m.delete(key)},
  async getMetadata(key){return m.get(key)?.metadata||null}}}
const dayKey=d=>'daily/'+d.toISOString().slice(0,10)+'.json';
export async function dailyBackup({db,store,buildBackup,now=new Date()}){
  const b=await buildBackup(db),key=dayKey(now);
  await store.set(key,b,{at:now.toISOString()});await store.set('latest.json',b,{at:now.toISOString()});
  const cutoff=dayKey(new Date(now.getTime()-KEEP_DAYS*864e5)),removed=[];
  for(const k of await store.list('daily/'))if(/^daily\/\d{4}-\d{2}-\d{2}\.json$/.test(k)&&k<cutoff){await store.delete(k);removed.push(k)}
  return {key,orders:b.orders.length,payments:b.payments.length,removed}}
// Yazma işlemlerinden sonra en fazla saatte bir. Hata sessizce yutulur (isteği etkilemez).
let lastHourly=0;
export async function hourlyBackup({db,store,buildBackup,now=new Date(),force=false}){
  try{if(!force&&now.getTime()-lastHourly<HOURLY_MS)return null;
    const meta=await store.getMetadata('hourly/latest.json');if(!force&&meta?.at&&now.getTime()-Date.parse(meta.at)<HOURLY_MS){lastHourly=Date.parse(meta.at);return null}
    lastHourly=now.getTime();const b=await buildBackup(db);await store.set('hourly/latest.json',b,{at:now.toISOString()});return {orders:b.orders.length}}catch{return null}}
export const _resetHourly=()=>{lastHourly=0};
