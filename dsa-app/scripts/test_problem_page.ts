import path from 'path';

if (!process.cwd().endsWith('dsa-app')) {
  try {
    process.chdir(path.resolve(process.cwd(), 'dsa-app'));
  } catch {}
}

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { ToastProvider } from '../src/components/ui/toast';
import ProblemPage from '../src/app/problems/[idOrSlug]/page';

async function main() {
  try {
    const slug = 'two-sum';
    console.log(`Testing SSR for ProblemPage '${slug}'...`);
    const pageElement = await ProblemPage({ params: Promise.resolve({ idOrSlug: slug }) });
    
    console.log('Rendering ProblemPage element to string inside ToastProvider...');
    const html = ReactDOMServer.renderToString(
      React.createElement(ToastProvider, null, pageElement)
    );
    console.log('SSR successful! HTML length:', html.length);
  } catch (err: any) {
    console.error('ERROR during SSR of ProblemPage:', err);
    if (err.stack) console.error(err.stack);
  }
}

main();
