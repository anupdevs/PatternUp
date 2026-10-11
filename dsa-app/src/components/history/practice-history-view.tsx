'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { History, Search, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { formatDateTime, formatDuration, getDifficultyBadgeColor } from '@/lib/utils';

interface AttemptRecord {
  id: string;
  attemptedAt: string | Date;
  outcome: 'SOLVED' | 'PARTIALLY_SOLVED' | 'FAILED';
  durationSeconds: number;
  approachNotes: string | null;
  difficultyExperienced: number | null;
  problem: {
    id: string;
    title: string;
    canonicalSlug: string;
    difficulty: string;
    originalPdfQuestionNumber: number;
    topicName: string;
    topicSlug: string;
    patternName: string;
  };
}

export function PracticeHistoryView() {
  const router = useRouter();
  const [attempts, setAttempts] = React.useState<AttemptRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [outcomeFilter, setOutcomeFilter] = React.useState<string>('');
  const [search, setSearch] = React.useState<string>('');

  const fetchAttempts = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (outcomeFilter) query.set('outcome', outcomeFilter);

      const res = await fetch(`/api/attempts?${query.toString()}`);
      if (res.status === 401) {
        setAttempts([]);
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error('Failed to load practice history');
      const json = await res.json();
      if (json.success) {
        setAttempts(json.data.attempts || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Error communicating with attempts service');
    } finally {
      setLoading(false);
    }
  }, [outcomeFilter]);

  React.useEffect(() => {
    fetchAttempts();
  }, [fetchAttempts]);

  const filteredAttempts = React.useMemo(() => {
    if (!search.trim()) return attempts;
    const q = search.toLowerCase();
    return attempts.filter(
      (a) =>
        a.problem.title.toLowerCase().includes(q) ||
        a.problem.topicName.toLowerCase().includes(q) ||
        a.problem.patternName.toLowerCase().includes(q)
    );
  }, [attempts, search]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchAttempts} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            Practice History
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Chronological record of all problem solving attempts and reflections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Outcome filter */}
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="h-8 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs text-zinc-700 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <option value="">All Outcomes</option>
            <option value="SOLVED">Solved Only</option>
            <option value="PARTIALLY_SOLVED">Partial Only</option>
            <option value="FAILED">Unsuccessful Only</option>
          </select>
        </div>
      </div>

      {filteredAttempts.length === 0 ? (
        <EmptyState
          icon={History}
          title="No practice attempts recorded"
          description="Log attempts from any problem workspace using the practice tracker to build your progress timeline."
          actionLabel="Go to DSA Sheet"
          onAction={() => router.push('/sheet')}
        />
      ) : (
        <div className="space-y-3">
          {filteredAttempts.map((att) => {
            const outcomeBadge =
              att.outcome === 'SOLVED'
                ? { label: 'Solved', variant: 'success' as const, icon: CheckCircle2 }
                : att.outcome === 'PARTIALLY_SOLVED'
                ? { label: 'Partial', variant: 'warning' as const, icon: AlertTriangle }
                : { label: 'Unsuccessful', variant: 'destructive' as const, icon: XCircle };

            const OutcomeIcon = outcomeBadge.icon;

            return (
              <Card key={att.id} className="p-4 space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-zinc-400 font-semibold">
                      #{att.problem.originalPdfQuestionNumber}
                    </span>
                    <Link
                      href={`/problems/${att.problem.canonicalSlug}`}
                      className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 truncate"
                    >
                      {att.problem.title}
                    </Link>
                    <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">
                      {att.problem.difficulty}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                    <span className="flex items-center gap-1 text-xs text-zinc-400 font-mono">
                      <Clock className="h-3 w-3" />
                      {formatDuration(att.durationSeconds)}
                    </span>
                    <Badge variant={outcomeBadge.variant} className="gap-1 text-xs px-2 py-0.5">
                      <OutcomeIcon className="h-3 w-3" />
                      {outcomeBadge.label}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-500 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                  <span>
                    {att.problem.topicName} • {att.problem.patternName}
                  </span>
                  <span>{formatDateTime(att.attemptedAt)}</span>
                </div>

                {att.approachNotes && (
                  <div className="mt-2 rounded-lg bg-zinc-50 p-2.5 text-xs text-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-300 font-mono">
                    <span className="font-semibold text-zinc-500 font-sans block text-[11px] mb-0.5">
                      Approach Reflection:
                    </span>
                    {att.approachNotes}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
