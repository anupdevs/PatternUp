import path from 'path';

if (!process.cwd().endsWith('dsa-app')) {
  process.chdir('dsa-app');
}

import { offlineCatalog } from '../src/lib/offline-catalog';

async function testAll() {
  const result = offlineCatalog.listProblems({ page: 1, limit: 300 });
  console.log('Total problems in list:', result.problems.length);
  
  let failedCount = 0;
  for (const p of result.problems) {
    const detail = offlineCatalog.getProblemDetails(p.canonicalSlug);
    if (!detail) {
      console.error(`Failed to get details for slug: '${p.canonicalSlug}' (id: ${p.id}, title: ${p.title})`);
      failedCount++;
    }
  }
  console.log('Finished testing. Failed problems count:', failedCount);
}

testAll();

