import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
// Dedicated restore database, never overwrite an application database.
const root=resolve(import.meta.dirname,'..'),bin=process.env.SIHHAT_PG_BIN??'C:/Program Files/PostgreSQL/18/bin';
const args=['-h','127.0.0.1','-p','55432','-U','sihhat_local'];
const run=(name,extra)=>{const r=spawnSync(join(bin,`${name}${process.platform==='win32'?'.exe':''}`),[...args,...extra],{encoding:'utf8',windowsHide:true,timeout:60000});if(r.error)throw r.error;if(r.status!==0)throw new Error(`${name}: ${r.stderr}`);return r.stdout.trim();};
const target='sihhat_restore_test';
if(!target.startsWith('sihhat_restore_')||target==='sihhat'||target==='sihhat_test')throw new Error('Unsafe restore target');
const dir=join(root,'.local','backups');mkdirSync(dir,{recursive:true});const file=join(dir,`sihhat-${new Date().toISOString().replace(/[:.]/g,'-')}.dump`);
run('pg_dump',['-d','sihhat','-Fc','--no-owner','--no-acl','-f',file]);const checksum=createHash('sha256').update(readFileSync(file)).digest('hex');writeFileSync(`${file}.sha256`,checksum+'\n');
const exists=run('psql',['-d','postgres','-tAc',`SELECT 1 FROM pg_database WHERE datname='${target}'`]);if(exists!=='1')run('createdb',[target]);
run('pg_restore',['-d',target,'--clean','--if-exists','--no-owner','--no-acl','--exit-on-error',file]);
const tables=run('psql',['-d','sihhat','-tAc',"SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"]).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
let count=0;for(const table of tables){const escaped=table.replace(/"/g,'""');const query=`SELECT count(*) FROM "${escaped}"`;if(run('psql',['-d','sihhat','-tAc',query])!==run('psql',['-d',target,'-tAc',query]))throw new Error(`Restore count mismatch: ${table}`);count++;}
const schema=(db)=>run('pg_dump',['-d',db,'--schema-only','--no-owner','--no-acl']).split('\n').filter(l=>!l.startsWith('\\restrict')&&!l.startsWith('\\unrestrict')).join('\n');if(schema('sihhat')!==schema(target))throw new Error('Restore schema mismatch');
console.log(`Zaxira va tiklash tekshirildi: ${count} jadval, schema va satr sonlari mos. SHA256: ${checksum}. Arxiv: ${file}`);
