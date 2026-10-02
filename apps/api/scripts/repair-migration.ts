import 'dotenv/config';
import { Client } from 'pg';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
async function main(){
for (const connectionString of [process.env.DATABASE_URL,process.env.TEST_DATABASE_URL]) {
  if (!connectionString) continue;
  const url=new URL(connectionString);
  if(url.hostname!=='127.0.0.1'||url.port!=='55432'||!['/sihhat','/sihhat_test'].includes(url.pathname))throw new Error('Repair faqat shu loyihaning lokal bazalari uchun');
  const client=new Client({connectionString});await client.connect();
  const failed=await client.query('SELECT 1 FROM "_prisma_migrations" WHERE migration_name=$1 AND finished_at IS NULL AND rolled_back_at IS NULL',['202610010002_integrity']);
  await client.end();
  if(failed.rowCount){
    const result=spawnSync(process.execPath,[resolve('../../node_modules/prisma/build/index.js'),'migrate','resolve','--rolled-back','202610010002_integrity'],{env:{...process.env,DATABASE_URL:connectionString},stdio:'inherit',windowsHide:true});
    if(result.error)throw result.error;if(result.status)process.exit(result.status);
  }
}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
