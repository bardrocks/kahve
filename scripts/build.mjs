import fs from 'node:fs';
fs.mkdirSync('dist/server',{recursive:true});
const assets=Object.fromEntries(fs.readdirSync('assets').filter(f=>f.endsWith('.jpg')).map(f=>[f,fs.readFileSync('assets/'+f).toString('base64')]));
// PWA simgeleri (png + svg) ayrı bir haritada: menü fotoğraf listesine (tones) karışmasın.
const icons=Object.fromEntries(fs.readdirSync('assets').filter(f=>/^(icon.*|apple-touch-icon)\.(png|svg)$/.test(f)).map(f=>[f,fs.readFileSync('assets/'+f).toString('base64')]));
const source=fs.readFileSync('worker/index.js','utf8').replace('"__HTML__"',()=>JSON.stringify(fs.readFileSync('index.html','utf8'))).replace('"__ASSETS__"',()=>JSON.stringify(assets)).replace('"__ICONS__"',()=>JSON.stringify(icons));
fs.writeFileSync('dist/server/index.js',source);
fs.cpSync('drizzle','dist/drizzle',{recursive:true});
