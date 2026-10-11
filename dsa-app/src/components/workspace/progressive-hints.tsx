'use client';

import * as React from 'react';
import { Lightbulb, Lock, Unlock, Eye } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

export interface ProgressiveHintItem {
  id: string;
  order: number;
  sourceType: string;
  verified: boolean;
  isRevealed: boolean;
  content: string | null;
}

interface ProgressiveHintsProps {
  problemId: string;
  initialHints: ProgressiveHintItem[];
}

export function ProgressiveHints({ problemId, initialHints = [] }: ProgressiveHintsProps) {
  const { success, error: toastError } = useToast();
  const [hints, setHints] = React.useState<ProgressiveHintItem[]>(initialHints);
  const [revealing, setRevealing] = React.useState(false);

  const sortedHints = React.useMemo(() => {
    return [...hints].sort((a, b) => a.order - b.order);
  }, [hints]);

  const revealedCount = sortedHints.filter((h) => h.isRevealed).length;
  const totalHints = sortedHints.length;
  const nextHintToReveal = sortedHints.find((h) => !h.isRevealed);

  const handleRevealNext = async () => {
    if (!nextHintToReveal) return;
    setRevealing(true);

    try {
      const res = await fetch('/api/hints/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId,
          hintId: nextHintToReveal.id
        })
      });

      if (!res.ok) {
        const errorJson = await res.json();
        throw new Error(errorJson.error || 'Failed to reveal hint');
      }

      const json = await res.json();
      if (json.success && json.data) {
        setHints((prev) =>
          prev.map((h) =>
            h.id === nextHintToReveal.id
              ? { ...h, isRevealed: true, content: json.data.content }
              : h
          )
        );
        success(`Hint ${nextHintToReveal.order} Revealed`, 'Take a moment to analyze the hint before writing code.');
      }
    } catch (err: any) {
      toastError('Hint Reveal Error', err?.message || 'Could not reveal hint');
    } finally {
      setRevealing(false);
    }
  };

  const getSourceLabel = (type: string) => {
    switch (type) {
      case 'OFFICIAL_PLATFORM':
        return 'Official LeetCode';
      case 'INFERRED_EDITORIAL':
        return 'Verified Editorial';
      case 'USER_CONTRIBUTED':
        return 'Community Contributed';
      default:
        return 'Editorial Insight';
    }
  };

  return (
    <Card className="border-amber-500/20 bg-amber-50/10 dark:bg-amber-950/10">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
            <Lightbulb className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">Progressive Hints</CardTitle>
            <p className="text-[11px] text-zinc-500">
              {totalHints > 0
                ? `${revealedCount} of ${totalHints} hints unlocked`
                : 'No editorial hints cataloged for this problem'}
            </p>
          </div>
        </div>

        {totalHints > 0 && (
          <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-700 dark:text-amber-400">
            Hint {revealedCount}/{totalHints}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {totalHints === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-500 dark:border-zinc-800">
            No progressive hints currently available for this problem. Try analyzing constraints and edge cases.
          </div>
        ) : (
          <div className="space-y-2.5">
            {sortedHints.map((hint) => {
              if (hint.isRevealed) {
                return (
                  <div
                    key={hint.id}
                    className="rounded-lg border border-amber-500/20 bg-white/90 p-3 shadow-2xs dark:border-amber-500/20 dark:bg-zinc-900/90 transition-all animate-in fade-in-50"
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100 dark:border-zinc-800/80">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                        <Unlock className="h-3.5 w-3.5 text-amber-600" />
                        <span>Hint {hint.order}</span>
                      </div>
                      <span className="text-[10px] text-zinc-400">
                        {getSourceLabel(hint.sourceType)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 font-sans">
                      {hint.content}
                    </p>
                  </div>
                );
              } else {
                return (
                  <div
                    key={hint.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-200/60 bg-zinc-50/50 p-3 text-xs text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/30"
                  >
                    <div className="flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5" />
                      <span className="font-medium text-zinc-500">Hint {hint.order} (Locked)</span>
                    </div>
                    <span className="text-[10px] opacity-75">
                      {getSourceLabel(hint.sourceType)}
                    </span>
                  </div>
                );
              }
            })}

            {/* Reveal Action Button */}
            {nextHintToReveal && (
              <div className="pt-1">
                <Button
                  onClick={handleRevealNext}
                  isLoading={revealing}
                  size="sm"
                  variant="outline"
                  className="w-full text-xs gap-1.5 border-amber-500/30 text-amber-800 hover:bg-amber-100/50 dark:text-amber-300 dark:hover:bg-amber-950/40"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Reveal Hint {nextHintToReveal.order} of {totalHints}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
