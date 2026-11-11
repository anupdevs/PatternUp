import path from 'path';

if (!process.cwd().endsWith('dsa-app')) {
  process.chdir('dsa-app');
}

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { ToastProvider } from '../src/components/ui/toast';
import { offlineCatalog } from '../src/lib/offline-catalog';
import ProblemPage from '../src/app/problems/[idOrSlug]/page';

async function testWithUser() {
  const userId = 'user_test123';
  console.log('Testing with userId:', userId);
  try {
    const detail = offlineCatalog.getProblemDetails('two-sum', userId);
    console.log('Problem details found:', detail?.title);
    console.log('User progress:', detail?.userProgress);
    console.log('User note:', detail?.userNote);
    console.log('Revision schedule:', detail?.revisionSchedule);

    const pageElement = await ProblemPage({ params: Promise.resolve({ idOrSlug: 'two-sum' }) });
    const html = ReactDOMServer.renderToString(
      React.createElement(ToastProvider, null, pageElement)
    );
    console.log('Rendered HTML length:', html.length);
  } catch (err: any) {
    console.error('Error with authenticated user:', err);
  }
}

testWithUser();

