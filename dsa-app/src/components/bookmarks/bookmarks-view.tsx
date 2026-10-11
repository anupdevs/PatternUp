'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark, Search, Trash2, Play } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { useToast } from '@/components/ui/toast';
import { getDifficultyBadgeColor } from '@/lib/utils';

interface BookmarkRecord {
  id: string;
  createdAt: string | Date;
  problem: {
    id: string;
    title: string;
    canonicalSlug: string;
    difficulty: string;
    originalPdfQuestionNumber: number;
    platform: string;
    externalUrl: string | null;
    patterns: Array<{
      sheetNumber: number;
      pattern: {
        name: string;
        topic: { name: string; slug: string };
      };
    }>;
  };
}

export function BookmarksView() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [bookmarks, setBookmarks] = React.useState<BookmarkRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');

  const fetchBookmarks = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/bookmarks');
      if (res.status === 401) {
        setBookmarks([]);
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error('Failed to load bookmarks');
      const json = await res.json();
      if (json.success) {
        setBookmarks(json.data || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Error communicating with bookmark service');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const handleRemoveBookmark = async (problemId: string) => {
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId, bookmarked: false })
      });
      if (!res.ok) throw new Error('Could not remove bookmark');

      setBookmarks((prev) => prev.filter((b) => b.problem.id !== problemId));
      success('Bookmark removed', 'Problem has been removed from your bookmarks.');
    } catch (err: any) {
      toastError('Remove bookmark failed', err?.message);
    }
  };

  const filteredBookmarks = React.useMemo(() => {
    if (!search.trim()) return bookmarks;
    const q = search.toLowerCase();
    return bookmarks.filter(
      (b) =>
        b.problem.title.toLowerCase().includes(q) ||
        b.problem.canonicalSlug.toLowerCase().includes(q) ||
        b.problem.patterns[0]?.pattern.name.toLowerCase().includes(q) ||
        b.problem.patterns[0]?.pattern.topic.name.toLowerCase().includes(q)
    );
  }, [bookmarks, search]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchBookmarks} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            My Bookmarks
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Problems saved for priority review or deep dive practice.
          </p>
        </div>

        <div className="w-full sm:w-64">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search bookmarks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
        </div>
      </div>

      {filteredBookmarks.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title={search ? 'No matching bookmarks' : 'No bookmarked problems'}
          description={
            search
              ? 'No bookmarks matched your search query.'
              : 'You have not bookmarked any problems yet. Use the bookmark icon in the DSA sheet or workspace to bookmark key questions.'
          }
          actionLabel="Explore DSA Sheet"
          onAction={() => router.push('/sheet')}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBookmarks.map((b) => {
            const prob = b.problem;
            const diff = getDifficultyBadgeColor(prob.difficulty);
            const pat = prob.patterns[0];

            return (
              <Card key={b.id} className="p-4 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[11px] font-semibold text-zinc-400">
                      #{prob.originalPdfQuestionNumber}
                    </span>
                    <Badge variant="outline" className={`${diff.text} text-[10px]`}>
                      {prob.difficulty}
                    </Badge>
                  </div>

                  <Link
                    href={`/problems/${prob.canonicalSlug}`}
                    className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 block line-clamp-2"
                  >
                    {prob.title}
                  </Link>

                  <p className="text-xs text-zinc-500 truncate">
                    {pat?.pattern.topic.name} • {pat?.pattern.name}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    onClick={() => handleRemoveBookmark(prob.id)}
                    className="text-xs text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors flex items-center gap-1"
                    title="Remove from bookmarks"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>

                  <Link href={`/problems/${prob.canonicalSlug}`}>
                    <Button size="sm" className="h-7 text-xs gap-1">
                      <Play className="h-3 w-3 fill-current" />
                      Solve
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
