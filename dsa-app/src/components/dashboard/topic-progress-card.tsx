import * as React from 'react';
import Link from 'next/link';
import { ChevronRight, BookOpen } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface TopicProgressItem {
  topicId: string;
  topicName: string;
  topicSlug: string;
  totalProblems: number;
  solvedProblems: number;
  attemptedProblems: number;
  percentComplete: number;
}

interface TopicProgressCardProps {
  topics: TopicProgressItem[];
}

export function TopicProgressCard({ topics = [] }: TopicProgressCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold">Topic Progress</CardTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            15 core DSA modules from the Bosscoder sheet
          </p>
        </div>
        <Link href="/patterns">
          <Button variant="ghost" size="sm" className="text-xs gap-1 text-indigo-600 dark:text-indigo-400">
            View all patterns
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {topics.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">
            No topics loaded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {topics.map((t) => (
              <div
                key={t.topicId}
                className="group flex flex-col gap-2 rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 transition-colors hover:border-zinc-200 hover:bg-zinc-100/50 dark:border-zinc-800/60 dark:bg-zinc-900/40 dark:hover:border-zinc-700/60 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between sm:justify-start sm:gap-3">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {t.topicName}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {t.solvedProblems} / {t.totalProblems} solved
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 w-full max-w-xs rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300"
                        style={{ width: `${t.percentComplete}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500">
                      {t.percentComplete}%
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center justify-end">
                  <Link href={`/sheet?topic=${t.topicSlug}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 gap-1 group-hover:border-indigo-500/40 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                    >
                      <BookOpen className="h-3 w-3" />
                      Continue
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
