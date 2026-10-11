'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Bookmark,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ArrowLeft,
  FolderKanban,
  Check,
  X
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProgressiveHints, ProgressiveHintItem } from './progressive-hints';
import { PersonalNotes } from './personal-notes';
import { PracticeTracker } from './practice-tracker';
import { useToast } from '@/components/ui/toast';
import { getDifficultyBadgeColor, getStatusBadgeColor } from '@/lib/utils';

export interface ProblemDetailData {
  id: string;
  canonicalSlug: string;
  title: string;
  description: string | null;
  difficulty: string;
  difficultySource: string;
  platform: string;
  externalUrl: string | null;
  originalPdfQuestionNumber: number;
  sourcePage: string | null;
  tags: string[];
  examples: any;
  constraints: any;
  patterns: Array<{
    sheetNumber: number;
    pdfTitle: string;
    pdfPage: number;
    patternName: string;
    patternSlug: string;
    topicName: string;
    topicSlug: string;
  }>;
  hints: ProgressiveHintItem[];
  userProgress: {
    status: 'NOT_STARTED' | 'ATTEMPTED' | 'SOLVED' | 'NEEDS_REVISION';
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    totalTimeSpentSeconds: number;
    firstAttemptAt: string | null;
    lastAttemptAt: string | null;
    solvedAt: string | null;
    personalDifficulty: number | null;
    confidenceRating: number | null;
  };
  userNote: {
    id: string;
    content: string;
    updatedAt: string | Date;
  } | null;
  isBookmarked: boolean;
  revisionSchedule: {
    nextReviewAt: string | Date;
    intervalDays: number;
    repetitionCount: number;
    easeFactor: number;
    lastReviewedAt: string | Date | null;
  } | null;
}

interface ProblemWorkspaceProps {
  problem: ProblemDetailData;
  patternNeighbors?: {
    prevSlug?: string;
    nextSlug?: string;
    currentIndex?: number;
    totalInPattern?: number;
  };
}

export function ProblemWorkspace({ problem, patternNeighbors }: ProblemWorkspaceProps) {
  const { success, error: toastError } = useToast();

  const [isBookmarked, setIsBookmarked] = React.useState(problem.isBookmarked);
  const [currentStatus, setCurrentStatus] = React.useState(problem.userProgress?.status || 'NOT_STARTED');
  const [revisionSchedule, setRevisionSchedule] = React.useState(problem.revisionSchedule);
  const [practiceCount, setPracticeCount] = React.useState(problem.userProgress?.totalAttempts || 0);

  // Collections state
  const [showColPicker, setShowColPicker] = React.useState(false);
  const [userCollections, setUserCollections] = React.useState<Array<{ id: string; name: string; problemIds: string[] }>>([]);
  const [loadingCols, setLoadingCols] = React.useState(false);

  const diffBadge = getDifficultyBadgeColor(problem.difficulty);
  const statusBadge = getStatusBadgeColor(currentStatus);
  const primaryPattern = problem.patterns[0];

  const handleToggleBookmark = async () => {
    const nextState = !isBookmarked;
    setIsBookmarked(nextState);

    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: problem.id,
          bookmarked: nextState
        })
      });
      if (!res.ok) throw new Error('Bookmark toggle failed');

      success(
        nextState ? 'Problem Bookmarked' : 'Bookmark Removed',
        'Updated your bookmarks collection.'
      );
    } catch (err: any) {
      setIsBookmarked(!nextState); // revert
      toastError('Bookmark error', err?.message);
    }
  };

  const handleOpenColPicker = async () => {
    setShowColPicker(true);
    setLoadingCols(true);
    try {
      const res = await fetch('/api/collections');
      if (res.ok) {
        const json = await res.json();
        if (json.success) setUserCollections(json.data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingCols(false);
    }
  };

  const handleToggleProblemInCollection = async (collectionId: string, currentlyIn: boolean) => {
    try {
      if (currentlyIn) {
        const res = await fetch(`/api/collections/${collectionId}/problems?problemId=${problem.canonicalSlug}`, {
          method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to remove');
        setUserCollections((prev) =>
          prev.map((c) =>
            c.id === collectionId
              ? { ...c, problemIds: c.problemIds.filter((p) => p !== problem.canonicalSlug && p !== problem.id) }
              : c
          )
        );
        success('Removed', 'Removed problem from collection.');
      } else {
        const res = await fetch(`/api/collections/${collectionId}/problems`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ problemId: problem.canonicalSlug })
        });
        if (!res.ok) throw new Error('Failed to add');
        setUserCollections((prev) =>
          prev.map((c) =>
            c.id === collectionId
              ? { ...c, problemIds: [...c.problemIds, problem.canonicalSlug] }
              : c
          )
        );
        success('Added', 'Problem added to collection.');
      }
    } catch (err: any) {
      toastError('Collection error', err?.message);
    }
  };

  const handleAttemptLogged = (result: any) => {
    if (result.progress?.status) {
      setCurrentStatus(result.progress.status);
    }
    if (result.revision) {
      setRevisionSchedule(result.revision);
    }
    setPracticeCount((c) => c + 1);
  };

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 pb-4 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Link href="/sheet">
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Sheet
            </Button>
          </Link>
          <span className="text-zinc-300 dark:text-zinc-700">•</span>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span>{primaryPattern?.topicName || 'DSA'}</span>
            <span>/</span>
            <Link
              href={`/patterns`}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              {primaryPattern?.patternName || 'Pattern'}
            </Link>
          </div>
        </div>

        {/* Pattern Progress & Next/Prev Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {patternNeighbors?.currentIndex !== undefined && patternNeighbors?.totalInPattern !== undefined && (
            <span className="text-xs text-zinc-400 font-mono mr-2">
              Problem {patternNeighbors.currentIndex + 1} of {patternNeighbors.totalInPattern}
            </span>
          )}

          {patternNeighbors?.prevSlug && (
            <Link href={`/problems/${patternNeighbors.prevSlug}`}>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </Button>
            </Link>
          )}

          {patternNeighbors?.nextSlug && (
            <Link href={`/problems/${patternNeighbors.nextSlug}`}>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Problem Header Card */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-zinc-400 shrink-0">
                #{problem.originalPdfQuestionNumber}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 break-words">
                {problem.title}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Difficulty Badge */}
              <Badge
                variant="outline"
                className={`${diffBadge.bg} ${diffBadge.text} ${diffBadge.border} font-medium`}
              >
                {problem.difficulty}
              </Badge>

              {/* Status Badge */}
              <Badge
                variant="outline"
                className={`${statusBadge.bg} ${statusBadge.text} ${statusBadge.border} font-medium`}
              >
                {statusBadge.label}
              </Badge>

              {/* Verification badge */}
              <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                {problem.difficultySource}
              </span>

              {/* Practice Count */}
              <span className="text-[11px] text-zinc-400 font-mono">
                {practiceCount} attempt{practiceCount === 1 ? '' : 's'} logged
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
            {problem.externalUrl && (
              <a
                href={problem.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Practice on {problem.platform}
                </Button>
              </a>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenColPicker}
              className="h-8 text-xs gap-1.5"
            >
              <FolderKanban className="h-3.5 w-3.5" />
              Collections
            </Button>

            <Button
              size="sm"
              variant={isBookmarked ? 'default' : 'outline'}
              onClick={handleToggleBookmark}
              className={`h-8 text-xs gap-1.5 ${
                isBookmarked
                  ? 'bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-600'
                  : ''
              }`}
            >
              <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
              {isBookmarked ? 'Bookmarked' : 'Bookmark'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Workspace 2-Column Grid */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Column (Statement & Progressive Hints) - 7 cols */}
        <div className="space-y-6 lg:col-span-7">
          {/* Problem Statement Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Problem Statement</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 pt-0 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
              {problem.description ? (
                <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                  {problem.description}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-200 p-4 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400 space-y-2">
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                    Bosscoder Sheet Verified Problem #{problem.originalPdfQuestionNumber}
                  </p>
                  <p>
                    This problem is cataloged in the curriculum under <strong>{primaryPattern?.topicName}</strong> ({primaryPattern?.patternName}).
                  </p>
                  {problem.externalUrl && (
                    <p>
                      Solve this problem directly on{' '}
                      <a
                        href={problem.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 font-medium underline"
                      >
                        {problem.platform}
                      </a>
                      , then record your practice attempts and complexity notes below.
                    </p>
                  )}
                </div>
              )}

              {/* Examples section */}
              {problem.examples && Array.isArray(problem.examples) && problem.examples.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Examples
                  </h4>
                  {problem.examples.map((ex: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-zinc-200/80 bg-zinc-50/70 p-3 text-xs font-mono dark:border-zinc-800 dark:bg-zinc-900/50 space-y-1.5"
                    >
                      {ex.input && (
                        <div className="overflow-x-auto break-all">
                          <span className="text-zinc-400 select-none">Input: </span>
                          <span className="text-zinc-900 dark:text-zinc-100">{ex.input}</span>
                        </div>
                      )}
                      {ex.output && (
                        <div className="overflow-x-auto break-all">
                          <span className="text-zinc-400 select-none">Output: </span>
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                            {ex.output}
                          </span>
                        </div>
                      )}
                      {ex.explanation && (
                        <div className="pt-1 text-[11px] font-sans text-zinc-600 dark:text-zinc-400 border-t border-zinc-200/40 dark:border-zinc-800/40">
                          <span className="font-medium text-zinc-500">Explanation: </span>
                          {ex.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Constraints section */}
              {problem.constraints && (
                <div className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Constraints
                  </h4>
                  <ul className="list-disc pl-5 text-xs text-zinc-600 dark:text-zinc-400 space-y-1 font-mono">
                    {Array.isArray(problem.constraints) ? (
                      problem.constraints.map((c: string, idx: number) => (
                        <li key={idx}>{c}</li>
                      ))
                    ) : (
                      <li>{String(problem.constraints)}</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Tags */}
              {problem.tags && problem.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {problem.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progressive Hints Panel */}
          <ProgressiveHints
            problemId={problem.id}
            initialHints={problem.hints || []}
          />
        </div>

        {/* Right Column (Practice Tracker & Personal Notes) - 5 cols */}
        <div className="space-y-6 lg:col-span-5">
          {/* Practice Attempt Logger */}
          <PracticeTracker
            problemId={problem.id}
            problemSlug={problem.canonicalSlug}
            currentStatus={currentStatus}
            revisionSchedule={revisionSchedule}
            onAttemptLogged={handleAttemptLogged}
            onStatusUpdated={(s) => setCurrentStatus(s as any)}
          />

          {/* Personal Notes */}
          <PersonalNotes
            problemId={problem.id}
            initialContent={problem.userNote?.content || ''}
          />
        </div>
      </div>

      {/* Collection Picker Modal */}
      {showColPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Add to Collection
                </h3>
              </div>
              <button
                onClick={() => setShowColPicker(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-3 space-y-1.5 max-h-64 overflow-y-auto">
              {loadingCols ? (
                <div className="py-6 text-center text-xs text-zinc-500">Loading collections...</div>
              ) : userCollections.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500">
                  No collections available. Create one in{' '}
                  <Link href="/collections" className="text-indigo-600 underline">
                    Collections
                  </Link>
                  .
                </div>
              ) : (
                userCollections.map((col) => {
                  const isIn =
                    col.problemIds.includes(problem.canonicalSlug) ||
                    col.problemIds.includes(problem.id);

                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => handleToggleProblemInCollection(col.id, isIn)}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors text-left"
                    >
                      <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                        {col.name}
                      </span>
                      <div
                        className={`h-4 w-4 rounded flex items-center justify-center border ${
                          isIn
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-zinc-300 dark:border-zinc-700'
                        }`}
                      >
                        {isIn && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <Link href="/collections" className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline">
                Manage Collections →
              </Link>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowColPicker(false)}
                className="text-xs h-7"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
