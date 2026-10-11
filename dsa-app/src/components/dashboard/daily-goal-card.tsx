'use client';

import * as React from 'react';
import Link from 'next/link';
import { Target, Settings, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DailyGoalCardProps {
  dailyGoal?: number;
  solvedToday?: number;
}

export function DailyGoalCard({ dailyGoal = 3, solvedToday = 0 }: DailyGoalCardProps) {
  const percent = Math.min(100, Math.round((solvedToday / dailyGoal) * 100));
  const isGoalReached = solvedToday >= dailyGoal;

  return (
    <Card className="border-indigo-500/20 bg-linear-to-br from-white to-indigo-50/30 dark:from-zinc-900 dark:to-indigo-950/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
            <Target className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">{"Today's Practice Goal"}</CardTitle>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Target daily completions</p>
          </div>
        </div>

        <Link href="/settings">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="space-y-3 pt-2">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {solvedToday}
            </span>
            <span className="text-xs text-zinc-500">/ {dailyGoal} problems solved today</span>
          </div>
          {isGoalReached && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <CheckCircle className="h-3 w-3" />
              Completed!
            </span>
          )}
        </div>

        <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isGoalReached ? 'bg-emerald-500' : 'bg-indigo-600 dark:bg-indigo-500'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>

        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          {isGoalReached
            ? 'Great momentum! You met your target for today.'
            : `${dailyGoal - solvedToday} more problem${dailyGoal - solvedToday === 1 ? '' : 's'} to achieve today's goal.`}
        </p>
      </CardContent>
    </Card>
  );
}
