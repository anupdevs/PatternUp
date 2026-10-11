'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  FolderKanban,
  Plus,
  Trash2,
  ExternalLink,
  ChevronRight,
  BookOpen,
  Sparkles,
  Layers,
  CheckCircle2,
  X
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { useToast } from '@/components/ui/toast';
import { getDifficultyBadgeColor, getStatusBadgeColor } from '@/lib/utils';

interface CollectionItem {
  id: string;
  name: string;
  description: string;
  color: string;
  isDefault: boolean;
  problemIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface CollectionDetail {
  collection: CollectionItem;
  problems: Array<{
    id: string;
    canonicalSlug: string;
    title: string;
    difficulty: string;
    originalPdfQuestionNumber: number;
    platform: string;
    externalUrl: string | null;
    patterns: Array<{
      pattern: {
        name: string;
        topic: { name: string; slug: string };
      };
    }>;
    progress: Array<{
      status: string;
      totalAttempts: number;
    }>;
  }>;
}

export function CollectionsView() {
  const { success, error: toastError } = useToast();

  const [collections, setCollections] = React.useState<CollectionItem[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [activeDetail, setActiveDetail] = React.useState<CollectionDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingDetail, setLoadingDetail] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // New collection modal state
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [newColName, setNewColName] = React.useState('');
  const [newColDesc, setNewColDesc] = React.useState('');
  const [newColColor, setNewColColor] = React.useState('indigo');
  const [creating, setCreating] = React.useState(false);

  const fetchCollections = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/collections');
      if (res.status === 401) {
        setCollections([]);
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error('Failed to load collections');
      const json = await res.json();
      if (json.success) {
        setCollections(json.data || []);
        if (json.data && json.data.length > 0 && !selectedId) {
          setSelectedId(json.data[0].id);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Error fetching collections');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  const fetchDetail = React.useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/collections/${id}`);
      if (!res.ok) throw new Error('Failed to load collection details');
      const json = await res.json();
      if (json.success) {
        setActiveDetail(json.data);
      }
    } catch (err: any) {
      toastError('Load Error', err?.message);
    } finally {
      setLoadingDetail(false);
    }
  }, [toastError]);

  React.useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  React.useEffect(() => {
    if (selectedId) {
      fetchDetail(selectedId);
    }
  }, [selectedId, fetchDetail]);

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newColName.trim(),
          description: newColDesc.trim(),
          color: newColColor
        })
      });

      if (!res.ok) {
        const errorJson = await res.json();
        throw new Error(errorJson.error || 'Failed to create collection');
      }

      const json = await res.json();
      if (json.success) {
        success('Collection Created', `Created collection "${newColName}".`);
        setNewColName('');
        setNewColDesc('');
        setShowCreateModal(false);
        setCollections((prev) => [...prev, json.data]);
        setSelectedId(json.data.id);
      }
    } catch (err: any) {
      toastError('Creation Failed', err?.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCollection = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the collection "${name}"?`)) return;

    try {
      const res = await fetch(`/api/collections/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete collection');

      success('Collection Deleted', `Deleted "${name}".`);
      const remaining = collections.filter((c) => c.id !== id);
      setCollections(remaining);
      if (selectedId === id) {
        setSelectedId(remaining.length > 0 ? remaining[0].id : null);
        setActiveDetail(null);
      }
    } catch (err: any) {
      toastError('Delete Failed', err?.message);
    }
  };

  const handleRemoveProblem = async (problemSlug: string) => {
    if (!selectedId) return;

    try {
      const res = await fetch(`/api/collections/${selectedId}/problems?problemId=${problemSlug}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to remove problem');

      success('Problem Removed', 'Removed from this collection.');
      // Refresh details and collection counter
      fetchDetail(selectedId);
      setCollections((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? { ...c, problemIds: c.problemIds.filter((p) => p !== problemSlug) }
            : c
        )
      );
    } catch (err: any) {
      toastError('Remove Failed', err?.message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-full rounded-xl" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl md:col-span-2" />
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchCollections} />;
  }

  const selectedCol = collections.find((c) => c.id === selectedId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            Problem Collections
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Organize core interview questions into personalized focus lists and custom study tracks.
          </p>
        </div>

        <Button
          onClick={() => setShowCreateModal(true)}
          className="self-start sm:self-auto text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Plus className="h-4 w-4" />
          New Collection
        </Button>
      </div>

      {/* Main Grid: Collections List + Details Pane */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Collection Tabs */}
        <div className="space-y-2">
          {collections.map((col) => {
            const isSelected = col.id === selectedId;
            return (
              <div
                key={col.id}
                onClick={() => setSelectedId(col.id)}
                className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs dark:border-indigo-500 dark:bg-indigo-950/30'
                    : 'border-zinc-200/80 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                      {col.name}
                    </span>
                    {col.isDefault && (
                      <Badge variant="outline" className="text-[10px] py-0 px-1 text-zinc-500">
                        Preset
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                    {col.description || 'Custom collection'}
                  </p>
                </div>

                <div className="flex items-center gap-2 ml-2">
                  <Badge variant="secondary" className="text-xs font-mono">
                    {col.problemIds.length}
                  </Badge>
                  {!col.isDefault && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCollection(col.id, col.name);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-rose-600 transition-opacity p-1"
                      title="Delete collection"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Collection Problems Details */}
        <div className="md:col-span-2">
          {selectedCol ? (
            <Card className="min-h-[400px]">
              <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">{selectedCol.name}</CardTitle>
                    <p className="text-xs text-zinc-500 mt-0.5">{selectedCol.description}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {selectedCol.problemIds.length} Problem{selectedCol.problemIds.length === 1 ? '' : 's'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4">
                {loadingDetail ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                  </div>
                ) : !activeDetail || activeDetail.problems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center dark:border-zinc-800">
                    <FolderKanban className="mx-auto h-8 w-8 text-zinc-400" />
                    <p className="mt-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      No problems in this collection yet
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-500 max-w-sm mx-auto">
                      Navigate to any problem workspace or the DSA sheet and click &quot;Add to Collection&quot; to curate this list.
                    </p>
                    <div className="mt-4">
                      <Link href="/sheet">
                        <Button size="sm" variant="outline" className="text-xs">
                          Browse DSA Sheet
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {activeDetail.problems.map((prob) => {
                      const diff = getDifficultyBadgeColor(prob.difficulty);
                      const pat = prob.patterns[0]?.pattern;
                      const status = prob.progress[0]?.status || 'NOT_STARTED';
                      const statusBadge = getStatusBadgeColor(status);

                      return (
                        <div
                          key={prob.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-zinc-200/80 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/30 hover:border-indigo-500/40 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-zinc-400">
                                #{prob.originalPdfQuestionNumber}
                              </span>
                              <Link
                                href={`/problems/${prob.canonicalSlug}`}
                                className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 truncate block"
                              >
                                {prob.title}
                              </Link>
                              <Badge variant="outline" className={`${diff.text} text-[10px]`}>
                                {prob.difficulty}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500">
                              <span>{pat?.topic.name} • {pat?.name}</span>
                              <span>•</span>
                              <span className={statusBadge.text}>{statusBadge.label}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-3 shrink-0">
                            <Link href={`/problems/${prob.canonicalSlug}`}>
                              <Button size="sm" variant="outline" className="h-7 text-xs">
                                Solve
                              </Button>
                            </Link>
                            <button
                              onClick={() => handleRemoveProblem(prob.canonicalSlug)}
                              className="text-zinc-400 hover:text-rose-600 transition-colors p-1"
                              title="Remove from collection"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center dark:border-zinc-800">
              <p className="text-xs text-zinc-500">Select a collection on the left to view questions</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Collection Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Create New Collection
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Create a custom target group such as &quot;Greedy Traps&quot; or &quot;Google Onsite Priority&quot;.
            </p>

            <form onSubmit={handleCreateCollection} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Collection Name
                </label>
                <Input
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="e.g. Tree Recursion Mastery"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Description (Optional)
                </label>
                <Input
                  value={newColDesc}
                  onChange={(e) => setNewColDesc(e.target.value)}
                  placeholder="Targeting DFS & divide-and-conquer subproblems"
                  className="mt-1"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={creating}
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Create Collection
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
