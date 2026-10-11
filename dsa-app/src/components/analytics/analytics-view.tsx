'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lightbulb,
  Repeat,
  Flame,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { formatDuration, getDifficultyBadgeColor } from '@/lib/utils';

interface AnalyticsData {
  topicStats: Array<{
    topicName: string;
    topicSlug: string;
    totalProblems: number;
    solvedProblems: number;
    percentComplete: number;
  }>;
  difficultyDistribution: {
    EASY: { solved: number; attempted: number };
    MEDIUM: { solved: number; attempted: number };
    HARD: { solved: number; attempted: number };
  };
  attemptTotals: {
    totalAttempts: number;
    solvedAttempts: number;
    failedAttempts: number;
    partialAttempts: number;
    totalDurationSeconds: number;
    past7DaysDurationSeconds: number;
  };
  repeatedFailures: Array<{
    problemId: string;
    title: string;
    canonicalSlug: string;
    difficulty: string;
    patternName: string;
    failedAttempts: number;
    status: string;
  }>;
  dailyActivities: Array<{
    date: string;
    questionsAttempted: number;
    questionsSolved: number;
    studyDurationSeconds: number;
  }>;
  weakPatterns?: Array<{
    patternName: string;
    patternSlug: string;
    topicName: string;
    totalAttempts: number;
    failedAttempts: number;
    solvedCount: number;
    failRate: number;
    avgConfidence: number | null;
    reasons: string[];
  }>;
  hintUsageCount: number;
  revisionDueCount: number;
}

export function AnalyticsView() {
  const router = useRouter();
  const [data, setData] = React.useState<AnalyticsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchAnalytics = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analytics');
      if (res.status === 401) {
        setData(null);
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error('Failed to load user analytics');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Error communicating with analytics service');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchAnalytics} />;
  }

  if (!data || data.attemptTotals.totalAttempts === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            Performance Analytics
          </h1>
          <p className="text-sm text-zinc-500">
            Real data insights into your problem-solving velocity, retention, and topic mastery.
          </p>
        </div>

        <EmptyState
          icon={BarChart3}
          title="No analytics records yet"
          description="Analytics will automatically calculate as you solve problems and log practice sessions. Start practicing from the DSA Sheet!"
          actionLabel="Explore DSA Sheet"
          onAction={() => router.push('/sheet')}
        />
      </div>
    );
  }

  const totals = data.attemptTotals;
  const solveRatio =
    totals.totalAttempts > 0
      ? Number(((totals.solvedAttempts / totals.totalAttempts) * 100).toFixed(1))
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
          Performance Analytics
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Derived strictly from verified attempts and spaced repetition review records.
        </p>
      </div>

      {/* Top 4 KPI Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4 space-y-1">
          <span className="text-xs font-medium text-zinc-500">First-Try Solve Ratio</span>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{solveRatio}%</p>
          <p className="text-[11px] text-zinc-400">{totals.solvedAttempts} of {totals.totalAttempts} total attempts</p>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-xs font-medium text-zinc-500">Weekly Study Volume</span>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{formatDuration(totals.past7DaysDurationSeconds)}</p>
          <p className="text-[11px] text-zinc-400">Logged over past 7 days</p>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-xs font-medium text-zinc-500">Hints Leveraged</span>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{data.hintUsageCount}</p>
          <p className="text-[11px] text-zinc-400">Progressive hints revealed</p>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-xs font-medium text-zinc-500">Retention Health</span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {data.revisionDueCount === 0 ? '100%' : `${data.revisionDueCount} Due`}
          </p>
          <p className="text-[11px] text-zinc-400">Spaced repetition reviews</p>
        </Card>
      </div>

      {/* Topic-wise Completion Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Topic-wise Completion</CardTitle>
          <p className="text-xs text-zinc-500">Progress across all 15 syllabus topics</p>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="space-y-2.5">
            {data.topicStats.map((t) => (
              <div key={t.topicSlug} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-zinc-800 dark:text-zinc-200">{t.topicName}</span>
                  <span className="text-zinc-500">
                    {t.solvedProblems}/{t.totalProblems} ({t.percentComplete}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300"
                    style={{ width: `${t.percentComplete}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weak-Pattern Detection & Targeted Practice Card */}
      <Card className="border-rose-200/60 dark:border-rose-900/40">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                <CardTitle className="text-base font-semibold">Weak-Pattern Diagnostics</CardTitle>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Algorithmic patterns flagged based on high failure rates (≥40%), repeated struggles, or low confidence.
              </p>
            </div>
            {data.weakPatterns && data.weakPatterns.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {data.weakPatterns.length} Pattern{data.weakPatterns.length === 1 ? '' : 's'} Flagged
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {!data.weakPatterns || data.weakPatterns.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center dark:border-zinc-800">
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                No weak patterns detected
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Based on your logged attempts, no patterns currently exceed the struggle threshold. Practice more problems to surface targeted recommendations.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.weakPatterns.map((wp) => (
                <div
                  key={wp.patternSlug}
                  className="rounded-xl border border-zinc-200/80 p-3.5 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {wp.patternName}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {wp.topicName}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {wp.reasons.map((r, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[11px] text-rose-600 dark:text-rose-400">
                          <span className="mt-0.5">•</span>
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-500">
                      {wp.solvedCount} of {wp.totalAttempts} attempts solved
                    </span>
                    <Link href={`/sheet?pattern=${wp.patternSlug}`}>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-indigo-600 dark:text-indigo-400">
                        Practice Pattern
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Difficulty and Attempt Trends Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Difficulty Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Difficulty Breakdown</CardTitle>
            <p className="text-xs text-zinc-500">Solved vs attempted by problem difficulty tier</p>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {(['EASY', 'MEDIUM', 'HARD'] as const).map((diff) => {
              const item = data.difficultyDistribution[diff];
              const badge = getDifficultyBadgeColor(diff);
              return (
                <div key={diff} className="flex items-center justify-between p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`${badge.bg} ${badge.text} ${badge.border}`}>
                      {diff}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-medium">
                    <span className="text-emerald-600 dark:text-emerald-400">{item.solved} Solved</span>
                    <span className="text-zinc-400">/</span>
                    <span className="text-blue-600 dark:text-blue-400">{item.attempted} Attempted</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Repeated Failures & Tricky Problems */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Repeated Failures Analysis</CardTitle>
            <p className="text-xs text-zinc-500">Problems with multiple unsuccessful attempts</p>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {data.repeatedFailures.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500">
                No repeat bottlenecks identified. Keep up the high accuracy!
              </div>
            ) : (
              data.repeatedFailures.map((prob) => (
                <div
                  key={prob.problemId}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/problems/${prob.canonicalSlug}`}
                      className="font-medium text-xs text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 block truncate"
                    >
                      {prob.title}
                    </Link>
                    <span className="text-[11px] text-zinc-400">{prob.patternName}</span>
                  </div>
                  <Badge variant="destructive" className="text-xs ml-3 shrink-0">
                    {prob.failedAttempts} Failed Attempts
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
