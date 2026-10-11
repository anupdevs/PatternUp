'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Network,
  ChevronDown,
  ChevronRight,
  Play,
  CheckCircle2,
  Bookmark,
  Repeat,
  Layers,
  ArrowUpDown,
  BookOpen
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { getDifficultyBadgeColor, getStatusBadgeColor } from '@/lib/utils';

interface PatternProblem {
  id: string;
  sheetNumber: number;
  title: string;
  canonicalSlug: string;
  difficulty: string;
  platform: string;
  externalUrl: string | null;
  status: 'NOT_STARTED' | 'ATTEMPTED' | 'SOLVED' | 'NEEDS_REVISION';
  isBookmarked: boolean;
  hasRevision: boolean;
  totalAttempts: number;
}

interface PatternItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  totalProblems: number;
  solvedProblems: number;
  attemptedProblems: number;
  percentComplete: number;
  problems: PatternProblem[];
}

interface TopicHierarchy {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  totalProblems: number;
  solvedProblems: number;
  attemptedProblems: number;
  percentComplete: number;
  difficultyDistribution: { EASY: number; MEDIUM: number; HARD: number };
  patterns: PatternItem[];
}

type OrderMode = 'sheet' | 'difficulty';

export function PatternExplorer() {
  const [hierarchy, setHierarchy] = React.useState<TopicHierarchy[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Expanded topics state (default expand first 3 topics)
  const [expandedTopics, setExpandedTopics] = React.useState<Record<string, boolean>>({});
  const [orderMode, setOrderMode] = React.useState<OrderMode>('sheet');

  const fetchHierarchy = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/patterns/hierarchy');
      if (!res.ok) throw new Error('Failed to load patterns hierarchy');
      const json = await res.json();
      if (json.success) {
        setHierarchy(json.data || []);
        // Automatically expand first 2 topics
        const initialExpanded: Record<string, boolean> = {};
        if (json.data && json.data.length > 0) {
          initialExpanded[json.data[0].id] = true;
          if (json.data.length > 1) initialExpanded[json.data[1].id] = true;
        }
        setExpandedTopics(initialExpanded);
      }
    } catch (err: any) {
      setError(err?.message || 'Error communicating with backend');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchHierarchy();
  }, [fetchHierarchy]);

  const toggleTopic = (topicId: string) => {
    setExpandedTopics((prev) => ({ ...prev, [topicId]: !prev[topicId] }));
  };

  const getSortedProblems = (problems: PatternProblem[]) => {
    const list = [...problems];
    if (orderMode === 'difficulty') {
      const rank: Record<string, number> = { EASY: 1, MEDIUM: 2, HARD: 3, UNKNOWN: 4 };
      list.sort((a, b) => (rank[a.difficulty] || 4) - (rank[b.difficulty] || 4));
    } else {
      list.sort((a, b) => a.sheetNumber - b.sheetNumber);
    }
    return list;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-44 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchHierarchy} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            Pattern Explorer
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Learn DSA systematically by pattern hierarchy across all 15 topics and 37 subtopics.
          </p>
        </div>

        {/* Order Mode Toggle */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="text-xs text-zinc-500">Order by:</span>
          <div className="flex rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-800 dark:bg-zinc-900 text-xs">
            <button
              onClick={() => setOrderMode('sheet')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                orderMode === 'sheet'
                  ? 'bg-white text-zinc-900 shadow-xs font-semibold dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
              }`}
            >
              Sheet Order
            </button>
            <button
              onClick={() => setOrderMode('difficulty')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                orderMode === 'difficulty'
                  ? 'bg-white text-zinc-900 shadow-xs font-semibold dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
              }`}
            >
              Increasing Difficulty
            </button>
          </div>
        </div>
      </div>

      {/* Topics Hierarchy List */}
      <div className="space-y-4">
        {hierarchy.map((topic) => {
          const isExpanded = Boolean(expandedTopics[topic.id]);

          return (
            <Card key={topic.id} className="overflow-hidden">
              {/* Topic Header Accordion Bar */}
              <div
                onClick={() => toggleTopic(topic.id)}
                className="flex flex-col gap-3 p-4 sm:p-5 cursor-pointer bg-zinc-50/50 hover:bg-zinc-100/60 dark:bg-zinc-900/40 dark:hover:bg-zinc-800/40 transition-colors md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-3">
                  <button className="text-zinc-400">
                    {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </button>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                        {topic.name}
                      </h3>
                      <span className="text-xs text-zinc-400">
                        ({topic.patterns.length} pattern{topic.patterns.length === 1 ? '' : 's'})
                      </span>
                    </div>

                    <p className="text-xs text-zinc-500 mt-0.5">
                      {topic.solvedProblems} of {topic.totalProblems} solved ({topic.percentComplete}%)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end md:self-auto">
                  {/* Difficulty pills */}
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {topic.difficultyDistribution.EASY} Easy
                    </span>
                    <span className="text-zinc-300 dark:text-zinc-700">•</span>
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {topic.difficultyDistribution.MEDIUM} Med
                    </span>
                    <span className="text-zinc-300 dark:text-zinc-700">•</span>
                    <span className="text-rose-600 dark:text-rose-400 font-medium">
                      {topic.difficultyDistribution.HARD} Hard
                    </span>
                  </div>

                  <div className="w-24 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden hidden sm:block">
                    <div
                      className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300"
                      style={{ width: `${topic.percentComplete}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Pattern list under this topic */}
              {isExpanded && (
                <div className="p-4 sm:p-5 divide-y divide-zinc-100 dark:divide-zinc-800/80 space-y-5">
                  {topic.patterns.map((pat) => {
                    const sortedProbs = getSortedProblems(pat.problems);
                    const firstUnsolved = pat.problems.find((p) => p.status !== 'SOLVED');

                    return (
                      <div key={pat.id} className="pt-4 first:pt-0 space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                {pat.name}
                              </h4>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {pat.solvedProblems}/{pat.totalProblems}
                              </Badge>
                            </div>
                            {pat.description && (
                              <p className="text-xs text-zinc-500 mt-1 max-w-xl">
                                {pat.description}
                              </p>
                            )}
                          </div>

                          {firstUnsolved && (
                            <Link href={`/problems/${firstUnsolved.canonicalSlug}`}>
                              <Button size="sm" variant="subtle" className="text-xs h-7 gap-1">
                                <Play className="h-3 w-3 fill-current" />
                                {pat.solvedProblems > 0 ? 'Continue Pattern' : 'Start Pattern'}
                              </Button>
                            </Link>
                          )}
                        </div>

                        {/* Problems row / card list within this pattern */}
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {sortedProbs.map((p) => {
                            const diff = getDifficultyBadgeColor(p.difficulty);
                            const stat = getStatusBadgeColor(p.status);

                            return (
                              <Link
                                key={p.id}
                                href={`/problems/${p.canonicalSlug}`}
                                className="group flex items-start justify-between rounded-lg border border-zinc-100 bg-white p-3 shadow-2xs hover:border-indigo-500/30 hover:shadow-xs transition-all dark:border-zinc-800 dark:bg-zinc-900/60"
                              >
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[10px] text-zinc-400">
                                      #{p.sheetNumber}
                                    </span>
                                    <h5 className="font-medium text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                                      {p.title}
                                    </h5>
                                  </div>

                                  <div className="flex items-center gap-1.5 text-[10px]">
                                    <span className={`font-medium ${diff.text}`}>
                                      {p.difficulty}
                                    </span>
                                    <span className="text-zinc-300 dark:text-zinc-700">•</span>
                                    <span className={`${stat.text} font-medium`}>
                                      {stat.label}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                  {p.status === 'SOLVED' && (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                  )}
                                  {p.isBookmarked && (
                                    <Bookmark className="h-3.5 w-3.5 text-amber-500 fill-current" />
                                  )}
                                  {p.hasRevision && (
                                    <Repeat className="h-3.5 w-3.5 text-amber-500" />
                                  )}
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
