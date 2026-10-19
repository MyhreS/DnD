import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';

async function files(root) {
 const entries=await readdir(root,{withFileTypes:true});
 return (await Promise.all(entries.map(entry=>entry.isDirectory()?files(join(root,entry.name)):[join(root,entry.name)]))).flat();
}
let count=0;
for(const root of ['dist','functions/secure-entry']) {
 for(const file of await files(root)) {
  const body=await readFile(file);count++;
  assert.ok(!file.endsWith('.map'),'Public source maps must stay disabled.');
  assert.ok(!body.includes(Buffer.from('SYNTHETIC_PRIVATE_CANARY_7f19')),'Private canary appeared in a public artifact.');
  assert.ok(!/\/app\/(?:assets|resources|bundle)\/[a-f0-9]{64}/.test(body.toString()),'A private release resource appeared in a public artifact.');
 }
}
console.log(`Public workspace artifact boundary passed (${count} files).`);
