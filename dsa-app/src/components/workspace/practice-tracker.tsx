'use client';

import * as React from 'react';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Repeat,
  Send
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';

interface RevisionScheduleData {
  nextReviewAt: string | Date;
  intervalDays: number;
  repetitionCount: number;
  easeFactor: number;
  lastReviewedAt: string | Date | null;
}

interface PracticeTrackerProps {
  problemId: string;
  problemSlug: string;
  currentStatus: string;
  revisionSchedule: RevisionScheduleData | null;
  onAttemptLogged: (result: any) => void;
  onStatusUpdated: (newStatus: string) => void;
}

export function PracticeTracker({
  problemId,
  problemSlug,
  currentStatus,
  revisionSchedule,
  onAttemptLogged,
  onStatusUpdated
}: PracticeTrackerProps) {
  const { success, error: toastError } = useToast();

  // Stopwatch state
  const [seconds, setSeconds] = React.useState(0);
  const [timerRunning, setTimerRunning] = React.useState(false);

  // Form state
  const [outcome, setOutcome] = React.useState<'SOLVED' | 'PARTIALLY_SOLVED' | 'FAILED'>('SOLVED');
  const [approachNotes, setApproachNotes] = React.useState('');
  const [difficultyExperienced, setDifficultyExperienced] = React.useState<number>(3);
  const [submitting, setSubmitting] = React.useState(false);

  // Stopwatch interval
  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRecordAttempt = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId,
          outcome,
          durationSeconds: Math.max(seconds, 60), // at least 1 min if stopwatch not used
          approachNotes: approachNotes.trim() || undefined,
          difficultyExperienced
        })
      });

      if (!res.ok) {
        const errorJson = await res.json();
        throw new Error(errorJson.error || 'Failed to record attempt');
      }

      const json = await res.json();
      if (json.success) {
        success(
          outcome === 'SOLVED' ? 'Problem Solved!' : 'Attempt Recorded',
          'Attempt history and spaced repetition schedule have been updated.'
        );

        // Reset form & timer
        setTimerRunning(false);
        setSeconds(0);
        setApproachNotes('');

        if (onAttemptLogged) {
          onAttemptLogged(json.data);
        }
      }
    } catch (err: any) {
      toastError('Attempt Recording Failed', err?.message || 'Could not record attempt');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDirectStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/problems/${problemSlug}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error('Could not update status');

      success('Status Updated', `Problem marked as ${newStatus.replace('_', ' ')}.`);
      if (onStatusUpdated) onStatusUpdated(newStatus);
    } catch (err: any) {
      toastError('Status update error', err?.message);
    }
  };

  return (
    <Card className="space-y-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Practice Tracking & Log</CardTitle>
            <p className="text-[11px] text-zinc-500">Record practice sessions & update SM-2 schedule</p>
          </div>

          {/* Quick status selector */}
          <select
            value={currentStatus}
            onChange={(e) => handleDirectStatusChange(e.target.value)}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-800 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 cursor-pointer"
          >
            <option value="NOT_STARTED">Not Started</option>
            <option value="ATTEMPTED">Attempted</option>
            <option value="SOLVED">Solved</option>
            <option value="NEEDS_REVISION">Needs Revision</option>
          </select>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Stopwatch Bar */}
        <div className="flex items-center justify-between rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-zinc-400" />
            <span className="font-mono text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {formatTimer(seconds)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant={timerRunning ? 'secondary' : 'default'}
              onClick={() => setTimerRunning(!timerRunning)}
              className="h-7 text-xs gap-1"
            >
              {timerRunning ? (
                <>
                  <Pause className="h-3 w-3" /> Pause
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 fill-current" /> Start Timer
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setTimerRunning(false);
                setSeconds(0);
              }}
              className="h-7 text-xs"
              title="Reset timer"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Outcome Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Session Outcome
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setOutcome('SOLVED')}
              className={`flex items-center justify-center gap-1.5 rounded-lg border p-2 text-xs font-semibold transition-all ${
                outcome === 'SOLVED'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Solved
            </button>

            <button
              type="button"
              onClick={() => setOutcome('PARTIALLY_SOLVED')}
              className={`flex items-center justify-center gap-1.5 rounded-lg border p-2 text-xs font-semibold transition-all ${
                outcome === 'PARTIALLY_SOLVED'
                  ? 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              Partial
            </button>

            <button
              type="button"
              onClick={() => setOutcome('FAILED')}
              className={`flex items-center justify-center gap-1.5 rounded-lg border p-2 text-xs font-semibold transition-all ${
                outcome === 'FAILED'
                  ? 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400'
              }`}
            >
              <XCircle className="h-3.5 w-3.5 text-rose-600" />
              Unsuccessful
            </button>
          </div>
        </div>

        {/* Subjective Difficulty rating */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Difficulty Experienced
            </span>
            <span className="text-zinc-400">
              {difficultyExperienced === 1
                ? 'Trivial'
                : difficultyExperienced === 2
                ? 'Easy'
                : difficultyExperienced === 3
                ? 'Moderate'
                : difficultyExperienced === 4
                ? 'Challenging'
                : 'Very Hard'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setDifficultyExperienced(val)}
                className={`flex-1 h-7 rounded-md border text-xs font-semibold transition-colors ${
                  difficultyExperienced >= val
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400'
                    : 'border-zinc-200 text-zinc-400 dark:border-zinc-800'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* Reflection & approach notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Approach Reflection (Optional)
          </label>
          <textarea
            value={approachNotes}
            onChange={(e) => setApproachNotes(e.target.value)}
            rows={2}
            placeholder="Key realization (e.g. used hash map instead of 2-pointer, edge case at 0)..."
            className="w-full rounded-lg border border-zinc-200 bg-white p-2.5 text-xs placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
          />
        </div>

        {/* Submit Attempt Button */}
        <Button
          onClick={handleRecordAttempt}
          isLoading={submitting}
          className="w-full text-xs gap-1.5"
        >
          <Send className="h-3.5 w-3.5" />
          Record Attempt Session
        </Button>

        {/* Spaced Repetition Info Pill */}
        {revisionSchedule && (
          <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900/30 space-y-1">
            <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Repeat className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                Spaced Repetition Schedule
              </span>
              <span>Streak: #{revisionSchedule.repetitionCount}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span>Next Review: {formatDate(revisionSchedule.nextReviewAt)}</span>
              <span>Ease: {revisionSchedule.easeFactor.toFixed(2)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
