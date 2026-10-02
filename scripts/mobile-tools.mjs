import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join, resolve} from 'node:path';

export const root = resolve(import.meta.dirname, '..');
export const mobile = join(root, 'apps/mobile');
const properties = join(mobile, 'android/local.properties');
const localProperties = existsSync(properties) ? readFileSync(properties, 'utf8') : '';
const configuredSdk = /^flutter\.sdk=(.+)$/m.exec(localProperties)?.[1].trim().replace(/\\\\/g, '\\');
// Dart native hooks on Windows need the existing space-free SDK/cache paths.
const cacheRoot = configuredSdk && existsSync(configuredSdk) ? resolve(configuredSdk, '../../..') : root;
const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT ?? 'C:/Users/user/AppData/Local/Android/Sdk';
const java = process.env.JAVA_HOME ?? 'C:/Program Files/Android/Android Studio/jbr';
export const flutter = process.env.SIHHAT_FLUTTER_BIN ?? join(configuredSdk ?? join(root, '.local/tools/flutter'), 'bin', process.platform === 'win32' ? 'flutter.bat' : 'flutter');
export const adb = join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
export const keytool = join(java, 'bin', process.platform === 'win32' ? 'keytool.exe' : 'keytool');
export const mobileEnv = {
  ...process.env,
  PUB_CACHE: process.env.PUB_CACHE ?? join(cacheRoot, '.local/pub-cache'),
  GRADLE_USER_HOME: process.env.GRADLE_USER_HOME ?? join(cacheRoot, '.local/gradle'),
  JAVA_HOME: java,
  ANDROID_HOME: sdk,
  FLUTTER_SUPPRESS_ANALYTICS: 'true',
};

export function buildTool(name) {
  const versions = readdirSync(join(sdk, 'build-tools')).filter(v => /^\d+\.\d+\.\d+$/.test(v));
  versions.sort((a, b) => b.localeCompare(a, undefined, {numeric: true}));
  if (!versions.length) throw new Error('Android SDK build-tools topilmadi.');
  const extension = process.platform === 'win32' ? (name === 'apksigner' ? '.bat' : '.exe') : '';
  return join(sdk, 'build-tools', versions[0], name + extension);
}

export function runTool(executable, args, options = {}) {
  const {capture = false, env = mobileEnv, cwd = mobile, ...rest} = options;
  let command = executable, commandArgs = args;
  if (process.platform === 'win32' && /\.(bat|cmd)$/i.test(executable)) {
    const values = [executable, ...args];
    // cmd expands metacharacters even in quotes; only pass validated literal arguments.
    if (values.some(v => /["%&|<>^!\r\n]/.test(v))) throw new Error('Buyruq argumentida ruxsat etilmagan belgi bor.');
    command = process.env.ComSpec ?? 'cmd.exe';
    commandArgs = ['/d', '/s', '/c', `"${values.map(v => `"${v}"`).join(' ')}"`];
    rest.windowsVerbatimArguments = true;
  }
  const result = spawnSync(command, commandArgs, {
    cwd, env, windowsHide: true, encoding: 'utf8', timeout: 600_000,
    stdio: capture ? 'pipe' : 'inherit', ...rest,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = capture ? `${result.stdout ?? ''}${result.stderr ?? ''}` : '';
    throw new Error(`${executable.split(/[\\/]/).at(-1)} bajarilmadi (${result.status}). ${detail}`.trim());
  }
  return result.stdout ?? '';
}
