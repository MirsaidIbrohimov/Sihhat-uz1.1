import { mkdirSync,existsSync,createWriteStream,readFileSync } from 'node:fs';
import { resolve,join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root=resolve(import.meta.dirname,'..');const toolsDir=join(root,'.local','tools');mkdirSync(toolsDir,{recursive:true});
if(existsSync(join(toolsDir,'flutter','bin','flutter.bat'))){console.log('Flutter SDK mavjud.');process.exit(0);}
const responseManifest=await fetch('https://storage.googleapis.com/flutter_infra_release/flutter/releases/releases_windows.json',{signal:AbortSignal.timeout(60000)});
if(!responseManifest.ok){
  console.log('Rasmiy SDK arxivi manifesti mavjud emas; Flutter stable Git repozitoriysi olinmoqda.');
  const clone=spawnSync('git',['clone','--depth','1','--branch','stable','https://github.com/flutter/flutter.git',join(toolsDir,'flutter')],{stdio:'inherit',windowsHide:true});
  if(clone.error)throw clone.error;process.exit(clone.status??1);
}
const manifest=await responseManifest.json();
const release=manifest.releases.find(r=>r.hash===manifest.current_release.stable&&r.dart_sdk_arch!=='arm64');
if(!release||!/^[a-f0-9]{64}$/i.test(release.sha256))throw new Error('Stable Flutter manifesti noto‘g‘ri');
const url=new URL(release.archive,manifest.base_url+'/');if(!url.href.startsWith('https://storage.googleapis.com/flutter_infra_release/flutter/'))throw new Error('SDK manbasi noto‘g‘ri');
const zip=join(toolsDir,'flutter-stable.zip');
console.log(`Flutter ${release.version} stable SDK yuklanmoqda (${url.pathname.split('/').pop()}).`);
if(!existsSync(zip)){const response=await fetch(url,{signal:AbortSignal.timeout(1800000)});if(!response.ok||!response.body)throw new Error('SDK yuklanmadi');await pipeline(Readable.fromWeb(response.body),createWriteStream(zip));}
const digest=createHash('sha256').update(readFileSync(zip)).digest('hex');if(digest!==release.sha256)throw new Error('SDK checksum mos emas; yuklangan faylni tekshiring');
const result=spawnSync('tar.exe',['-xf',zip,'-C',toolsDir],{stdio:'inherit',windowsHide:true});if(result.error)throw result.error;if(result.status)process.exit(result.status);
console.log(`Flutter ${release.version} SDK loyiha ichiga o‘rnatildi.`);
