'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  Bookmark,
  ExternalLink,
  Filter,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Code,
  CheckCircle2,
  Clock,
  PlayCircle,
  HelpCircle,
  ArrowUpDown
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { useToast } from '@/components/ui/toast';
import { getDifficultyBadgeColor, getStatusBadgeColor } from '@/lib/utils';

export interface SheetProblem {
  id: string;
  canonicalSlug: string;
  title: string;
  difficulty: string;
  platform: string;
  externalUrl: string | null;
  originalPdfQuestionNumber: number;
  sourcePage: string | null;
  tags: string[];
  patterns: Array<{
    sheetNumber: number;
    pdfTitle: string;
    patternName: string;
    patternSlug: string;
    topicName: string;
    topicSlug: string;
  }>;
  userProgress?: {
    status: 'NOT_STARTED' | 'ATTEMPTED' | 'SOLVED' | 'NEEDS_REVISION';
    totalAttempts: number;
    successfulAttempts: number;
    solvedAt: string | null;
  };
  isBookmarked?: boolean;
}

interface TopicOption {
  id: string;
  name: string;
  slug: string;
  patterns: Array<{ id: string; name: string; slug: string }>;
}

export function SheetExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success, error: toastError } = useToast();

  const [problems, setProblems] = React.useState<SheetProblem[]>([]);
  const [topics, setTopics] = React.useState<TopicOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filter state
  const [search, setSearch] = React.useState(searchParams.get('search') || '');
  const [selectedTopic, setSelectedTopic] = React.useState(searchParams.get('topic') || '');
  const [selectedPattern, setSelectedPattern] = React.useState(searchParams.get('pattern') || '');
  const [selectedDifficulty, setSelectedDifficulty] = React.useState(searchParams.get('difficulty') || '');
  const [selectedStatus, setSelectedStatus] = React.useState(searchParams.get('status') || '');
  const [onlyBookmarked, setOnlyBookmarked] = React.useState(searchParams.get('bookmarked') === 'true');
  const [sortBy, setSortBy] = React.useState<'number' | 'difficulty' | 'title' | 'attempts'>('number');
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(50);
  const [totalCount, setTotalCount] = React.useState(0);

  // Fetch topics list for dropdown
  React.useEffect(() => {
    fetch('/api/topics')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setTopics(json.data);
      })
      .catch(() => {});
  }, []);

  // Fetch problems with current filters
  const fetchProblems = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      query.set('page', page.toString());
      query.set('limit', limit.toString());
      if (search.trim()) query.set('search', search.trim());
      if (selectedTopic) query.set('topic', selectedTopic);
      if (selectedPattern) query.set('pattern', selectedPattern);
      if (selectedDifficulty) query.set('difficulty', selectedDifficulty);
      if (selectedStatus) query.set('status', selectedStatus);
      if (onlyBookmarked) query.set('bookmarked', 'true');

      const res = await fetch(`/api/problems?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch problems from catalog');

      const json = await res.json();
      if (json.success) {
        setProblems(json.data.problems || []);
        setTotalCount(json.data.pagination?.totalCount || 0);
      } else {
        throw new Error(json.error || 'Server error');
      }
    } catch (err: any) {
      setError(err?.message || 'Error communicating with catalog backend');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, selectedTopic, selectedPattern, selectedDifficulty, selectedStatus, onlyBookmarked]);

  React.useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  // Client-side sort if needed
  const sortedProblems = React.useMemo(() => {
    const list = [...problems];
    if (sortBy === 'difficulty') {
      const rank = { EASY: 1, MEDIUM: 2, HARD: 3, UNKNOWN: 4 };
      list.sort((a, b) => (rank[a.difficulty as keyof typeof rank] || 4) - (rank[b.difficulty as keyof typeof rank] || 4));
    } else if (sortBy === 'title') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'attempts') {
      list.sort((a, b) => (b.userProgress?.totalAttempts || 0) - (a.userProgress?.totalAttempts || 0));
    } else {
      // Default: sheet number
      list.sort((a, b) => a.originalPdfQuestionNumber - b.originalPdfQuestionNumber);
    }
    return list;
  }, [problems, sortBy]);

  // Handle bookmark toggle
  const handleToggleBookmark = async (problemId: string, currentBookmarked: boolean) => {
    // Optimistic update
    setProblems((prev) =>
      prev.map((p) => (p.id === problemId ? { ...p, isBookmarked: !currentBookmarked } : p))
    );

    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId, bookmarked: !currentBookmarked })
      });
      if (!res.ok) throw new Error('Failed to update bookmark');
      success(
        !currentBookmarked ? 'Bookmarked problem' : 'Removed bookmark',
        'Your bookmark list has been updated.'
      );
    } catch (err: any) {
      // Revert optimistic update
      setProblems((prev) =>
        prev.map((p) => (p.id === problemId ? { ...p, isBookmarked: currentBookmarked } : p))
      );
      toastError('Bookmark error', err?.message || 'Could not save bookmark');
    }
  };

  // Handle status update
  const handleQuickStatusChange = async (slugOrId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/problems/${slugOrId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');

      setProblems((prev) =>
        prev.map((p) => {
          if (p.canonicalSlug === slugOrId || p.id === slugOrId) {
            return {
              ...p,
              userProgress: {
                ...(p.userProgress || { totalAttempts: 0, successfulAttempts: 0, solvedAt: null }),
                status: newStatus as any
              }
            };
          }
          return p;
        })
      );
      success('Status updated', `Problem status set to ${newStatus.replace('_', ' ')}.`);
    } catch (err: any) {
      toastError('Status update failed', err?.message || 'Could not update status');
    }
  };

  // Reset filters
  const resetFilters = () => {
    setSearch('');
    setSelectedTopic('');
    setSelectedPattern('');
    setSelectedDifficulty('');
    setSelectedStatus('');
    setOnlyBookmarked(false);
    setSortBy('number');
    setPage(1);
  };

  const selectedTopicData = topics.find((t) => t.slug === selectedTopic);
  const patternsForSelectedTopic = selectedTopicData?.patterns || [];
  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6">
      {/* Header and Title */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            DSA Sheet Explorer
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            All 211 verified questions from the Bosscoder DSA curriculum with original numbering.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="text-xs gap-1.5 h-8"
          >
            <RotateCcw className="h-3 w-3" />
            Reset filters
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search Input */}
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search problem title, sheet number (#1), or tag..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 text-xs"
              />
            </div>

            {/* Topic Filter */}
            <select
              value={selectedTopic}
              onChange={(e) => {
                setSelectedTopic(e.target.value);
                setSelectedPattern('');
                setPage(1);
              }}
              className="flex h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-800 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="">All Topics (15)</option>
              {topics.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </select>

            {/* Pattern Filter (filtered by topic if chosen) */}
            <select
              value={selectedPattern}
              disabled={patternsForSelectedTopic.length === 0 && !selectedPattern}
              onChange={(e) => {
                setSelectedPattern(e.target.value);
                setPage(1);
              }}
              className="flex h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-800 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 disabled:opacity-50"
            >
              <option value="">
                {selectedTopic ? 'All Patterns in Topic' : 'Select Topic First for Patterns'}
              </option>
              {patternsForSelectedTopic.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
            <div className="flex flex-wrap items-center gap-2">
              {/* Difficulty filter */}
              <select
                value={selectedDifficulty}
                onChange={(e) => {
                  setSelectedDifficulty(e.target.value);
                  setPage(1);
                }}
                className="h-8 rounded-md border border-zinc-200 bg-white px-2.5 text-xs text-zinc-700 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              >
                <option value="">All Difficulties</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>

              {/* Status filter */}
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="h-8 rounded-md border border-zinc-200 bg-white px-2.5 text-xs text-zinc-700 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              >
                <option value="">All Progress States</option>
                <option value="SOLVED">Solved</option>
                <option value="ATTEMPTED">Attempted</option>
                <option value="NEEDS_REVISION">Needs Revision</option>
                <option value="NOT_STARTED">Not Started</option>
              </select>

              {/* Bookmarked toggle */}
              <Button
                variant={onlyBookmarked ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setOnlyBookmarked(!onlyBookmarked);
                  setPage(1);
                }}
                className="h-8 text-xs gap-1"
              >
                <Bookmark className={`h-3.5 w-3.5 ${onlyBookmarked ? 'fill-current' : ''}`} />
                Bookmarked
              </Button>

              {/* Sort by */}
              <div className="flex items-center gap-1.5 ml-2 text-xs text-zinc-500">
                <ArrowUpDown className="h-3 w-3" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-700 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  <option value="number">Sheet Order (#1-211)</option>
                  <option value="difficulty">Difficulty</option>
                  <option value="title">Title (A-Z)</option>
                  <option value="attempts">Attempt Count</option>
                </select>
              </div>
            </div>

            {/* Results count */}
            <span className="text-xs text-zinc-500">
              Showing {sortedProblems.length} of {totalCount} problem{totalCount === 1 ? '' : 's'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Main Problem List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchProblems} />
      ) : sortedProblems.length === 0 ? (
        <EmptyState
          title="No problems found"
          description="No problems matched your current filters. Try resetting or adjusting your query criteria."
          actionLabel="Reset filters"
          onAction={resetFilters}
        />
      ) : (
        <div className="space-y-4">
          {/* Desktop Table */}
          <div className="hidden md:block rounded-xl border border-zinc-200/80 bg-white shadow-xs overflow-hidden dark:border-zinc-800/80 dark:bg-zinc-900/60">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[680px]">
                <thead className="bg-zinc-50/80 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-medium">
                  <tr>
                    <th className="py-3 px-4 w-16 text-center">#</th>
                    <th className="py-3 px-4">Problem Title</th>
                    <th className="py-3 px-4">Topic & Pattern</th>
                    <th className="py-3 px-4 w-28 text-center">Difficulty</th>
                    <th className="py-3 px-4 w-32 text-center">Status</th>
                    <th className="py-3 px-4 w-24 text-center">Attempts</th>
                    <th className="py-3 px-4 w-28 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {sortedProblems.map((p) => {
                    const status = p.userProgress?.status || 'NOT_STARTED';
                    const statusBadge = getStatusBadgeColor(status);
                    const diffBadge = getDifficultyBadgeColor(p.difficulty);
                    const firstPat = p.patterns[0];

                    return (
                      <tr
                        key={p.id}
                        className="group hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors"
                      >
                        {/* Sheet Number */}
                        <td className="py-3 px-4 text-center font-mono font-medium text-zinc-400 dark:text-zinc-500">
                          #{p.originalPdfQuestionNumber}
                        </td>

                        {/* Title & Platform */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/problems/${p.canonicalSlug}`}
                              className="font-semibold text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            >
                              {p.title}
                            </Link>
                            {p.externalUrl && (
                              <a
                                href={p.externalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                                title={`Practice on ${p.platform}`}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Topic & Pattern */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-zinc-800 dark:text-zinc-200">
                              {firstPat?.topicName || 'General'}
                            </span>
                            <span className="text-[11px] text-zinc-500">
                              {firstPat?.patternName || 'Unclassified'}
                            </span>
                          </div>
                        </td>

                        {/* Difficulty */}
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant="outline"
                            className={`${diffBadge.bg} ${diffBadge.text} ${diffBadge.border} font-medium text-[11px]`}
                          >
                            {p.difficulty}
                          </Badge>
                        </td>

                        {/* Status Dropdown */}
                        <td className="py-3 px-4 text-center">
                          <select
                            value={status}
                            onChange={(e) => handleQuickStatusChange(p.canonicalSlug, e.target.value)}
                            className={`text-[11px] font-medium rounded-md px-2 py-1 border transition-colors cursor-pointer ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                          >
                            <option value="NOT_STARTED">Not Started</option>
                            <option value="ATTEMPTED">Attempted</option>
                            <option value="SOLVED">Solved</option>
                            <option value="NEEDS_REVISION">Needs Revision</option>
                          </select>
                        </td>

                        {/* Attempts count */}
                        <td className="py-3 px-4 text-center text-zinc-500 font-mono">
                          {p.userProgress?.totalAttempts || 0}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleBookmark(p.id, Boolean(p.isBookmarked))}
                              className={`p-1.5 rounded-md transition-colors ${
                                p.isBookmarked
                                  ? 'text-amber-500 hover:text-amber-600'
                                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                              }`}
                              title={p.isBookmarked ? 'Remove bookmark' : 'Bookmark problem'}
                              aria-label={p.isBookmarked ? 'Remove bookmark' : 'Bookmark problem'}
                            >
                              <Bookmark className={`h-4 w-4 ${p.isBookmarked ? 'fill-current' : ''}`} />
                            </button>
                            <Link href={`/problems/${p.canonicalSlug}`}>
                              <Button size="sm" variant="ghost" className="h-7 text-xs px-2.5">
                                Solve
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards View */}
          <div className="grid gap-3 md:hidden">
            {sortedProblems.map((p) => {
              const status = p.userProgress?.status || 'NOT_STARTED';
              const statusBadge = getStatusBadgeColor(status);
              const diffBadge = getDifficultyBadgeColor(p.difficulty);
              const firstPat = p.patterns[0];

              return (
                <Card key={p.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-mono text-xs font-semibold text-zinc-400 shrink-0">
                        #{p.originalPdfQuestionNumber}
                      </span>
                      <Link
                        href={`/problems/${p.canonicalSlug}`}
                        className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 break-words"
                      >
                        {p.title}
                      </Link>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleBookmark(p.id, Boolean(p.isBookmarked))}
                      className={`p-1 text-zinc-400 shrink-0 ${p.isBookmarked ? 'text-amber-500' : ''}`}
                      aria-label={p.isBookmarked ? 'Remove bookmark' : 'Bookmark problem'}
                    >
                      <Bookmark className={`h-4 w-4 ${p.isBookmarked ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span className="truncate pr-2">
                      {firstPat?.topicName} • {firstPat?.patternName}
                    </span>
                    <Badge variant="outline" className={`${diffBadge.text} text-[10px] shrink-0`}>
                      {p.difficulty}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800 gap-2">
                    <select
                      value={status}
                      onChange={(e) => handleQuickStatusChange(p.canonicalSlug, e.target.value)}
                      className={`text-xs rounded-md px-2 py-1 border ${statusBadge.bg} ${statusBadge.text}`}
                    >
                      <option value="NOT_STARTED">Not Started</option>
                      <option value="ATTEMPTED">Attempted</option>
                      <option value="SOLVED">Solved</option>
                      <option value="NEEDS_REVISION">Needs Revision</option>
                    </select>

                    <Link href={`/problems/${p.canonicalSlug}`}>
                      <Button size="sm" className="h-7 text-xs">
                        Open Workspace
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 py-2 text-xs text-zinc-500">
              <div className="flex items-center gap-2">
                <span>Page {page} of {totalPages}</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-7 rounded-md border border-zinc-200 bg-white px-2 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                  <option value={250}>All (211)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 w-8 p-0"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 w-8 p-0"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
