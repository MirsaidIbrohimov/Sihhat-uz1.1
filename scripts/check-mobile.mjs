import {join, dirname} from 'node:path';
import {flutter, runTool} from './mobile-tools.mjs';

const dart = join(dirname(flutter), process.platform === 'win32' ? 'dart.bat' : 'dart');
if (!process.argv.includes('--tests-only')) {
  runTool(dart, ['format', ...(process.argv.includes('--format') ? [] : ['--output=none', '--set-exit-if-changed']), 'lib', 'test', 'integration_test']);
  runTool(flutter, ['analyze', '--no-pub']);
}
runTool(flutter, ['test', '--no-pub', ...(process.argv.includes('--home-only') ? ['test/home_test.dart'] : [])]);
