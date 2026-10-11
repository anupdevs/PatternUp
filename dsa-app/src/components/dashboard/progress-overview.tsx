import * as React from 'react';
import { CheckCircle2, Clock, Flame, HelpCircle, Layers, PieChart, PlayCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatDuration } from '@/lib/utils';

interface ProgressOverviewProps {
  totalPlatformProblems: number;
  totalSolved: number;
  totalAttempted: number;
  totalNeedsRevision: number;
  completionRate: number;
  totalAttemptsCount: number;
  totalTimeSpentSeconds: number;
  currentStreak?: number;
  longestStreak?: number;
}

export function ProgressOverview({
  totalPlatformProblems = 211,
  totalSolved = 0,
  totalAttempted = 0,
  totalNeedsRevision = 0,
  completionRate = 0,
  totalAttemptsCount = 0,
  totalTimeSpentSeconds = 0,
  currentStreak = 0,
  longestStreak = 0
}: ProgressOverviewProps) {
  const problemsRemaining = Math.max(0, totalPlatformProblems - totalSolved);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
      {/* Solved Card */}
      <Card className="border-emerald-500/20 bg-emerald-50/20 dark:border-emerald-500/20 dark:bg-emerald-950/10">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-800 dark:text-emerald-400">
              Problems Solved
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-emerald-950 dark:text-emerald-100">
              {totalSolved}
            </span>
            <span className="text-xs text-emerald-700/80 dark:text-emerald-400">
              / {totalPlatformProblems}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 w-full rounded-full bg-emerald-200/60 dark:bg-emerald-950">
              <div
                className="h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 transition-all duration-500"
                style={{ width: `${Math.min(100, completionRate)}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
              {completionRate}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Attempted Card (clearly distinguishing attempted from solved) */}
      <Card className="border-blue-500/20 bg-blue-50/20 dark:border-blue-500/20 dark:bg-blue-950/10">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-800 dark:text-blue-400">
              In Progress / Attempted
            </span>
            <PlayCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-blue-950 dark:text-blue-100">
              {totalAttempted}
            </span>
            <span className="text-xs text-blue-700/80 dark:text-blue-400">
              attempted
            </span>
          </div>
          <p className="mt-2 text-[11px] text-blue-700/70 dark:text-blue-300/70">
            {totalAttemptsCount} total attempts logged
          </p>
        </CardContent>
      </Card>

      {/* Remaining Card */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Questions Remaining
            </span>
            <Layers className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {problemsRemaining}
            </span>
            <span className="text-xs text-zinc-500">to complete</span>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">
            {totalNeedsRevision > 0 ? `${totalNeedsRevision} due for review` : 'All reviews current'}
          </p>
        </CardContent>
      </Card>

      {/* Total Practice Time Card */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Practice Time
            </span>
            <Clock className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {formatDuration(totalTimeSpentSeconds)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
            <Flame className="h-3.5 w-3.5 fill-amber-500" />
            <span>Streak: {currentStreak}d (Best: {longestStreak}d)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
