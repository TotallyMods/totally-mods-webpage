import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const base='https://api.vercel.com';
const team=`teamId=${encodeURIComponent(process.env.TEAM_ID)}`;
async function api(route) {
  const r=await fetch(base+route+(route.includes('?')?'&':'?')+team,{headers:{Authorization:`Bearer ${process.env.VERCEL_TOKEN}`}});
  if(!r.ok) throw Error(`Vercel HTTP ${r.status} for ${route}: ${(await r.text()).slice(0,250)}`);
  return r.json();
}
const deployments=await api(`/v6/deployments?projectId=${encodeURIComponent(process.env.PROJECT_ID)}&limit=50`);
const pick=(deployments.deployments||[]).find(x=>x.readyState==='READY'&&x.target==='production');
if(!pick) throw Error('No successful production deployment found');
console.log('Backing up deployment',pick.uid||pick.id);
const id=pick.uid||pick.id;
const roots=await api(`/v6/deployments/${encodeURIComponent(id)}/files`);
const files=[];
function flatten(nodes,dir='') {
 for(const n of nodes){
  if(typeof n==='string') throw Error('Vercel returned a truncated file tree; refusing incomplete backup');
  const name=path.posix.join(dir,n.name||'');
  if(n.type==='directory') {
   if(!Array.isArray(n.children)) throw Error('Unexpanded source directory: '+name);
   flatten(n.children,name);
  }else if(n.type==='file') {
   if(!n.uid)throw Error('Missing source hash for '+name);
   files.push({name,uid:n.uid});
  }
 }
}
flatten(Array.isArray(roots)?roots:roots.files||roots.result||[]);
files.splice(0, files.length, ...files.filter(f => f.name.startsWith('src/')));
const prefix=files.every(x=>x.name.startsWith('src/'))?'src/':'';
const rels=files.map(x=>x.name.slice(prefix.length));
for(const p of ['package.json','app/page.js','app/globals.css','app/layout.js','components/UserNav.js','lib/supabase.js']) if(!rels.includes(p))throw Error(`Missing essential source file: ${p}`);
if(files.length<9)throw Error(`Only ${files.length} files found; refusing partial backup`);
const dest=path.join(process.env.RUNNER_TEMP||os.tmpdir(),'vercel-source');
await fs.mkdir(dest,{recursive:true});
for(const f of files){
 const rel=f.name.slice(prefix.length);
 if(rel.startsWith('.')||rel.split('/').some(s=>s==='..'||s.startsWith('.env'))||/\.(pem|key|p12)$/i.test(rel)) {console.log('Skipping sensitive file:',rel);continue;}
 const response=await api(`/v8/deployments/${encodeURIComponent(id)}/files/${encodeURIComponent(f.uid)}`);
 if(!response?.data||typeof response.data!=='string')throw Error('Missing source content for '+rel);
 const bytes=Buffer.from(response.data,'base64');
 if(!bytes.length)throw Error('Empty source content for '+rel);
 const target=path.join(dest,rel);
 if(!target.startsWith(dest+path.sep))throw Error('Unsafe file path');
 await fs.mkdir(path.dirname(target),{recursive:true});
 await fs.writeFile(target,bytes);
}
await fs.writeFile(path.join(dest,'VERCEL_BACKUP_INFO.txt'),`Source deployment: ${id}\nBacked up automatically via Vercel API\n`);
console.log('Verified and downloaded',files.length,'source files');
