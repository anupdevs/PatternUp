'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Repeat, CheckCircle2, Play } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { formatDate, getDifficultyBadgeColor } from '@/lib/utils';

interface DueRevisionItem {
  id: string;
  nextReviewAt: string | Date;
  intervalDays: number;
  repetitionCount: number;
  easeFactor: number;
  lastReviewedAt: string | Date | null;
  problem: {
    id: string;
    title: string;
    canonicalSlug: string;
    difficulty: string;
    originalPdfQuestionNumber: number;
    patterns: Array<{
      sheetNumber: number;
      pattern: {
        name: string;
        topic: { name: string; slug: string };
      };
    }>;
    progress: Array<{
      status: string;
      totalAttempts: number;
    }>;
  };
}

export function RevisionQueueView() {
  const router = useRouter();
  const [queue, setQueue] = React.useState<DueRevisionItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [ratingLoading, setRatingLoading] = React.useState<string | null>(null);

  const fetchQueue = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Include upcoming 24 hours
      const res = await fetch('/api/revisions?upcomingHours=24');
      if (res.status === 401) {
        setQueue([]);
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error('Failed to load revision queue');
      const json = await res.json();
      if (json.success) {
        setQueue(json.data || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Error communicating with revision service');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRateReview = async (problemId: string, rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY') => {
    setRatingLoading(problemId);
    try {
      const res = await fetch('/api/revisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId, rating })
      });

      if (!res.ok) throw new Error('Failed to record review rating');
      const json = await res.json();
      if (json.success) {
        // Remove reviewed item from current due queue
        setQueue((prev) => prev.filter((item) => item.problem.id !== problemId));
      }
    } catch (err: any) {
      alert(err?.message || 'Error submitting review rating');
    } finally {
      setRatingLoading(null);
    }
  };

  React.useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchQueue} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            Revision Queue
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Scientifically scheduled reviews using the SM-2 spaced repetition algorithm. Rate your recall to adjust future intervals.
          </p>
        </div>

        <Badge variant="outline" className="self-start sm:self-auto text-amber-700 bg-amber-50/50 border-amber-500/20 dark:text-amber-400 dark:bg-amber-950/20">
          {queue.length} Due for Review
        </Badge>
      </div>

      {queue.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="All caught up!"
          description="You have zero overdue reviews. Excellent work maintaining your algorithm retention! When you solve problems, spaced reviews will be scheduled automatically."
          actionLabel="Practice more problems"
          onAction={() => router.push('/sheet')}
        />
      ) : (
        <div className="space-y-3">
          {queue.map((item) => {
            const prob = item.problem;
            const diff = getDifficultyBadgeColor(prob.difficulty);
            const pat = prob.patterns[0];
            const isOverdue = new Date(item.nextReviewAt) < new Date();
            const isSubmitting = ratingLoading === prob.id;

            return (
              <Card
                key={item.id}
                className="p-4 transition-all hover:border-amber-500/30 dark:hover:border-amber-500/30 space-y-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-zinc-400">
                        #{prob.originalPdfQuestionNumber}
                      </span>
                      <Link
                        href={`/problems/${prob.canonicalSlug}`}
                        className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 truncate block"
                      >
                        {prob.title}
                      </Link>
                      <Badge variant="outline" className={`${diff.text} text-[10px]`}>
                        {prob.difficulty}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                      <span>{pat?.pattern.topic.name} • {pat?.pattern.name}</span>
                      <span>•</span>
                      <span>Streak: #{item.repetitionCount}</span>
                      <span>•</span>
                      <span>Interval: {item.intervalDays.toFixed(1)} days</span>
                      <span>•</span>
                      <span className={isOverdue ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>
                        Due: {formatDate(item.nextReviewAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <Link href={`/problems/${prob.canonicalSlug}`}>
                      <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                        <Play className="h-3.5 w-3.5" />
                        Workspace
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Direct SM-2 Spaced Repetition Rating Controls */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                    Quick Review Outcome:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isSubmitting}
                      onClick={() => handleRateReview(prob.id, 'AGAIN')}
                      className="h-7 text-[11px] px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
                    >
                      Again (1d)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isSubmitting}
                      onClick={() => handleRateReview(prob.id, 'HARD')}
                      className="h-7 text-[11px] px-2 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/40"
                    >
                      Hard (×1.2)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isSubmitting}
                      onClick={() => handleRateReview(prob.id, 'GOOD')}
                      className="h-7 text-[11px] px-2 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/40"
                    >
                      Good (Normal)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isSubmitting}
                      onClick={() => handleRateReview(prob.id, 'EASY')}
                      className="h-7 text-[11px] px-2 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                    >
                      Easy (Boost)
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
