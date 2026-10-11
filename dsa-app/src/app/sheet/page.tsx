import React, { Suspense } from 'react';
import { SheetExplorer } from '@/components/sheet/sheet-explorer';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: 'DSA Sheet Explorer | 211 Problems',
  description: 'Search, filter, and practice 211 curated DSA problems organized by topics, patterns, and difficulty.'
};

export default function SheetPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-96 w-full" /></div>}>
      <SheetExplorer />
    </Suspense>
  );
}
