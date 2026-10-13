import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const trace=JSON.parse(await readFile('.next/server/app/api/intake/route.js.nft.json','utf8'));
const files=trace.files.map(file=>file.replaceAll('\\','/'));
assert(files.some(file=>file.endsWith('/node_modules/next/dist/lib/framework/boundary-constants.js')),'Vercel function launcher framework files must be traced.');
for(const name of ['@google-cloud/storage','@google-cloud/firestore','google-auth-library']){
  assert(files.some(file=>file.endsWith(`/node_modules/${name}/package.json`)),`${name} runtime metadata must be included in the deployed function.`);
}
assert(!files.some(file=>file.includes('/.local-data/')||file.includes('/.env')||file.includes('/work/')||file.includes('/outputs/')),'Private local data and verification outputs must not enter the deployment.');
console.log('PASS: Vercel launcher framework files and native Google Cloud package metadata are traced; private local data and settings are excluded.');
