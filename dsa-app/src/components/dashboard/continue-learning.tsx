import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Play, Repeat, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDateTime, getDifficultyBadgeColor, getStatusBadgeColor } from '@/lib/utils';

export interface RecentAttemptItem {
  id: string;
  attemptedAt: string | Date;
  outcome: 'SOLVED' | 'FAILED' | 'PARTIALLY_SOLVED';
  durationSeconds: number;
  problem: {
    title: string;
    canonicalSlug: string;
    difficulty: string;
  };
}

interface ContinueLearningProps {
  recentAttempts?: RecentAttemptItem[];
  revisionDueCount?: number;
  lastPracticedProblem?: {
    title: string;
    canonicalSlug: string;
    difficulty: string;
    patternName?: string;
  } | null;
}

export function ContinueLearning({
  recentAttempts = [],
  revisionDueCount = 0,
  lastPracticedProblem
}: ContinueLearningProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Resume Card */}
      <Card className="flex flex-col justify-between">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Resume Practice</CardTitle>
          <p className="text-xs text-zinc-500">Pick up right where you left off</p>
        </CardHeader>

        <CardContent className="space-y-4 pt-0 flex-1 flex flex-col justify-between">
          {lastPracticedProblem ? (
            <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                    {lastPracticedProblem.patternName || 'Last active pattern'}
                  </span>
                  <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {lastPracticedProblem.title}
                  </h4>
                </div>
                <Badge
                  variant="outline"
                  className={getDifficultyBadgeColor(lastPracticedProblem.difficulty).text}
                >
                  {lastPracticedProblem.difficulty}
                </Badge>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <Link href={`/problems/${lastPracticedProblem.canonicalSlug}`}>
                  <Button size="sm" className="gap-1.5 text-xs">
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Open Workspace
                  </Button>
                </Link>
                <Link href="/sheet">
                  <Button variant="ghost" size="sm" className="text-xs text-zinc-500">
                    Explore next
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center dark:border-zinc-800">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Ready to begin your preparation?
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Start with Problem #1 from the Arrays topic: Richest Customer Wealth.
              </p>
              <div className="mt-4">
                <Link href="/problems/richest-customer-wealth">
                  <Button size="sm" className="gap-1.5 text-xs">
                    <Play className="h-3 w-3 fill-current" />
                    Start Problem #1
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Revision Callout if any items due */}
          <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-50/30 p-3 text-xs dark:bg-amber-950/20">
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="font-medium text-amber-900 dark:text-amber-200">
                {revisionDueCount > 0
                  ? `${revisionDueCount} problem${revisionDueCount > 1 ? 's' : ''} due for spaced review`
                  : 'All spaced repetition reviews are up to date'}
              </span>
            </div>
            <Link href="/revisions">
              <Button variant="ghost" size="sm" className="text-xs h-7 text-amber-800 dark:text-amber-300">
                Review
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recently Attempted List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold">Recent Attempts</CardTitle>
            <p className="text-xs text-zinc-500">Your latest practice submissions</p>
          </div>
          <Link href="/history">
            <Button variant="ghost" size="sm" className="text-xs text-indigo-600 dark:text-indigo-400">
              Full history
            </Button>
          </Link>
        </CardHeader>

        <CardContent className="space-y-2.5 pt-0">
          {recentAttempts.length === 0 ? (
            <div className="py-10 text-center text-xs text-zinc-500">
              No recent attempts yet. Log attempts from any problem workspace.
            </div>
          ) : (
            recentAttempts.slice(0, 5).map((att) => {
              const diffColor = getDifficultyBadgeColor(att.problem.difficulty);
              const outcomeBadge =
                att.outcome === 'SOLVED'
                  ? { label: 'Solved', variant: 'success' as const }
                  : att.outcome === 'PARTIALLY_SOLVED'
                  ? { label: 'Partial', variant: 'warning' as const }
                  : { label: 'Failed', variant: 'destructive' as const };

              return (
                <div
                  key={att.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-100 p-2.5 transition-colors hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-900/40"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/problems/${att.problem.canonicalSlug}`}
                      className="font-medium text-xs text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 truncate block"
                    >
                      {att.problem.title}
                    </Link>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-400">
                      <span>{formatDateTime(att.attemptedAt)}</span>
                      <span>•</span>
                      <span>{Math.round(att.durationSeconds / 60)} min</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Badge variant={outcomeBadge.variant} className="text-[10px] px-1.5 py-0.5">
                      {outcomeBadge.label}
                    </Badge>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
