import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {join} from 'node:path';
import {keytool, mobile, mobileEnv, root, runTool} from './mobile-tools.mjs';

const directory = join(root, '.local/android-signing');
const properties = join(mobile, 'android/key.properties');
const keystore = join(directory, 'sihhat-pilot.jks');
if (existsSync(properties)) {
  console.log('Android imzolash konfiguratsiyasi mavjud; mavjud kalit saqlandi.');
  process.exit(0);
}
if (existsSync(keystore)) throw new Error('Pilot kaliti mavjud, key.properties topilmadi. Saqlangan konfiguratsiyani tiklang; kalit almashtirilmaydi.');
mkdirSync(directory, {recursive: true, mode: 0o700});
const secret = randomBytes(32).toString('hex');
runTool(keytool, [
  '-genkeypair', '-noprompt', '-keystore', keystore, '-storetype', 'JKS',
  '-alias', 'sihhat-pilot', '-keyalg', 'RSA', '-keysize', '3072', '-validity', '10000',
  '-dname', 'CN=Sihhat.uz Android Pilot, OU=Mobile, O=Sihhat.uz, C=UZ',
  '-storepass:env', 'SIHHAT_SIGNING_SECRET', '-keypass:env', 'SIHHAT_SIGNING_SECRET',
], {env: {...mobileEnv, SIHHAT_SIGNING_SECRET: secret}, capture: true});
const content = `storeFile=${keystore.replaceAll('\\', '/')}\nstorePassword=${secret}\nkeyAlias=sihhat-pilot\nkeyPassword=${secret}\n`;
writeFileSync(join(directory, 'key.properties'), content, {mode: 0o600, flag: 'wx'});
writeFileSync(properties, content, {mode: 0o600, flag: 'wx'});
console.log('Yangi RSA 3072 pilot kaliti yaratildi: .local/android-signing/sihhat-pilot.jks');
console.log('Maxfiy konfiguratsiya: .local/android-signing/key.properties va apps/mobile/android/key.properties.');
