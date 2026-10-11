'use client';

import * as React from 'react';
import { WelcomeBanner } from './welcome-banner';
import { ProgressOverview } from './progress-overview';
import { DailyGoalCard } from './daily-goal-card';
import { TopicProgressCard, TopicProgressItem } from './topic-progress-card';
import { ContinueLearning, RecentAttemptItem } from './continue-learning';
import { ActivityHeatmap } from './activity-heatmap';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

interface DashboardData {
  overview: {
    totalPlatformProblems: number;
    totalSolved: number;
    totalAttempted: number;
    totalNeedsRevision: number;
    completionRate: number;
    totalAttemptsCount: number;
    totalTimeSpentSeconds: number;
  };
  difficultyBreakdown: {
    EASY: { solved: number; total: number };
    MEDIUM: { solved: number; total: number };
    HARD: { solved: number; total: number };
  };
  recentAttempts: RecentAttemptItem[];
  recentActivities: Array<{
    date: string;
    questionsAttempted: number;
    questionsSolved: number;
    studyDurationSeconds: number;
  }>;
}

interface UserPreferences {
  dailyProblemGoal: number;
  timezone: string;
  preferredCodingLanguage: string;
}

export function DashboardView() {
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [topics, setTopics] = React.useState<TopicProgressItem[]>([]);
  const [prefs, setPrefs] = React.useState<UserPreferences | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchDashboard = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, topicsRes, prefsRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/dashboard/topics'),
        fetch('/api/preferences')
      ]);

      if (dashRes.status === 401) {
        // Unauthenticated visitor
        setData({
          overview: {
            totalPlatformProblems: 211,
            totalSolved: 0,
            totalAttempted: 0,
            totalNeedsRevision: 0,
            completionRate: 0,
            totalAttemptsCount: 0,
            totalTimeSpentSeconds: 0
          },
          difficultyBreakdown: {
            EASY: { solved: 0, total: 60 },
            MEDIUM: { solved: 0, total: 115 },
            HARD: { solved: 0, total: 36 }
          },
          recentAttempts: [],
          recentActivities: []
        });
        setLoading(false);
        return;
      }

      if (!dashRes.ok) {
        throw new Error('Could not load dashboard statistics from database');
      }

      const dashJson = await dashRes.json();
      if (dashJson.success) {
        setData(dashJson.data);
      }

      if (topicsRes.ok) {
        const topicsJson = await topicsRes.json();
        if (topicsJson.success) {
          setTopics(topicsJson.data);
        }
      }

      if (prefsRes.ok) {
        const prefsJson = await prefsRes.json();
        if (prefsJson.success) {
          setPrefs(prefsJson.data);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to backend service');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        <WelcomeBanner />
        <ErrorState
          title="Database Connection Notice"
          message={error}
          onRetry={fetchDashboard}
        />
      </div>
    );
  }

  const overview = data?.overview || {
    totalPlatformProblems: 211,
    totalSolved: 0,
    totalAttempted: 0,
    totalNeedsRevision: 0,
    completionRate: 0,
    totalAttemptsCount: 0,
    totalTimeSpentSeconds: 0
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAct = data?.recentActivities?.find((a) => a.date === todayStr);
  const solvedToday = todayAct?.questionsSolved || 0;

  const lastPracticed = data?.recentAttempts && data.recentAttempts.length > 0
    ? {
        title: data.recentAttempts[0].problem.title,
        canonicalSlug: data.recentAttempts[0].problem.canonicalSlug,
        difficulty: data.recentAttempts[0].problem.difficulty,
        patternName: 'Recently Attempted'
      }
    : null;

  return (
    <div className="space-y-6">
      {/* 1. Welcome section */}
      <WelcomeBanner />

      {/* 2. Progress Overview */}
      <ProgressOverview
        totalPlatformProblems={overview.totalPlatformProblems}
        totalSolved={overview.totalSolved}
        totalAttempted={overview.totalAttempted}
        totalNeedsRevision={overview.totalNeedsRevision}
        completionRate={overview.completionRate}
        totalAttemptsCount={overview.totalAttemptsCount}
        totalTimeSpentSeconds={overview.totalTimeSpentSeconds}
        currentStreak={data?.recentActivities?.length ? 1 : 0}
        longestStreak={data?.recentActivities?.length ? 1 : 0}
      />

      {/* 3. Daily Goals & Continue Learning */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ContinueLearning
            recentAttempts={data?.recentAttempts}
            revisionDueCount={overview.totalNeedsRevision}
            lastPracticedProblem={lastPracticed}
          />
        </div>
        <div>
          <DailyGoalCard
            dailyGoal={prefs?.dailyProblemGoal || 3}
            solvedToday={solvedToday}
          />
        </div>
      </div>

      {/* 4. Topic Progress Breakdown */}
      <TopicProgressCard topics={topics} />

      {/* 5. Study Activity Heatmap */}
      <ActivityHeatmap
        activities={data?.recentActivities || []}
        timezone={prefs?.timezone || 'UTC'}
      />
    </div>
  );
}
