import fs from 'node:fs';
fs.mkdirSync('dist/server',{recursive:true});
fs.mkdirSync('dist/.openai',{recursive:true});
const assets=Object.fromEntries(fs.readdirSync('assets').filter(f=>f.endsWith('.jpg')).map(f=>[f,fs.readFileSync('assets/'+f).toString('base64')]));
const source=fs.readFileSync('worker/index.js','utf8').replace('"__HTML__"',JSON.stringify(fs.readFileSync('index.html','utf8'))).replace('"__ASSETS__"',JSON.stringify(assets));
fs.writeFileSync('dist/server/index.js',source);
fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');
fs.cpSync('drizzle','dist/drizzle',{recursive:true});
