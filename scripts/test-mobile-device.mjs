import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {adb, flutter, root, runTool} from './mobile-tools.mjs';
const fixture=JSON.parse(readFileSync(join(root,'.local/mobile-test.json'),'utf8'));
const serial=process.argv[2];if(!serial||!/^[a-zA-Z0-9._:-]+$/.test(serial))throw new Error('Test qurilma serialini argument sifatida kiriting.');
for(const port of [4000,4001])runTool(adb,['-s',serial,'reverse',`tcp:${port}`,`tcp:${port}`],{capture:true});
runTool(flutter,['test','integration_test/booking_flow_test.dart','-d',serial,'--dart-define=API_BASE_URL=http://127.0.0.1:4000',`--dart-define=TEST_BRIDGE_KEY=${fixture.key}`]);
