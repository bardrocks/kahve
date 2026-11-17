import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import worker from '../dist/server/index.js';import {DB as SQLITE_DB,createDB as sqliteCreateDB} from './dev.mjs';
import {memoryBackups,hourlyBackup,_resetHourly} from '../server/backups.mjs';import {buildBackup} from '../dist/server/index.js';
const PG=process.argv.includes('--pg');let DB=SQLITE_DB,createDB=sqliteCreateDB,stopPg=async()=>{},freshDB=async()=>sqliteCreateDB();
if(PG){const {NetlifyDB}=await import('@netlify/database-dev'),{default:pg}=await import('pg'),{createPgD1}=await import('../server/pg-d1.mjs');const engines=[],pools=[];const mkPg=async()=>{const d=new NetlifyDB(),cs=await d.start();await d.applyMigrations('./netlify/database/migrations');const pool=new pg.Pool({connectionString:typeof cs==='string'?cs:cs.connectionString});engines.push(d);pools.push(pool);return createPgD1(pool)};DB=await mkPg();const spare=await mkPg();createDB=()=>spare;freshDB=mkPg;stopPg=async()=>{for(const p of pools)await p.end().catch(()=>{});for(const d of engines)await d.stop().catch(()=>{})}}
for(const dir of ['drizzle','netlify/database/migrations'])for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.sql')))assert.ok(!/\bDROP\s+(TABLE|INDEX|VIEW|TRIGGER|COLUMN)\b|\bDELETE\s+FROM\b|\bTRUNCATE\b|\bALTER\s+TABLE\b[^;]*\bDROP\b|\bRENAME\s+(TO|COLUMN)\b/i.test(fs.readFileSync(dir+'/'+f,'utf8').replace(/--.*$/gm,'')),'Yıkıcı migration yasak: '+dir+'/'+f);
const html=fs.readFileSync('index.html','utf8');new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
const call=async(path,body,auth=false,device='a'.repeat(64))=>{const r=await worker.fetch(new Request('https://mola.test/api/'+path,{method:body?'POST':'GET',headers:{Origin:'https://mola.test','X-Mola-Device':device,...(auth?{Authorization:'Bearer test-key'}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),{DB,ADMIN_KEY:'test-key'});return {status:r.status,data:await r.json()}};
assert.equal((await call('admin/data')).status,401);for(const sugar of [-1,1.5,100]){assert.equal((await call('orders',{id:crypto.randomUUID(),buyer:'Can',contact:'05548955011',items:[{id:'latte',recipient:'Can',payer:'Can',sugar,qty:1}]})).status,400)}const menu=await call('menu');assert.equal(menu.data.products[0].price,120);
const id=crypto.randomUUID();let r=await call('orders',{id,buyer:'İbrahim Kaya',contact:'05548955011',items:[{id:'latte',recipient:'Ayşe Yılmaz',payer:'İbrahim Kaya',sugar:7,qty:2},{id:'espresso',recipient:'Can',payer:'Can',sugar:0,qty:1}]});assert.equal(r.status,200);assert.ok(r.data.url.startsWith('https://wa.me/905548955011?'));assert.ok(r.data.message.includes('2 × Latte'));assert.ok(r.data.message.includes('7 şekerli'));
assert.equal((await call('orders',{id,buyer:'İbrahim',contact:'05548955011',items:[{id:'latte',recipient:'Ayşe',payer:'İbrahim',sugar:2,qty:2}]})).status,409);
let data=(await call('admin/data',null,true)).data;assert.equal(data.orders[0].status,'pending');assert.equal(data.orders[0].total,310);assert.equal(data.orders[0].items[0].payer,'ibrahim kaya');
await call('admin/status',{id,status:'confirmed'},true);await call('admin/payment',{person:'İbrahim Kaya',amount:100,note:'Kısmi ödeme'},true);data=(await call('admin/data',null,true)).data;assert.equal(data.orders[0].status,'confirmed');assert.equal(data.payments[0].amount,100);assert.equal(240-data.payments[0].amount,140);
assert.equal((await call('admin/payment',{person:'Can',amount:-1},true)).status,400);
const settings=menu.data;settings.products[0].price=150;assert.equal((await call('admin/settings',settings,true)).status,200);data=(await call('admin/data',null,true)).data;assert.equal(data.orders[0].items[0].price,120);assert.equal((await call('menu')).data.products[0].price,150);
await call('admin/payment-delete',{id:data.payments[0].id},true);assert.equal((await call('admin/data',null,true)).data.payments.length,0);await call('admin/status',{id,status:'cancelled'},true);assert.equal((await call('admin/data',null,true)).data.orders[0].status,'cancelled');
assert.equal((await call('admin/staff',{name:'Ayşe Yılmaz',phone:'0554 123 45 67'})).status,401);
assert.equal((await call('admin/staff-delete',{id:'unknown'})).status,401);
for(const phone of ['abc','123','+90 invalid 5541234567'])assert.equal((await call('admin/staff',{name:'Ayşe',phone},true)).status,400);
assert.equal((await call('admin/staff',{name:'   ',phone:'05541234567'},true)).status,400);
const staffCreated=await call('admin/staff',{name:'  Ayşe   Yılmaz ',phone:'0554 123 45 67'},true);assert.equal(staffCreated.status,200);const staffId=staffCreated.data.id;
let staffData=(await call('admin/data',null,true)).data;assert.equal(staffData.staff.length,1);assert.equal(staffData.staff[0].phone,'905541234567');assert.equal(staffData.staff[0].name,'Ayşe Yılmaz');
assert.equal((await call('admin/staff',{name:'Can Kaya',phone:'+90 554 123 45 67'},true)).status,409);
assert.equal((await call('admin/staff',{id:staffId,name:'Ayşe Demir',phone:'0090 555 111 22 33'},true)).status,200);
staffData=(await call('admin/data',null,true)).data;assert.equal(staffData.staff[0].name,'Ayşe Demir');assert.equal(staffData.staff[0].phone,'905551112233');
assert.equal((await call('admin/staff',{id:'missing',name:'Can',phone:'05551112233'},true)).status,404);
assert.equal((await call('menu')).data.staff,undefined);
assert.equal((await call('admin/staff-delete',{id:staffId},true)).status,200);staffData=(await call('admin/data',null,true)).data;assert.equal(staffData.staff.length,0);assert.equal(staffData.orders.length,1);
assert.equal((await call('identify',{name:'   '})).status,400);
assert.equal((await call('identify',{name:'İbrahim Kaya'})).status,200);
assert.equal((await call('identify',{name:' ibrahim   kaya '})).status,200);
let profiles=(await call('admin/data',null,true)).data.staff;assert.equal(profiles.length,1);assert.equal(profiles[0].phone,null);const profileId=profiles[0].id;
assert.equal((await call('admin/staff',{id:profileId,name:'İbrahim Kaya',phone:'0555 999 88 77'},true)).status,200);
assert.equal((await call('identify',{name:'İbrahim Kaya'})).status,200);profiles=(await call('admin/data',null,true)).data.staff;assert.equal(profiles.length,1);assert.equal(profiles[0].phone,'905559998877');
assert.equal((await call('admin/staff',{name:'Can Kaya',phone:'05559998877'},true)).status,409);
assert.equal((await call('admin/staff',{name:'Can Kaya',phone:'05552223344'},true)).status,200);
assert.equal((await call('identify',{name:'Can Kaya'})).status,200);assert.equal((await call('admin/data',null,true)).data.staff.length,2);
assert.equal((await call('menu')).data.staff,undefined);
assert.equal((await call('admin/staff-delete',{id:profileId},true)).status,200);assert.equal((await call('admin/data',null,true)).data.staff.length,1);
let browserA='a'.repeat(64),browserB='b'.repeat(64);
assert.equal((await call('admin/personal-link',{name:'İbrahim Kaya'},false)).status,401);
const personal=await call('admin/personal-link',{name:'İbrahim Kaya'},true);assert.equal(personal.status,200);assert.equal(personal.data.bound,false);const personalId=personal.data.personId,code=personal.data.code;
assert.equal((await call('identify',{name:'İbrahim Kaya'},false,browserB)).status,409);
const claims=await Promise.all([call('claim-link',{code,name:'Sahte İsim'},false,browserA),call('claim-link',{code},false,browserB)]);assert.equal(claims.filter(r=>r.data.name==='İbrahim Kaya').length,1);assert.equal(claims.filter(r=>r.data.taken===true).length,1);assert.equal(claims.find(r=>r.data.taken).data.name,undefined);if(claims[0].data.taken)[browserA,browserB]=[browserB,browserA];
assert.equal((await call('identity',null,false,browserA)).data.name,'İbrahim Kaya');assert.equal((await call('identity',null,false,browserB)).data.name,null);
assert.equal((await call('identify',{name:'İbrahim Kaya'},false,browserA)).status,200);assert.equal((await call('identify',{name:'İbrahim Kaya'},false,browserB)).status,409);
const protectedOrder={id:crypto.randomUUID(),buyer:'İbrahim Kaya',contact:'05559998877',items:[{id:'latte',recipient:'İbrahim',payer:'İbrahim Kaya',qty:2,sugar:2,sugars:[2,0]}]};assert.equal((await call('orders',protectedOrder,false,browserB)).status,403);assert.equal((await call('orders',protectedOrder,false,browserA)).status,200);
assert.equal((await call('identify',{name:'Ayşe Yılmaz'},false,browserB)).status,200);
assert.equal((await call('admin/personal-link',{personId:personalId},true)).data.code,code);
const reset=await call('admin/personal-link',{personId:personalId,reset:true},true);assert.notEqual(reset.data.code,code);assert.equal(reset.data.bound,false);assert.equal((await call('claim-link',{code},false,browserA)).status,404);assert.equal((await call('identity',null,false,browserA)).data.name,null);assert.equal((await call('orders',{...protectedOrder,id:crypto.randomUUID()},false,browserA)).status,403);
assert.equal((await call('claim-link',{code:reset.data.code},false,browserB)).data.name,'İbrahim Kaya');assert.equal((await call('identify',{name:'İbrahim Kaya'},false,browserB)).status,200);
assert.equal((await call('admin/staff',{id:personalId,name:'İbrahim Kaya',phone:'05551119988'},true)).status,200);assert.equal((await call('identity',null,false,browserB)).data.name,'İbrahim Kaya');
await call('admin/staff-delete',{id:personalId},true);assert.equal((await call('claim-link',{code:reset.data.code},false,browserB)).status,404);
// --- menu management, lactose-free milk, legacy settings ---
const base=()=>({name:'Coffyman',phone:'905548955011'});
let m=(await call('menu')).data;assert.deepEqual(m.products.filter(p=>p.milk).map(p=>p.id).sort(),['cappuccino','latte','mocha']);assert.equal(m.lactoseFreeExtra,0);assert.ok(m.tones.includes('latte')&&!m.tones.includes('hero'));
const post=(products,extra={})=>call('admin/settings',{...base(),products,...extra},true);
assert.equal((await call('admin/settings',{...base(),products:m.products})).status,401);
for(const bad of [[],null,'x',[{name:'',price:10,category:'A',tone:'latte'}],[{name:'X',price:0,category:'A',tone:'latte'}],[{name:'X',price:10001,category:'A',tone:'latte'}],[{name:'X',price:5.5,category:'A',tone:'latte'}],[{name:'X',price:'5',category:'A',tone:'latte'}],[{name:'X',price:5,category:'',tone:'latte'}],[{name:'X',price:5,category:'A',tone:'hero'}],[{name:'X',price:5,category:'A',tone:'../etc'}],[{name:'X',price:5,category:'A'}],[{name:'X',price:5,category:'A',tone:'latte',milk:'yes'}],[{name:'X'.repeat(61),price:5,category:'A',tone:'latte'}],[{name:'X',price:5,category:'A',tone:'latte',desc:'d'.repeat(201)}],[{name:'X',price:5,category:'A',tone:'latte',tag:'t'.repeat(31)}],Array.from({length:61},(_,n)=>({name:'K'+n,price:5,category:'A',tone:'latte'})),[m.products[0],m.products[0]]])assert.equal((await post(bad)).status,400,JSON.stringify(bad).slice(0,80));
for(const extra of [-1,1001,1.5,'3'])assert.equal((await post(m.products,{lactoseFreeExtra:extra})).status,400);
assert.equal((await call('menu')).data.products.length,6);
// add
let add=await post([...m.products,{name:'Flat White',price:125,category:'Sütlü kahveler',desc:'Kadifemsi',tag:'Yeni',tone:'latte',milk:true},{name:'Flat White',price:99,category:'Sade kahveler',tone:'espresso',milk:false}],{lactoseFreeExtra:15});assert.equal(add.status,200);
m=(await call('menu')).data;assert.equal(m.products.length,8);assert.equal(m.lactoseFreeExtra,15);const fw=m.products[6],fw2=m.products[7];assert.equal(fw.id,'flat-white');assert.notEqual(fw2.id,fw.id);assert.equal(new Set(m.products.map(p=>p.id)).size,8);assert.equal(fw.milk,true);assert.equal(fw.tag,'Yeni');assert.equal(fw2.tag,undefined);assert.equal(m.products[0].id,'latte');
// edit (price-only legacy payload keeps other fields; full edit changes them)
assert.equal((await post(m.products.map(p=>p.id==='espresso'?{id:'espresso',price:75}:p))).status,200);let esp=(await call('menu')).data.products.find(p=>p.id==='espresso');assert.equal(esp.price,75);assert.equal(esp.name,'Espresso');assert.equal(esp.tone,'espresso');assert.equal(esp.milk,false);
assert.equal((await post((await call('menu')).data.products.map(p=>p.id==='flat-white'?{...p,name:'Flat White Special',price:130,milk:false,tag:''}:p))).status,200);m=(await call('menu')).data;const fw3=m.products.find(p=>p.id==='flat-white');assert.equal(fw3.name,'Flat White Special');assert.equal(fw3.price,130);assert.equal(fw3.milk,false);assert.equal(fw3.tag,undefined);
// lactose-free orders
const lo=crypto.randomUUID();r=await call('orders',{id:lo,buyer:'Deniz Aksoy',contact:'05548955011',items:[{id:'latte',recipient:'Deniz',payer:'Deniz Aksoy',sugar:0,qty:2,milk:'lactose_free'},{id:'cappuccino',recipient:'Deniz',payer:'Deniz Aksoy',sugar:1,qty:1}]});assert.equal(r.status,200);assert.ok(r.data.message.includes('Laktozsuz süt'));
data=(await call('admin/data',null,true)).data;let lord=data.orders.find(o=>o.id===lo);assert.equal(lord.items[0].price,165);assert.equal(lord.items[0].milk,'lactose_free');assert.equal(lord.items[1].milk,'normal');assert.equal(lord.items[1].price,110);assert.equal(lord.total,165*2+110);
for(const milk of ['soy',1,null,{}])assert.equal((await call('orders',{id:crypto.randomUUID(),buyer:'Deniz Aksoy',contact:'05548955011',items:[{id:'latte',recipient:'D',payer:'D',sugar:0,qty:1,milk}]})).status,400);
assert.equal((await call('orders',{id:crypto.randomUUID(),buyer:'Deniz Aksoy',contact:'05548955011',items:[{id:'americano',recipient:'D',payer:'D',sugar:0,qty:1,milk:'lactose_free'}]})).status,400);
assert.equal((await call('orders',{id:crypto.randomUUID(),buyer:'Deniz Aksoy',contact:'05548955011',items:[{id:'americano',recipient:'D',payer:'D',sugar:0,qty:1,milk:'normal'}]})).status,200);
// delete: old orders, payments and debts unaffected
await call('admin/status',{id:lo,status:'confirmed'},true);await call('admin/payment',{person:'Deniz Aksoy',amount:50},true);
const snapshot=(await call('admin/data',null,true)).data;
assert.equal((await post(m.products.filter(p=>!['latte','flat-white'].includes(p.id)))).status,200);
const after=(await call('admin/data',null,true)).data;assert.deepEqual(after.orders,snapshot.orders);assert.deepEqual(after.payments,snapshot.payments);assert.ok(!(await call('menu')).data.products.some(p=>p.id==='latte'));assert.equal(after.orders.find(o=>o.id===lo).items[0].name,'Latte');assert.equal(after.orders.find(o=>o.id===lo).items[0].price,165);
assert.equal((await call('orders',{id:crypto.randomUUID(),buyer:'Deniz Aksoy',contact:'05548955011',items:[{id:'latte',recipient:'D',payer:'D',sugar:0,qty:1}]})).status,400);
assert.equal((await post(m.products.slice(0,1).map(p=>({...p,id:'zzz-unknown'})))).status,200);assert.equal((await call('menu')).data.products.length,1);assert.notEqual((await call('menu')).data.products[0].id,'zzz-unknown');
assert.equal((await call('admin/data',null,true)).data.orders.length,snapshot.orders.length);
// legacy settings row (no milk flags / extra / tone-less fields beyond id)
await DB.prepare('INSERT INTO settings(id,data) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').bind(JSON.stringify({name:'Coffyman',phone:'905548955011',products:[{id:'latte',name:'Latte',price:120,category:'Sütlü kahveler',desc:'x',tone:'latte'},{id:'americano',name:'Americano',price:90,category:'Sade kahveler',desc:'y',tone:'americano'},{id:'mocha',name:'Mocha',price:130,category:'Sütlü kahveler',desc:'z',tone:'mocha'}]})).run();
m=(await call('menu')).data;assert.deepEqual(m.products.map(p=>p.milk),[true,false,true]);assert.equal(m.lactoseFreeExtra,0);
r=await call('orders',{id:crypto.randomUUID(),buyer:'Eski Kayıt',contact:'05548955011',items:[{id:'mocha',recipient:'E',payer:'E',sugar:0,qty:1,milk:'lactose_free'}]});assert.equal(r.status,200);assert.equal((await call('admin/data',null,true)).data.orders[0].items[0].price,130);
assert.equal((await call('orders',{id:crypto.randomUUID(),buyer:'Eski Kayıt',contact:'05548955011',items:[{id:'americano',recipient:'E',payer:'E',sugar:0,qty:1,milk:'lactose_free'}]})).status,400);
assert.equal((await post(m.products.map(p=>({id:p.id,price:p.price+1})))).status,200);m=(await call('menu')).data;assert.equal(m.products[0].price,121);assert.equal(m.products[0].milk,true);assert.equal(m.products[1].milk,false);
// --- memory (Her zamanki) ---
{await DB.prepare('INSERT INTO settings(id,data) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').bind(JSON.stringify({name:'Coffyman',phone:'905548955011',products:[{id:'latte',name:'Latte',price:120,category:'Sütlü kahveler',desc:'x',tone:'latte',milk:true},{id:'americano',name:'Americano',price:90,category:'Sade kahveler',desc:'y',tone:'americano',milk:false},{id:'mocha',name:'Mocha',price:130,category:'Sütlü kahveler',desc:'z',tone:'mocha',milk:true}]})).run();
const mem=name=>call('memory',{name}),ord=(buyer,items)=>call('orders',{id:crypto.randomUUID(),buyer,contact:'05548955011',items});
assert.deepEqual((await mem('Memo Yeni')).data,{favorites:[]});
const rc=(id,recipient,extra)=>({id,recipient,payer:recipient,qty:1,sugar:0,...extra});
assert.equal((await ord('Memo Kişi',[rc('americano','Memo Kişi',{sugar:0})])).status,200);
assert.equal((await ord('Memo Kişi',[rc('latte','Memo Kişi',{qty:3,sugar:2,sugars:[2,1,2],milk:'lactose_free'})])).status,200);
assert.equal((await ord('Başkası',[rc('latte','memo  kişi',{sugar:5})])).status,200);
let fav=(await mem(' MEMO   kişi ')).data.favorites;assert.equal(fav[0].productId,'latte');assert.equal(fav[0].count,4);assert.equal(fav[0].sugar,2);assert.equal(fav[0].milk,'normal');assert.equal(fav[1].productId,'americano');assert.equal(fav[1].milk,'normal');assert.equal(fav.length,2);
assert.equal((await ord('Memo Kişi',[rc('latte','Memo Kişi',{qty:2,sugar:1,sugars:[1,1],milk:'lactose_free'})])).status,200);
fav=(await mem('Memo Kişi')).data.favorites;assert.equal(fav[0].count,6);assert.equal(fav[0].sugar,1);assert.equal(fav[0].milk,'lactose_free');
const cx=await ord('Memo Kişi',[rc('mocha','Memo Kişi',{qty:20,sugar:9})]);assert.equal(cx.status,200);const cxId=(await call('admin/data',null,true)).data.orders.find(o=>o.items[0].id==='mocha').id;await call('admin/status',{id:cxId,status:'cancelled'},true);
fav=(await mem('Memo Kişi')).data.favorites;assert.ok(!fav.some(f=>f.productId==='mocha'));assert.equal(fav[0].productId,'latte');
const menuNow=(await call('menu')).data;assert.equal((await call('admin/settings',{name:'Coffyman',phone:'905548955011',products:menuNow.products.filter(p=>p.id!=='latte')},true)).status,200);
fav=(await mem('Memo Kişi')).data.favorites;assert.ok(!fav.some(f=>f.productId==='latte'));assert.equal(fav[0].productId,'americano');
const lk=await call('admin/personal-link',{name:'Memo Kişi'},true),devA='c'.repeat(64),devB='d'.repeat(64);assert.equal((await call('claim-link',{code:lk.data.code},false,devA)).data.name,'Memo Kişi');
assert.equal((await call('memory',{name:'Memo Kişi'},false,devB)).status,409);assert.deepEqual((await call('memory',{name:'Memo Kişi'},false,devB)).data,{favorites:[]});assert.equal((await call('memory',{name:'Memo Kişi'},false,devA)).data.favorites[0].productId,'americano');
assert.equal((await call('memory',{name:'  '})).status,400);}

{
const mk=(d)=>async(path,body,auth=false)=>{const r=await worker.fetch(new Request('https://mola.test/api/'+path,{method:body?'POST':'GET',headers:{Origin:'https://mola.test','X-Mola-Device':'a'.repeat(64),...(auth?{Authorization:'Bearer test-key'}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:typeof body==='string'?body:JSON.stringify(body)}:{})}),{DB:d,ADMIN_KEY:'test-key'});return {status:r.status,data:await r.json().catch(()=>null),res:r}};
const bal=async(c,name)=>(await c('admin/data',null,true)).data.balances.find(b=>b.person===name.toLocaleLowerCase('tr-TR').replace(/\s+/g,' '));
const c1=mk(DB);
const st=await c1('admin/staff',{name:'Borçlu Deneme',phone:'0554 777 66 55'},true);assert.equal(st.status,200);
const ordD=await c1('orders',{id:crypto.randomUUID(),buyer:'Borçlu Deneme',contact:'05548955011',items:[{id:'americano',recipient:'Borçlu Deneme',payer:'Borçlu Deneme',sugar:1,qty:3},{id:'mocha',recipient:'Dost',payer:'Borçlu Deneme',sugar:0,qty:1}]});assert.equal(ordD.status,200);
const dataD=(await c1('admin/data',null,true)).data;const oD=dataD.orders.find(o=>o.id===ordD.data.id);await c1('admin/status',{id:oD.id,status:'delivered'},true);
const pendingId=crypto.randomUUID();assert.equal((await c1('orders',{id:pendingId,buyer:'Borçlu Deneme',contact:'05548955011',items:[{id:'americano',recipient:'x',payer:'Borçlu Deneme',sugar:0,qty:1}]})).status,200);
assert.equal((await c1('admin/payment',{person:'Borçlu  Deneme',amount:100},true)).status,200);
let b0=await bal(c1,'Borçlu Deneme');assert.ok(b0);assert.equal(b0.total,3*90+130);assert.equal(b0.paid,100);assert.equal(b0.remaining,300);assert.equal(b0.count,4);
{const mid=crypto.randomUUID(),r=await c1('orders',{id:mid,buyer:'Çoklu Sipariş',contact:'05548955011',items:[{id:'mocha',recipient:'Ali',payer:'Ödeyen Bir',sugar:1,sugars:[1],qty:1,milk:'lactose_free'},{id:'mocha',recipient:'Veli',payer:'Ödeyen İki',sugar:0,sugars:[0],qty:1,milk:'normal'},{id:'mocha',recipient:'Can',payer:'Ödeyen Bir',sugar:3,sugars:[3],qty:1,milk:'normal'}]});assert.equal(r.status,200);const o=(await c1('admin/data',null,true)).data.orders.find(x=>x.id===mid);assert.deepEqual(o.items.map(i=>i.recipient),['Ali','Veli','Can']);assert.deepEqual(o.items.map(i=>i.milk),['lactose_free','normal','normal']);assert.deepEqual(o.items.map(i=>i.sugar),[1,0,3]);await c1('admin/status',{id:mid,status:'delivered'},true);const one=await bal(c1,'Ödeyen Bir'),two=await bal(c1,'Ödeyen İki');assert.equal(one.total,o.items[0].price+o.items[2].price);assert.equal(two.total,o.items[1].price);assert.equal(one.count,2);assert.equal(two.count,1)}
// client-visible consistency: server balances equal a recompute from orders/payments
{const d=(await c1('admin/data',null,true)).data,m={};for(const o of d.orders){if(['pending','cancelled'].includes(o.status))continue;for(const i of o.items)m[i.payer]=(m[i.payer]||0)+i.qty*i.price}for(const p of d.payments)m[p.person]=(m[p.person]||0)-p.amount;for(const b of d.balances)assert.equal(b.remaining,m[b.person]||0)}
// delete product, change price, re-save menu entirely
let mn=(await c1('menu')).data;assert.equal((await c1('admin/settings',{name:mn.name,phone:mn.phone,products:mn.products.filter(p=>p.id!=='mocha')},true)).status,200);assert.equal((await bal(c1,'Borçlu Deneme')).remaining,300);
mn=(await c1('menu')).data;mn.products.find(p=>p.id==='americano').price=999;assert.equal((await c1('admin/settings',{...mn},true)).status,200);assert.equal((await bal(c1,'Borçlu Deneme')).remaining,300);
mn=(await c1('menu')).data;assert.equal((await c1('admin/settings',{name:mn.name,phone:mn.phone,lactoseFreeExtra:5,products:mn.products.map(p=>({...p,price:p.price+1}))},true)).status,200);assert.equal((await bal(c1,'Borçlu Deneme')).remaining,300);
// rename
assert.equal((await c1('admin/staff',{id:st.data.id,name:'Yeni   İsim Kişi',phone:'0554 777 66 55'},true)).status,200);
assert.equal(await bal(c1,'Borçlu Deneme'),undefined);let b1=await bal(c1,'Yeni İsim Kişi');assert.equal(b1.remaining,300);assert.equal(b1.paid,100);
{const d=(await c1('admin/data',null,true)).data;assert.ok(!d.payments.some(p=>p.person==='borçlu deneme'));assert.ok(d.orders.find(o=>o.id===ordD.data.id).items.filter(i=>i.recipient==='Yeni İsim Kişi').length>=1);assert.equal(d.orders.find(o=>o.id===ordD.data.id).items[0].price,90)}
// rename onto an existing name is refused and changes nothing
const other=await c1('admin/staff',{name:'Başka Kişi',phone:'0554 888 11 22'},true);assert.equal(other.status,200);assert.equal((await c1('admin/staff',{id:other.data.id,name:'yeni isim kişi',phone:'0554 888 11 22'},true)).status,409);assert.equal((await bal(c1,'Yeni İsim Kişi')).remaining,300);
// admin-entered orders (WhatsApp / phone)
{const CR=new Date(Date.now()-5*864e5).toISOString();assert.equal((await call('admin/settings',{name:'Coffyman',phone:'905548955011',products:[...(await c1('menu')).data.products,{name:'Süt Testi',price:100,category:'Sütlü kahveler',tone:'latte',milk:true}],lactoseFreeExtra:15},true)).status,200);const menuA=(await c1('menu')).data,MK=menuA.products.find(p=>p.milk).id,pm=id=>menuA.products.find(p=>p.id===id).price,ex=menuA.lactoseFreeExtra;const ao=(o,auth=true)=>c1('admin/order',o,auth);
const good=()=>({buyer:'Whatsapp Kişi',contact:'0554 111 22 33',source:'whatsapp',items:[{id:'americano',recipient:'Whatsapp Kişi',payer:'Whatsapp Kişi',qty:2,sugars:[1,0]},{id:MK,recipient:'Misafir',payer:'Ödeyen Üç',qty:1,sugar:2,milk:'lactose_free',price:1,total:1}]});
assert.equal((await ao(good(),false)).status,401);
for(const bad of [{items:[]},{items:[{id:'yok',recipient:'a',payer:'a',qty:1,sugar:0}]},{items:[{id:'americano',recipient:'a',payer:'a',qty:0,sugar:0}]},{items:[{id:'americano',recipient:'a',payer:'a',qty:21,sugar:0}]},{items:[{id:'americano',recipient:'  ',payer:'a',qty:1,sugar:0}]},{items:[{id:'americano',recipient:'a',payer:'a',qty:1,sugar:0,milk:'lactose_free'}]},{buyer:' ',items:good().items},{status:'x'},{source:'x'},{created:'saçma'},{created:new Date(Date.now()+864e5).toISOString()},{created:new Date(Date.now()-400*864e5).toISOString()},{contact:'abc'}])assert.equal((await ao({...good(),...bad})).status,400);
const r=await ao({...good(),created:CR});assert.equal(r.status,200);assert.match(r.data.id,/^[a-f0-9-]{36}$/);
const o=(await c1('admin/data',null,true)).data.orders.find(x=>x.id===r.data.id);assert.equal(o.status,'confirmed');assert.equal(o.source,'whatsapp');assert.equal(o.created,CR);assert.equal(o.buyer,'Whatsapp Kişi');
const expMocha=pm(MK)+ex;assert.equal(o.total,2*pm('americano')+expMocha);assert.equal(o.items.find(i=>i.id===MK).price,expMocha);assert.equal(o.items.find(i=>i.id===MK).milk,'lactose_free');
assert.equal((await bal(c1,'Whatsapp Kişi')).total,2*pm('americano'));assert.equal((await bal(c1,'Ödeyen Üç')).total,expMocha);
const r2=await ao({buyer:'Varsayılan',items:[{id:'americano',recipient:'x',payer:'x',qty:1,sugar:0}]});assert.equal(r2.status,200);assert.equal((await c1('admin/data',null,true)).data.orders.find(x=>x.id===r2.data.id).source,'admin');
const r3=await ao({buyer:'Bekleyen',status:'pending',items:[{id:'americano',recipient:'x',payer:'bekleyen ödeyen',qty:1,sugar:0}]});assert.equal(r3.status,200);assert.equal(await bal(c1,'Bekleyen Ödeyen'),undefined);
const lkx=await c1('admin/personal-link',{name:'Kilitli Kişi'},true),devE='e'.repeat(64);assert.equal((await call('claim-link',{code:lkx.data.code},false,devE)).data.name,'Kilitli Kişi');
const web={id:crypto.randomUUID(),buyer:'Kilitli Kişi',contact:'05548955011',items:[{id:'americano',recipient:'Kilitli Kişi',payer:'Kilitli Kişi',qty:1,sugar:0}]};assert.equal((await c1('orders',web)).status,403);
const rl=await ao({buyer:'Kilitli Kişi',items:web.items});assert.equal(rl.status,200);assert.equal((await bal(c1,'Kilitli Kişi')).total,pm('americano'));
assert.equal((await call('orders',web,false,devE)).status,200);assert.equal((await c1('admin/data',null,true)).data.orders.find(x=>x.id===web.id).source,'web');
const bk2=(await c1('admin/backup',null,true)).data;assert.equal(bk2.orders.find(x=>x.id===r.data.id).source,'whatsapp');
globalThis.__waId=r.data.id}
// backup
const bk=await c1('admin/backup',null,true);assert.equal(bk.status,200);assert.match(bk.res.headers.get('content-disposition'),/coffyman-yedek-\d{4}-\d{2}-\d{2}\.json/);const bd=bk.data;assert.equal(bd.version,1);for(const t of ['settings','orders','payments','staff','customer_profiles','personal_links'])assert.ok(t in bd);assert.ok(bd.orders.length>5&&Array.isArray(bd.orders[0].items));assert.equal((await c1('admin/backup')).status,401);
const before=(await c1('admin/data',null,true)).data.balances;
// restore into a brand-new empty DB
const db2=createDB(),c2=mk(db2);assert.equal((await c2('admin/restore',bd)).status,401);
let rs=await c2('admin/restore',bd,true);assert.equal(rs.status,200);assert.equal(rs.data.result.orders.added,bd.orders.length);assert.equal(rs.data.result.orders.skipped,0);assert.equal(rs.data.result.settings.added,1);
assert.equal((await c2('admin/data',null,true)).data.orders.find(x=>x.id===globalThis.__waId).source,'whatsapp');assert.deepEqual((await c2('admin/data',null,true)).data.balances,before);assert.equal((await c2('menu')).data.products.find(p=>p.id==='americano').price,(await c1('menu')).data.products.find(p=>p.id==='americano').price);
rs=await c2('admin/restore',bd,true);assert.equal(rs.status,200);for(const t of ['orders','payments','staff','customer_profiles','personal_links'])assert.equal(rs.data.result[t].added,0);assert.equal(rs.data.result.settings.added,0);assert.equal((await c2('admin/data',null,true)).data.orders.length,bd.orders.length);assert.equal((await c2('admin/data',null,true)).data.payments.length,bd.payments.length);
// restore never overwrites or removes existing records
const tampered=structuredClone(bd);tampered.orders[0].total=1;tampered.payments[0]&&(tampered.payments[0].amount=1);tampered.settings.name='Başka';await c2('admin/restore',tampered,true);assert.deepEqual((await c2('admin/data',null,true)).data.balances,before);assert.notEqual((await c2('menu')).data.name,'Başka');
const partial=await c2('admin/restore',{version:1,orders:[],payments:[]},true);assert.equal(partial.status,200);assert.deepEqual((await c2('admin/data',null,true)).data.balances,before);
{const old=structuredClone(bd);for(const x of old.orders){delete x.source;x.id='legacy-'+x.id}const lr=await c2('admin/restore',old,true);assert.equal(lr.status,200);assert.equal(lr.data.result.orders.added,old.orders.length);const od=(await c2('admin/data',null,true)).data.orders.filter(x=>x.id.startsWith('legacy-'));assert.equal(od.length,old.orders.length);assert.ok(od.every(x=>x.source==null))}
// invalid input -> 400
for(const bad of ['not json','[]','{"version":2}',JSON.stringify({version:1,orders:'x'}),JSON.stringify({version:1,orders:[{id:'x'}]}),JSON.stringify({version:1,payments:[{id:'p',person:'a',amount:1.5,created:'',note:''}]}),JSON.stringify({version:1,settings:{}}),JSON.stringify({version:1,orders:[null]})])assert.equal((await c2('admin/restore',bad,true)).status,400);
assert.equal((await c2('admin/restore','x'.repeat(20000001),true)).status,400);
// simulated redeploy: re-import the worker module against the same DB
const worker2=(await import('../dist/server/index.js?redeploy='+Date.now())).default;assert.notEqual(worker2,worker);const r2=await worker2.fetch(new Request('https://mola.test/api/admin/data',{headers:{Authorization:'Bearer test-key'}}),{DB,ADMIN_KEY:'test-key'});assert.deepEqual((await r2.json()).balances,before);
}
// --- kahve kartları (person_prefs) + otomatik yedek ---
{const E=(d,extra={},device='a'.repeat(64))=>async(path,body,auth=true)=>{const r=await worker.fetch(new Request('https://mola.test/api/'+path,{method:body?'POST':'GET',headers:{Origin:'https://mola.test','X-Mola-Device':device,...(auth?{Authorization:'Bearer test-key'}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),{DB:d,ADMIN_KEY:'test-key',...extra});return {status:r.status,data:await r.json().catch(()=>null)}};
const store=memoryBackups();let hooked=null;_resetHourly();const hook=()=>{hooked=hourlyBackup({db:DB,store,buildBackup})};const X=E(DB,{BACKUPS:store,BACKUP_HOOK:hook}),Y=E(DB);
// yetki + doğrulama
assert.equal((await Y('admin/prefs',{name:'Pref Kişi',coffee:'Latte'},false)).status,401);assert.equal((await Y('admin/prefs-delete',{name:'Pref Kişi'},false)).status,401);
for(const bad of [{name:'',coffee:'Latte'},{name:'P',sugar:21},{name:'P',sugar:-1},{name:'P',sugar:1.5},{name:'P',sugar:'2'},{name:'P',milk:'soy'},{name:'P',note:'x'.repeat(301)},{name:'P',coffee:'x'.repeat(61)}])assert.equal((await Y('admin/prefs',bad)).status,400);
const pc=(await Y('admin/data')).data.prefs.length;
assert.equal(hooked,null);
// upsert / okuma / silme
assert.equal((await X('admin/prefs',{name:'  Ayşe   Kart ',coffee:'Latte',sugar:2,milk:'lactose_free',note:'az köpüklü, sıcak olsun'})).status,200);
assert.ok(hooked);assert.deepEqual(Object.keys(await hooked),['orders']);assert.ok((await store.list('')).includes('hourly/latest.json'));assert.ok((await store.getMetadata('hourly/latest.json')).at);
let pr=(await Y('admin/data')).data.prefs;assert.equal(pr.length,pc+1);let ak=pr.find(x=>x.name_key==='ayşe kart');assert.equal(ak.name,'Ayşe Kart');assert.equal(ak.coffee,'Latte');assert.equal(ak.sugar,2);assert.equal(ak.milk,'lactose_free');assert.equal(ak.note,'az köpüklü, sıcak olsun');
hooked=null;assert.equal((await X('admin/prefs',{name:'ayşe kart',coffee:'Mocha',sugar:0,milk:null,note:''})).status,200);assert.equal(await hooked,null,'saatte bir sınırı');
pr=(await Y('admin/data')).data.prefs;assert.equal(pr.length,pc+1);ak=pr.find(x=>x.name_key==='ayşe kart');assert.equal(ak.coffee,'Mocha');assert.equal(ak.sugar,0);assert.equal(ak.milk,null);assert.equal(ak.note,null);
hooked=null;assert.equal((await X('admin/prefs',{name:'P',sugar:99})).status,400);assert.equal(hooked,null);
assert.equal((await Y('admin/prefs-delete',{name:'AYŞE   kart'})).status,200);assert.equal((await Y('admin/data')).data.prefs.length,pc);
// rename prefs'i taşır
const st=await Y('admin/staff',{name:'Pref Taşı',phone:'05556667788'});assert.equal(st.status,200);assert.equal((await Y('admin/prefs',{name:'Pref Taşı',coffee:'Espresso',sugar:1,milk:'normal',note:'ristretto'})).status,200);
assert.equal((await Y('admin/staff',{id:st.data.id,name:'Pref Taşındı',phone:'05556667788'})).status,200);pr=(await Y('admin/data')).data.prefs;assert.ok(!pr.some(x=>x.name_key==='pref taşı'));const moved=pr.find(x=>x.name_key==='pref taşındı');assert.equal(moved.name,'Pref Taşındı');assert.equal(moved.coffee,'Espresso');assert.equal(moved.note,'ristretto');
// /api/memory: manuel tercih öncelikli
assert.equal((await Y('admin/order',{buyer:'Kart Memo',items:[{id:'americano',recipient:'Kart Memo',payer:'Kart Memo',qty:2,sugar:0}]})).status,200);
const mp=(await Y('menu')).data.products.find(x=>x.id!=='americano'),mid=mp.id;let mem=(await E(DB)('memory',{name:'Kart Memo'},false)).data;assert.equal(mem.manual,undefined);assert.equal(mem.favorites[0].productId,'americano');assert.equal(mem.favorites[0].sugar,0);
assert.equal((await Y('admin/prefs',{name:'kart memo',coffee:mp.name.toUpperCase(),sugar:3,milk:'lactose_free'})).status,200);
mem=(await E(DB)('memory',{name:'Kart Memo'},false)).data;assert.equal(mem.manual.coffee,mp.name.toUpperCase());assert.equal(mem.favorites[0].productId,mid);assert.equal(mem.favorites[0].sugar,3);assert.equal(mem.favorites[0].milk,'lactose_free');assert.ok(mem.favorites.some(f=>f.productId==='americano'&&f.sugar===3));
// kişisel bağlantılı isim başka cihaza manuel tercihi sızdırmaz
{const lk=await Y('admin/personal-link',{name:'Gizli Kart'});assert.equal(lk.status,200);await Y('admin/prefs',{name:'Gizli Kart',coffee:'Latte'});const dv='d'.repeat(64);assert.equal((await E(DB,{},dv)('claim-link',{code:lk.data.code},false)).data.name,'Gizli Kart');const other=await E(DB,{},'f'.repeat(64))('memory',{name:'Gizli Kart'},false);assert.equal(other.status,409);assert.equal(other.data.manual,undefined);assert.equal((await E(DB,{},dv)('memory',{name:'Gizli Kart'},false)).data.manual.coffee,'Latte')}
// backup/restore prefs'i taşır; eski yedek (prefs yok) yüklenir
const bk=(await Y('admin/backup')).data;assert.ok(Array.isArray(bk.person_prefs));assert.ok(bk.person_prefs.some(x=>x.name_key==='kart memo'));
const f1=await freshDB(),Z1=E(f1);let rr=await Z1('admin/restore',bk);assert.equal(rr.status,200);assert.equal(rr.data.result.person_prefs.added,bk.person_prefs.length);assert.ok((await Z1('admin/data')).data.prefs.some(x=>x.name_key==='pref taşındı'&&x.coffee==='Espresso'));
rr=await Z1('admin/restore',bk);assert.equal(rr.data.result.person_prefs.added,0);
{const old=structuredClone(bk);delete old.person_prefs;const f0=await freshDB();const r0=await E(f0)('admin/restore',old);assert.equal(r0.status,200);assert.equal(r0.data.result.person_prefs.added,0);assert.equal((await E(f0)('admin/data')).data.prefs.length,0);assert.equal((await E(f0)('admin/restore',{...bk,person_prefs:[{name_key:'x',name:'x',sugar:500,updated:'t'}]})).status,400)}
// auto-backups: liste, auto-restore, 501
assert.equal((await Y('admin/auto-backups')).status,501);assert.match((await Y('admin/auto-backups')).data.error,/Otomatik yedek/);assert.equal((await Y('admin/auto-restore',{key:'latest.json'})).status,501);assert.equal((await E(DB,{BACKUPS:store})('admin/auto-backups',null,false)).status,401);assert.equal((await E(DB,{BACKUPS:store})('admin/auto-restore',{key:'latest.json'},false)).status,401);
// zamanlanmış işlev (sahte store + gerçek/test DB)
const daily=await import('../netlify/functions/daily-backup.mjs');assert.equal(daily.config.schedule,'0 0 * * *');assert.equal(typeof daily.default,'function');
const dstore=memoryBackups();await dstore.set('daily/2020-01-01.json',{old:true});const d0=new Date('2026-11-19T00:00:00Z'),old2=new Date(d0.getTime()-10*864e5);await dstore.set('daily/'+old2.toISOString().slice(0,10)+'.json',{version:1,exportedAt:old2.toISOString(),orders:[],payments:[]});
const dr=await daily.run(DB,dstore,d0);assert.equal(dr.key,'daily/2026-11-19.json');assert.deepEqual(dr.removed,['daily/2020-01-01.json']);const dk=await dstore.list('daily/');assert.equal(dk.length,2);assert.ok(dk.includes('daily/2026-11-19.json'));const live=(await Y('admin/data')).data;const dj=await dstore.get('daily/2026-11-19.json');assert.equal(dj.orders.length,live.orders.length);assert.equal(dj.person_prefs.length,live.prefs.length);assert.deepEqual(await dstore.get('latest.json'),dj);
const AB=E(DB,{BACKUPS:dstore});const lst=(await AB('admin/auto-backups')).data.backups;assert.equal(lst.length,3);assert.ok(lst.some(b=>b.key==='latest.json')&&lst.some(b=>b.key==='daily/2026-11-19.json'&&b.orders===live.orders.length&&b.payments===live.payments.length));assert.equal(lst[0].key==='latest.json'||lst[0].key==='daily/2026-11-19.json',true);
assert.equal((await AB('admin/auto-restore',{key:'../x'})).status,400);assert.equal((await AB('admin/auto-restore',{key:'daily/2001-01-01.json'})).status,404);assert.equal((await AB('admin/auto-restore',{})).status,400);
const f2=await freshDB(),AR=E(f2,{BACKUPS:dstore});rr=await AR('admin/auto-restore',{key:'daily/2026-11-19.json'});assert.equal(rr.status,200);assert.equal(rr.data.result.orders.added,live.orders.length);assert.equal(rr.data.result.person_prefs.added,live.prefs.length);const back=(await AR('admin/data')).data;assert.equal(back.orders.length,live.orders.length);assert.equal(back.prefs.length,live.prefs.length);assert.deepEqual(back.balances,live.balances);
rr=await AR('admin/auto-restore',{key:'latest.json'});assert.equal(rr.data.result.orders.added,0);assert.equal(rr.data.result.person_prefs.added,0);
// restore silmez/ezmez: DB'de olan kayıt korunur
assert.equal((await AR('admin/prefs',{name:'kart memo',coffee:'Espresso'})).status,200);await AR('admin/auto-restore',{key:'latest.json'});assert.equal((await AR('admin/data')).data.prefs.find(x=>x.name_key==='kart memo').coffee,'Espresso');
}
await stopPg();console.log((PG?'[postgres] ':'[sqlite] ')+'PASS: balances survive product delete/price change/menu resave/rename, backup+restore idempotent, redeploy, migration safety;  menu add/edit/delete, validation, lactose-free milk snapshot, legacy settings, person prefs + auto backups, device-bound links, simultaneous first claim, forwarded link anonymity, reserved names, protected orders, new guest identity, admin reset/revocation, contact updates, ordering and staff regression');
