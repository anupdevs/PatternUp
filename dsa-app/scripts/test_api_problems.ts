import path from 'path';

if (!process.cwd().endsWith('dsa-app')) {
  process.chdir('dsa-app');
}

import { NextRequest } from 'next/server';
import { GET } from '../src/app/api/problems/route';

async function testApi() {
  const req = new NextRequest('http://localhost:3000/api/problems?page=1&limit=5');
  const res = await GET(req);
  const json = await res.json();
  console.log('API Status:', res.status);
  console.log('API Success:', json.success);
  console.log('Problems returned:', json.data?.problems?.map((p: any) => ({
    id: p.id,
    canonicalSlug: p.canonicalSlug,
    title: p.title,
    originalPdfQuestionNumber: p.originalPdfQuestionNumber
  })));
}

testApi();

