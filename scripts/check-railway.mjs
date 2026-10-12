import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRailwayContext, project, RAILWAY_GRAPH_VERSION, validateGraph } from 'railway/iac';
import definition from '../.railway/railway.ts';

const root = resolve(import.meta.dirname, '..');
const desired = await definition(createRailwayContext({ environment: 'production', command: 'plan' }), project);
const resources = desired.resources.flat();
assert.deepEqual(validateGraph({ version: RAILWAY_GRAPH_VERSION, project: { name: desired.name }, environments: [{ name: 'production' }], resources, edges: [] }), []);
const apps = resources.filter(resource => resource.type === 'service');
const scripts = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).scripts;
for (const app of apps) {
  for (const command of [app.build.buildCommand, app.deploy.startCommand, ...(app.deploy.preDeployCommand ?? [])]) {
    for (const match of command.matchAll(/npm run ([\w:.-]+)/g)) {
      // Workspace build scripts are defined in their own package.json.
      if (command.includes(' -w ')) continue;
      assert.ok(scripts[match[1]], `Missing npm script: ${match[1]}`);
    }
  }
  assert.equal(app.deploy.numReplicas, 1);
  assert.equal(app.deploy.sleepApplication, false);
}
assert.equal(apps.length, 5);
assert.equal(apps.find(app => app.name === 'telegram').deploy.overlapSeconds, 0);
assert.ok(apps.find(app => app.name === 'telegram').deploy.drainingSeconds >= 25);
assert.equal(apps.filter(app => app.deploy.preDeployCommand?.some(command => command.includes('db:migrate'))).length, 1);
assert.ok(existsSync(resolve(root, '.railwayignore')), 'Missing private upload exclusions');
const exclusions = new Set(readFileSync(resolve(root, '.railwayignore'), 'utf8').split(/\r?\n/).map(line => line.trim()));
for (const pattern of ['.git/', '.local/', 'node_modules/', '**/.env', '**/.env.*', '**/build/', '**/dist/', '**/.next/', '**/key.properties', '**/*.jks', '**/*.apk', 'apps/api/src/generated/']) {
  assert.ok(exclusions.has(pattern), `Missing upload exclusion: ${pattern}`);
}
console.log(JSON.stringify({ configuration_valid: true, services: apps.map(app => app.name), resources: resources.length, live_railway_verified: false }));
