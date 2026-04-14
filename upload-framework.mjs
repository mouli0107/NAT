import { readFileSync } from 'fs';
// FormData and Blob are global in Node 22

const CONFIG_ID = '3a8cb681-fe77-42a7-8cbb-3bc7ed2b83d2';
const BASE = 'http://localhost:5000';

const files = [
  { path: './tmp-framework/pages/homePage.ts',               name: 'homePage.ts' },
  { path: './tmp-framework/pages/navPage.ts',                name: 'navPage.ts' },
  { path: './tmp-framework/pages/articlePage.ts',            name: 'articlePage.ts' },
  { path: './tmp-framework/fixtures/page-object-fixture.ts', name: 'page-object-fixture.ts' },
];

async function uploadFiles() {
  const form = new FormData();
  for (const f of files) {
    const content = readFileSync(new URL(f.path, import.meta.url));
    form.append('files', new Blob([content], { type: 'text/plain' }), f.name);
  }

  const res = await fetch(`${BASE}/api/framework-config/${CONFIG_ID}/upload-files`, {
    method: 'POST',
    body: form,
  });

  const data = await res.json();
  console.log('Upload result:', JSON.stringify(data, null, 2));
  return data;
}

async function getFunctions() {
  const res = await fetch(`${BASE}/api/framework-config/${CONFIG_ID}`);
  const data = await res.json();
  console.log('\n=== Framework Config ===');
  console.log('Name:', data.config?.name);
  console.log('Functions parsed:', data.functions?.length ?? 0);
  if (data.functions?.length) {
    console.log('\nFunction Catalog:');
    data.functions.forEach(fn => {
      console.log(`  [${fn.category}] ${fn.className}.${fn.name}(${fn.parameters ?? ''}) — ${fn.description ?? ''}`);
    });
  }
  return data;
}

uploadFiles()
  .then(() => getFunctions())
  .catch(err => console.error('Error:', err.message));
