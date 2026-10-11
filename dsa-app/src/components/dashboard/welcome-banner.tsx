'use client';

import * as React from 'react';
import { useUser } from '@clerk/nextjs';
import { Sparkles, Calendar, Target } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export function WelcomeBanner() {
  const { user } = useUser();
  const [greeting, setGreeting] = React.useState('Welcome back');

  React.useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const displayName = user?.firstName || user?.username || 'Learner';
  const todayStr = formatDate(new Date());

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/60">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
              <Sparkles className="h-3 w-3" />
              DSA Mastery Journey
            </span>
            <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
              <Calendar className="h-3 w-3" />
              {todayStr}
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl break-words">
            {greeting}, {displayName}!
          </h1>

          <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
            Consistency is the superpower in technical interviews. Master each pattern deeply, understand the trade-offs, and let spaced repetition lock in your retention.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 text-center dark:border-zinc-800 dark:bg-zinc-800/40 min-w-[120px]">
            <span className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              Sheet Standard
            </span>
            <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
              211 Problems
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
