import path from 'path';

// FORCE cwd to be root (E:\2026 Programming\DSA)
if (process.cwd().endsWith('dsa-app')) {
  process.chdir('..');
}

console.log('Current working directory:', process.cwd());

import { CatalogService } from '../src/services/catalog.service';

async function main() {
  const result = await CatalogService.listProblems({ page: 1, limit: 10 });
  console.log('Problems count when running from root:', result.problems.length);
  const detail = await CatalogService.getProblemDetails('two-sum');
  console.log('ProblemDetails when running from root:', detail);
}

main();

