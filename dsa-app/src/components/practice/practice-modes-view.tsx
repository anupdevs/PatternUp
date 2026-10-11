'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Clock,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Dice5,
  Repeat,
  Bookmark,
  Layers,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { getDifficultyBadgeColor } from '@/lib/utils';

type PracticeMode = 'mock_interview' | 'pattern' | 'random' | 'revision' | 'bookmarks';

interface MockProblem {
  id: string;
  canonicalSlug: string;
  title: string;
  difficulty: string;
  originalPdfQuestionNumber: number;
  externalUrl: string | null;
  platform: string;
  patternName: string;
  status: 'PENDING' | 'SOLVED' | 'PARTIAL' | 'FAILED';
  notes: string;
}

export function PracticeModesView() {
  const { success, error: toastError } = useToast();

  const [activeMode, setActiveMode] = React.useState<PracticeMode>('mock_interview');
  const [loadingCatalog, setLoadingCatalog] = React.useState(true);
  const [allProblems, setAllProblems] = React.useState<any[]>([]);
  const [patternsList, setPatternsList] = React.useState<any[]>([]);

  // Mock Interview Setup State
  const [questionCount, setQuestionCount] = React.useState<number>(2);
  const [durationMinutes, setDurationMinutes] = React.useState<number>(45);
  const [interviewStarted, setInterviewStarted] = React.useState(false);
  const [interviewEnded, setInterviewEnded] = React.useState(false);
  const [selectedMockIndex, setSelectedMockIndex] = React.useState(0);
  const [mockProblems, setMockProblems] = React.useState<MockProblem[]>([]);
  const [timeLeftSeconds, setTimeLeftSeconds] = React.useState(45 * 60);
  const [timerActive, setTimerActive] = React.useState(false);

  // Random Mode State
  const [randomDifficulty, setRandomDifficulty] = React.useState<string>('ALL');
  const [pickedRandomProblem, setPickedRandomProblem] = React.useState<any | null>(null);

  // Load problem catalog
  React.useEffect(() => {
    fetch('/api/problems?limit=250')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setAllProblems(json.data.problems || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCatalog(false));

    fetch('/api/patterns/hierarchy')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setPatternsList(json.data || []);
        }
      })
      .catch(() => {});
  }, []);

  // Mock Interview Countdown Timer
  React.useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (interviewStarted && !interviewEnded && timerActive && timeLeftSeconds > 0) {
      timer = setInterval(() => {
        setTimeLeftSeconds((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            setInterviewEnded(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [interviewStarted, interviewEnded, timerActive, timeLeftSeconds]);

  const startMockInterview = () => {
    if (allProblems.length === 0) {
      toastError('Catalog not ready', 'Please wait for problem catalog to load.');
      return;
    }

    // Select N random problems from catalog
    const shuffled = [...allProblems].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, questionCount).map((p) => ({
      id: p.id,
      canonicalSlug: p.canonicalSlug,
      title: p.title,
      difficulty: p.difficulty,
      originalPdfQuestionNumber: p.originalPdfQuestionNumber,
      externalUrl: p.externalUrl,
      platform: p.platform,
      patternName: p.patterns[0]?.patternName || 'General',
      status: 'PENDING' as const,
      notes: ''
    }));

    setMockProblems(selected);
    setSelectedMockIndex(0);
    setTimeLeftSeconds(durationMinutes * 60);
    setInterviewStarted(true);
    setInterviewEnded(false);
    setTimerActive(true);
    success('Mock Interview Started', `${questionCount} problems assigned. Timer is ticking!`);
  };

  const endMockInterview = () => {
    setTimerActive(false);
    setInterviewEnded(true);
    success('Interview Completed', 'Great job! Review your performance summary below.');
  };

  const handleUpdateMockStatus = (index: number, newStatus: 'SOLVED' | 'PARTIAL' | 'FAILED') => {
    setMockProblems((prev) =>
      prev.map((prob, i) => (i === index ? { ...prob, status: newStatus } : prob))
    );
  };

  const handleUpdateMockNotes = (index: number, text: string) => {
    setMockProblems((prev) =>
      prev.map((prob, i) => (i === index ? { ...prob, notes: text } : prob))
    );
  };

  const handleRollRandom = () => {
    if (allProblems.length === 0) return;
    let pool = allProblems;
    if (randomDifficulty !== 'ALL') {
      pool = allProblems.filter((p) => p.difficulty === randomDifficulty);
    }
    if (pool.length === 0) pool = allProblems;
    const randomPick = pool[Math.floor(Math.random() * pool.length)];
    setPickedRandomProblem(randomPick);
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            Targeted Practice Modes
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Simulate real interview pressure, drill isolated algorithmic patterns, or test rapid recall.
          </p>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200/80 pb-3 dark:border-zinc-800">
        <Button
          variant={activeMode === 'mock_interview' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveMode('mock_interview')}
          className="text-xs gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Mock Interview Simulator
        </Button>

        <Button
          variant={activeMode === 'pattern' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveMode('pattern')}
          className="text-xs gap-1.5"
        >
          <Layers className="h-3.5 w-3.5" />
          Pattern Deep-Dive
        </Button>

        <Button
          variant={activeMode === 'random' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveMode('random')}
          className="text-xs gap-1.5"
        >
          <Dice5 className="h-3.5 w-3.5" />
          Random Challenge
        </Button>

        <Link href="/revisions">
          <Button variant="outline" size="sm" className="text-xs gap-1.5">
            <Repeat className="h-3.5 w-3.5" />
            Revision Queue
          </Button>
        </Link>

        <Link href="/bookmarks">
          <Button variant="outline" size="sm" className="text-xs gap-1.5">
            <Bookmark className="h-3.5 w-3.5" />
            Bookmarks
          </Button>
        </Link>
      </div>

      {/* MODE 1: MOCK INTERVIEW SIMULATOR */}
      {activeMode === 'mock_interview' && (
        <div className="space-y-6">
          {/* Disclaimer Banner */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-50/50 p-4 dark:border-amber-500/20 dark:bg-amber-950/20">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-300">
                <span className="font-semibold block">Simulated Practice Mode Notice</span>
                This simulator is designed to build interview time management, thought verbalization, and algorithmic tradeoff skills. It is not an actual interview or live automated judge. Test your solutions on LeetCode/GeeksforGeeks using the external links provided.
              </div>
            </div>
          </div>

          {!interviewStarted ? (
            /* Setup Configuration Card */
            <Card className="max-w-xl mx-auto">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Configure Mock Interview Session
                </CardTitle>
                <p className="text-xs text-zinc-500">
                  Select question count and duration. Questions will be drawn randomly from the Bosscoder 211 catalog.
                </p>
              </CardHeader>
              <CardContent className="space-y-5 pt-0">
                {/* Question Count Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Number of Questions
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { count: 1, label: '1 Question', desc: 'Screening / Warmup' },
                      { count: 2, label: '2 Questions', desc: 'Standard FAANG 45m' },
                      { count: 3, label: '3 Questions', desc: 'Onsite Marathon' }
                    ].map((item) => (
                      <button
                        key={item.count}
                        type="button"
                        onClick={() => setQuestionCount(item.count)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          questionCount === item.count
                            ? 'border-indigo-600 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/40'
                            : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
                        }`}
                      >
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{item.label}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{item.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Interview Time Limit
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[30, 45, 60, 90].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setDurationMinutes(mins)}
                        className={`p-2.5 rounded-lg border text-center text-xs font-semibold transition-all ${
                          durationMinutes === mins
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400'
                            : 'border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400'
                        }`}
                      >
                        {mins} min
                      </button>
                    ))}
                  </div>
                </div>

                {/* Start Button */}
                <Button
                  onClick={startMockInterview}
                  disabled={loadingCatalog}
                  className="w-full text-xs gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Begin Simulated Interview
                </Button>
              </CardContent>
            </Card>
          ) : !interviewEnded ? (
            /* Active Interview Session Screen */
            <div className="space-y-6">
              {/* Session Top Bar: Timer & Actions */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                      Time Remaining
                    </span>
                    <p
                      className={`font-mono text-2xl font-bold tracking-tight ${
                        timeLeftSeconds < 300
                          ? 'text-rose-600 animate-pulse'
                          : timeLeftSeconds < 600
                          ? 'text-amber-600'
                          : 'text-zinc-900 dark:text-zinc-100'
                      }`}
                    >
                      {formatTimer(timeLeftSeconds)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTimerActive(!timerActive)}
                    className="text-xs"
                  >
                    {timerActive ? 'Pause Timer' : 'Resume Timer'}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={endMockInterview}
                    className="text-xs"
                  >
                    Finish Interview
                  </Button>
                </div>
              </div>

              {/* Problem Tabs */}
              <div className="flex items-center gap-2">
                {mockProblems.map((prob, idx) => (
                  <button
                    key={prob.id}
                    onClick={() => setSelectedMockIndex(idx)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold border transition-all ${
                      selectedMockIndex === idx
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300'
                        : 'border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400'
                    }`}
                  >
                    <span>Question {idx + 1}</span>
                    {prob.status === 'SOLVED' && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                    {prob.status === 'PARTIAL' && (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    )}
                    {prob.status === 'FAILED' && (
                      <XCircle className="h-3.5 w-3.5 text-rose-600" />
                    )}
                  </button>
                ))}
              </div>

              {/* Selected Problem Card */}
              {mockProblems[selectedMockIndex] && (
                <div className="grid gap-6 lg:grid-cols-12">
                  <div className="lg:col-span-7 space-y-4">
                    <Card className="p-5">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-zinc-400">
                            #{mockProblems[selectedMockIndex].originalPdfQuestionNumber}
                          </span>
                          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            {mockProblems[selectedMockIndex].title}
                          </h2>
                          <Badge variant="outline" className="text-xs">
                            {mockProblems[selectedMockIndex].difficulty}
                          </Badge>
                        </div>

                        <p className="text-xs text-zinc-500">
                          Pattern: {mockProblems[selectedMockIndex].patternName}
                        </p>

                        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                          {mockProblems[selectedMockIndex].externalUrl && (
                            <a
                              href={mockProblems[selectedMockIndex].externalUrl!}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button size="sm" variant="outline" className="text-xs gap-1.5 h-8">
                                <ExternalLink className="h-3.5 w-3.5" />
                                Practice on {mockProblems[selectedMockIndex].platform}
                              </Button>
                            </a>
                          )}

                          <Link
                            href={`/problems/${mockProblems[selectedMockIndex].canonicalSlug}`}
                            target="_blank"
                          >
                            <Button size="sm" variant="ghost" className="text-xs gap-1.5 h-8">
                              Open in Full Workspace ↗
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Card>

                    {/* Interview Solution Outcome Buttons */}
                    <Card className="p-4">
                      <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-2">
                        Mark Problem Result:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateMockStatus(selectedMockIndex, 'SOLVED')}
                          className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                            mockProblems[selectedMockIndex].status === 'SOLVED'
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : 'border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400'
                          }`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Solved Cleanly
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateMockStatus(selectedMockIndex, 'PARTIAL')}
                          className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                            mockProblems[selectedMockIndex].status === 'PARTIAL'
                              ? 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                              : 'border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400'
                          }`}
                        >
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                          Needed Hints
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateMockStatus(selectedMockIndex, 'FAILED')}
                          className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                            mockProblems[selectedMockIndex].status === 'FAILED'
                              ? 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                              : 'border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400'
                          }`}
                        >
                          <XCircle className="h-3.5 w-3.5 text-rose-600" />
                          Stumbled
                        </button>
                      </div>
                    </Card>
                  </div>

                  {/* Interview Scratchpad & Pseudocode Notes */}
                  <div className="lg:col-span-5">
                    <Card className="h-full flex flex-col p-4">
                      <CardTitle className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                        Interview Scratchpad & Complexity Notes
                      </CardTitle>
                      <p className="text-[11px] text-zinc-400 mb-3">
                        Draft your approach, invariant states, and time/space complexity analysis.
                      </p>
                      <textarea
                        value={mockProblems[selectedMockIndex].notes}
                        onChange={(e) => handleUpdateMockNotes(selectedMockIndex, e.target.value)}
                        placeholder="// Approach: 2-Pointer with fast/slow pointers&#10;// Time Complexity: O(N)&#10;// Space Complexity: O(1)&#10;// Edge Cases: empty list, single node..."
                        className="flex-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[220px]"
                      />
                    </Card>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Interview Final Summary Screen */
            <Card className="max-w-xl mx-auto p-6 space-y-6">
              <div className="text-center space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  Mock Interview Complete
                </h2>
                <p className="text-xs text-zinc-500">
                  Completed in {formatTimer(durationMinutes * 60 - timeLeftSeconds)} of {durationMinutes} allotted minutes.
                </p>
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                  <p className="text-[10px] text-zinc-400 uppercase font-mono">Assigned</p>
                  <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{mockProblems.length}</p>
                </div>
                <div className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                  <p className="text-[10px] text-zinc-400 uppercase font-mono">Solved</p>
                  <p className="text-lg font-bold text-emerald-600">
                    {mockProblems.filter((p) => p.status === 'SOLVED').length}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                  <p className="text-[10px] text-zinc-400 uppercase font-mono">Need Revision</p>
                  <p className="text-lg font-bold text-amber-600">
                    {mockProblems.filter((p) => p.status !== 'SOLVED').length}
                  </p>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Questions Reviewed:
                </h3>
                {mockProblems.map((prob) => (
                  <div
                    key={prob.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 text-xs"
                  >
                    <div className="truncate flex-1 min-w-0 pr-3">
                      <span className="font-semibold">{prob.title}</span>
                      <span className="text-[11px] text-zinc-400 ml-2">({prob.patternName})</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        prob.status === 'SOLVED'
                          ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50'
                          : prob.status === 'PARTIAL'
                          ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/50'
                          : 'text-rose-600 bg-rose-50 dark:bg-rose-950/50'
                      }
                    >
                      {prob.status}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Link href="/sheet">
                  <Button variant="outline" size="sm" className="text-xs">
                    Return to Sheet
                  </Button>
                </Link>
                <Button
                  size="sm"
                  onClick={() => setInterviewStarted(false)}
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Start New Session
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* MODE 2: PATTERN DEEP-DIVE */}
      {activeMode === 'pattern' && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-500">
            Select an algorithmic pattern to practice problems sequentially:
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {patternsList.map((t: any) =>
              t.patterns.map((p: any) => (
                <Link
                  key={p.slug}
                  href={`/sheet?pattern=${p.slug}`}
                  className="p-3.5 rounded-xl border border-zinc-200/80 bg-white hover:border-indigo-500/50 dark:border-zinc-800 dark:bg-zinc-900/60 transition-all flex items-center justify-between group"
                >
                  <div>
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600">
                      {p.name}
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{t.name}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-indigo-600 transition-colors" />
                </Link>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODE 3: RANDOM CHALLENGE */}
      {activeMode === 'random' && (
        <Card className="max-w-lg mx-auto p-6 text-center space-y-5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            <Dice5 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Random Coding Challenge
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Roll a surprise question to simulate unassisted interview rounds.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2">
            {['ALL', 'EASY', 'MEDIUM', 'HARD'].map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setRandomDifficulty(tier)}
                className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-all ${
                  randomDifficulty === tier
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                    : 'border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>

          <Button
            onClick={handleRollRandom}
            disabled={loadingCatalog}
            className="text-xs gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Dice5 className="h-4 w-4" />
            Roll Problem
          </Button>

          {pickedRandomProblem && (
            <div className="mt-4 p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/40 text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-zinc-400">
                  #{pickedRandomProblem.originalPdfQuestionNumber}
                </span>
                <Badge variant="outline" className="text-xs">
                  {pickedRandomProblem.difficulty}
                </Badge>
              </div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                {pickedRandomProblem.title}
              </h3>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <Link href={`/problems/${pickedRandomProblem.canonicalSlug}`}>
                  <Button size="sm" className="text-xs gap-1.5">
                    Start Solving
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
