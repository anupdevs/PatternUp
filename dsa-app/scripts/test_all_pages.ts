import path from 'path';

if (!process.cwd().endsWith('dsa-app')) {
  process.chdir('dsa-app');
}

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { ToastProvider } from '../src/components/ui/toast';
import { offlineCatalog } from '../src/lib/offline-catalog';
import ProblemPage, { generateMetadata } from '../src/app/problems/[idOrSlug]/page';

async function testAllPages() {
  const result = offlineCatalog.listProblems({ page: 1, limit: 300 });
  console.log(`Testing all ${result.problems.length} problems for ProblemPage rendering...`);
  
  let failed = 0;
  for (const p of result.problems) {
    try {
      const meta = await generateMetadata({ params: Promise.resolve({ idOrSlug: p.canonicalSlug }) });
      const pageElement = await ProblemPage({ params: Promise.resolve({ idOrSlug: p.canonicalSlug }) });
      const html = ReactDOMServer.renderToString(
        React.createElement(ToastProvider, null, pageElement)
      );
      if (!html) throw new Error('Empty HTML');
    } catch (err: any) {
      console.error(`ERROR on problem '${p.canonicalSlug}':`, err?.message || err);
      failed++;
    }
  }
  console.log(`Done testing. Failed: ${failed}`);
}

testAllPages();

