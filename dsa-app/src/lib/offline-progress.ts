import fs from 'fs';
import path from 'path';
import { RecordAttemptInput } from '@/lib/validations';
import { calculateNextRevisionSchedule } from '@/lib/spaced-repetition';
import { offlineUserStore, UserProgressRecord, UserAttemptRecord } from './offline-user-store';
import { offlineCatalog } from './offline-catalog';

interface RawProblem {
  canonicalSlug: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  originalPdfQuestionNumber: number;
}

function getSeedProblems(): RawProblem[] {
  const p = path.resolve(process.cwd(), 'prisma/seed-data/canonical_problems.json');
  if (!fs.existsSync(p)) return [];
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return [];
  }
}

export const offlineProgress = {
  recordAttempt(userId: string, input: RecordAttemptInput) {
    const {
      problemId,
      outcome,
      durationSeconds,
      approachNotes,
      personalDifficulty,
      confidenceRating
    } = input;

    const details = offlineCatalog.getProblemDetails(problemId, userId);
    const slug = details?.canonicalSlug || problemId;
    const now = new Date();

    // 1. Record attempt
    const attempt = offlineUserStore.recordAttempt({
      clerkUserId: userId,
      problemSlug: slug,
      outcome: outcome as any,
      durationSeconds,
      notes: approachNotes || null,
      attemptedAt: now.toISOString()
    });

    // 2. Update Progress
    const updatedProgress = offlineUserStore.updateProgress(userId, slug, (current) => {
      const isSolved = outcome === 'SOLVED';
      const prevTotal = current ? current.totalAttempts : 0;
      const prevSuccess = current ? current.successfulAttempts : 0;
      const prevFailed = current ? current.failedAttempts : 0;
      const prevTime = current ? current.totalTimeSpentSeconds : 0;

      let nextStatus = current?.status || 'ATTEMPTED';
      if (isSolved) {
        nextStatus = 'SOLVED';
      } else if (nextStatus !== 'SOLVED') {
        nextStatus = 'ATTEMPTED';
      }

      return {
        status: nextStatus as any,
        totalAttempts: prevTotal + 1,
        successfulAttempts: isSolved ? prevSuccess + 1 : prevSuccess,
        failedAttempts: !isSolved ? prevFailed + 1 : prevFailed,
        totalTimeSpentSeconds: prevTime + durationSeconds,
        lastAttemptAt: now.toISOString(),
        solvedAt: isSolved ? (current?.solvedAt || now.toISOString()) : (current?.solvedAt || null),
        personalDifficulty: personalDifficulty ? String(personalDifficulty) : (current?.personalDifficulty || null),
        confidenceRating: confidenceRating ?? current?.confidenceRating ?? null
      };
    });

    // 3. Spaced Repetition calculation
    const existingRev = offlineUserStore.getRevision(userId, slug);
    const schedule = calculateNextRevisionSchedule({
      outcome: outcome as any,
      currentRepetitionCount: existingRev?.repetitionCount ?? 0,
      currentIntervalDays: existingRev?.intervalDays ?? 0,
      currentEaseFactor: existingRev?.easeFactor ?? 2.5,
      difficultyExperienced: personalDifficulty
    });

    const rev = offlineUserStore.upsertRevision(userId, slug, {
      nextReviewAt: schedule.nextReviewAt.toISOString(),
      intervalDays: schedule.intervalDays,
      repetitionCount: schedule.repetitionCount,
      easeFactor: schedule.easeFactor,
      lastReviewedAt: now.toISOString()
    });

    return {
      attempt: {
        id: attempt.id,
        clerkUserId: userId,
        problemId: slug,
        outcome: attempt.outcome,
        durationSeconds: attempt.durationSeconds,
        approachNotes: attempt.notes,
        attemptedAt: new Date(attempt.attemptedAt)
      },
      userProgress: {
        id: updatedProgress.id,
        status: updatedProgress.status,
        totalAttempts: updatedProgress.totalAttempts,
        successfulAttempts: updatedProgress.successfulAttempts,
        failedAttempts: updatedProgress.failedAttempts,
        totalTimeSpentSeconds: updatedProgress.totalTimeSpentSeconds,
        firstAttemptAt: updatedProgress.firstAttemptAt ? new Date(updatedProgress.firstAttemptAt) : null,
        lastAttemptAt: updatedProgress.lastAttemptAt ? new Date(updatedProgress.lastAttemptAt) : null,
        solvedAt: updatedProgress.solvedAt ? new Date(updatedProgress.solvedAt) : null,
        personalDifficulty: updatedProgress.personalDifficulty,
        confidenceRating: updatedProgress.confidenceRating
      },
      revisionSchedule: {
        id: rev.id,
        nextReviewAt: new Date(rev.nextReviewAt),
        intervalDays: rev.intervalDays,
        repetitionCount: rev.repetitionCount,
        easeFactor: rev.easeFactor
      }
    };
  },

  updateProgressStatus(
    userId: string,
    problemId: string,
    status: 'NOT_STARTED' | 'ATTEMPTED' | 'SOLVED' | 'NEEDS_REVISION',
    personalDifficulty?: string,
    confidenceRating?: number
  ) {
    const details = offlineCatalog.getProblemDetails(problemId, userId);
    const slug = details?.canonicalSlug || problemId;

    const res = offlineUserStore.updateProgress(userId, slug, (current) => ({
      status,
      personalDifficulty: personalDifficulty ?? current?.personalDifficulty ?? null,
      confidenceRating: confidenceRating ?? current?.confidenceRating ?? null,
      solvedAt: status === 'SOLVED' ? (current?.solvedAt || new Date().toISOString()) : (current?.solvedAt || null)
    }));

    return {
      id: res.id,
      clerkUserId: userId,
      problemId: slug,
      status: res.status,
      totalAttempts: res.totalAttempts,
      successfulAttempts: res.successfulAttempts,
      failedAttempts: res.failedAttempts,
      totalTimeSpentSeconds: res.totalTimeSpentSeconds,
      firstAttemptAt: res.firstAttemptAt ? new Date(res.firstAttemptAt) : null,
      lastAttemptAt: res.lastAttemptAt ? new Date(res.lastAttemptAt) : null,
      solvedAt: res.solvedAt ? new Date(res.solvedAt) : null,
      personalDifficulty: res.personalDifficulty,
      confidenceRating: res.confidenceRating
    };
  },

  getDashboardStatistics(userId: string) {
    const problems = getSeedProblems();
    const totalPlatformProblems = problems.length || 211;

    const userProgressRecords = offlineUserStore.getProgressList(userId);
    const attempts = offlineUserStore.getAttempts(userId);

    const solvedRecords = userProgressRecords.filter((r) => r.status === 'SOLVED');
    const attemptedRecords = userProgressRecords.filter((r) => r.status === 'ATTEMPTED');
    const revisionRecords = userProgressRecords.filter((r) => r.status === 'NEEDS_REVISION');

    let totalTimeSpentSeconds = 0;
    userProgressRecords.forEach((r) => {
      totalTimeSpentSeconds += r.totalTimeSpentSeconds || 0;
    });

    const difficultyBreakdown = {
      EASY: { solved: 0, total: 0 },
      MEDIUM: { solved: 0, total: 0 },
      HARD: { solved: 0, total: 0 }
    };

    problems.forEach((p) => {
      const diff = p.difficulty;
      if (diff in difficultyBreakdown) {
        difficultyBreakdown[diff].total++;
      }
    });

    const probMap = new Map(problems.map((p) => [p.canonicalSlug, p]));

    solvedRecords.forEach((r) => {
      const prob = probMap.get(r.problemSlug);
      const diff = prob?.difficulty;
      if (diff && diff in difficultyBreakdown) {
        difficultyBreakdown[diff].solved++;
      }
    });

    const recentAttempts = attempts.slice(0, 10).map((a) => {
      const prob = probMap.get(a.problemSlug);
      return {
        id: a.id,
        outcome: a.outcome,
        durationSeconds: a.durationSeconds,
        attemptedAt: new Date(a.attemptedAt),
        problem: {
          title: prob?.title || a.problemSlug,
          canonicalSlug: a.problemSlug,
          difficulty: prob?.difficulty || 'MEDIUM'
        }
      };
    });

    return {
      overview: {
        totalPlatformProblems,
        totalSolved: solvedRecords.length,
        totalAttempted: attemptedRecords.length,
        totalNeedsRevision: revisionRecords.length,
        completionRate:
          totalPlatformProblems > 0
            ? Number(((solvedRecords.length / totalPlatformProblems) * 100).toFixed(1))
            : 0,
        totalAttemptsCount: attempts.length,
        totalTimeSpentSeconds
      },
      difficultyBreakdown,
      recentAttempts,
      recentActivities: []
    };
  },

  getTopicProgress(userId: string) {
    const hierarchy = offlineCatalog.getPatternHierarchy(userId);
    return hierarchy.map((t) => ({
      topicId: t.id,
      topicName: t.name,
      topicSlug: t.slug,
      displayOrder: t.displayOrder,
      totalProblems: t.totalProblems,
      solvedProblems: t.solvedProblems,
      attemptedProblems: t.attemptedProblems,
      percentComplete: t.percentComplete,
      patterns: t.patterns.map((p) => ({
        patternId: p.id,
        patternName: p.name,
        patternSlug: p.slug,
        totalProblems: p.totalProblems,
        solvedProblems: p.solvedProblems,
        attemptedProblems: p.attemptedProblems,
        percentComplete: p.percentComplete
      }))
    }));
  },

  getAnalytics(userId: string) {
    const dash = this.getDashboardStatistics(userId);
    const topicBreakdown = this.getTopicProgress(userId);

    return {
      overview: dash.overview,
      difficultyBreakdown: dash.difficultyBreakdown,
      topicBreakdown,
      streak: {
        currentStreakDays: 1,
        longestStreakDays: 1,
        lastActiveDate: new Date().toISOString()
      },
      velocity: {
        averageDailySolved: 0,
        weeklySolvedCount: dash.overview.totalSolved,
        monthlySolvedCount: dash.overview.totalSolved
      },
      efficiency: {
        averageTimePerProblemMinutes:
          dash.overview.totalSolved > 0
            ? Number((dash.overview.totalTimeSpentSeconds / 60 / dash.overview.totalSolved).toFixed(1))
            : 0,
        averageAttemptsToSolve:
          dash.overview.totalSolved > 0
            ? Number((dash.overview.totalAttemptsCount / dash.overview.totalSolved).toFixed(1))
            : 0,
        firstTrySuccessRate: 0
      },
      recentActivityCalendar: []
    };
  },

  getPracticeHistory(userId: string, problemId?: string, page = 1, limit = 20) {
    const all = offlineUserStore.getAttempts(userId, problemId);
    const problems = getSeedProblems();
    const probMap = new Map(problems.map((p) => [p.canonicalSlug, p]));

    const skip = (page - 1) * limit;
    const paginated = all.slice(skip, skip + limit).map((a) => {
      const prob = probMap.get(a.problemSlug);
      return {
        id: a.id,
        outcome: a.outcome,
        durationSeconds: a.durationSeconds,
        approachNotes: a.notes,
        attemptedAt: new Date(a.attemptedAt),
        problem: {
          id: a.problemSlug,
          title: prob?.title || a.problemSlug,
          canonicalSlug: a.problemSlug,
          difficulty: prob?.difficulty || 'MEDIUM',
          originalPdfQuestionNumber: prob?.originalPdfQuestionNumber || 1
        }
      };
    });

    return {
      attempts: paginated,
      pagination: {
        totalCount: all.length,
        page,
        limit,
        totalPages: Math.ceil(all.length / limit)
      }
    };
  },

  getRevisionDueProblems(userId: string, includeUpcomingHours = 0) {
    const cutoff = Date.now() + includeUpcomingHours * 60 * 60 * 1000;
    const revisions = offlineUserStore.getRevisions(userId);
    const due = revisions
      .filter((r) => new Date(r.nextReviewAt).getTime() <= cutoff)
      .sort((a, b) => new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime());

    return due.map((r) => {
      const details = offlineCatalog.getProblemDetails(r.problemSlug, userId);
      const prog = offlineUserStore.getProgress(userId, r.problemSlug);

      return {
        id: r.id,
        clerkUserId: userId,
        problemId: r.problemSlug,
        nextReviewAt: new Date(r.nextReviewAt),
        intervalDays: r.intervalDays,
        repetitionCount: r.repetitionCount,
        easeFactor: r.easeFactor,
        lastReviewedAt: r.lastReviewedAt ? new Date(r.lastReviewedAt) : null,
        problem: details
          ? {
              id: details.id,
              title: details.title,
              canonicalSlug: details.canonicalSlug,
              difficulty: details.difficulty,
              patterns: details.patterns.map((pp) => ({
                pattern: {
                  name: pp.patternName,
                  slug: pp.patternSlug,
                  topic: { name: pp.topicName, slug: pp.topicSlug }
                }
              })),
              progress: prog ? [prog] : []
            }
          : null
      };
    });
  },

  recordReviewOutcome(userId: string, problemId: string, rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY') {
    const details = offlineCatalog.getProblemDetails(problemId, userId);
    const slug = details?.canonicalSlug || problemId;
    const existing = offlineUserStore.getRevision(userId, slug);

    let easeFactor = existing?.easeFactor ?? 2.5;
    let repetitionCount = existing?.repetitionCount ?? 0;
    let intervalDays = existing?.intervalDays ?? 1;

    switch (rating) {
      case 'AGAIN':
        repetitionCount = 0;
        intervalDays = 1;
        easeFactor = Math.max(1.3, easeFactor - 0.2);
        break;
      case 'HARD':
        intervalDays = Math.max(1, Math.round(intervalDays * 1.2));
        easeFactor = Math.max(1.3, easeFactor - 0.15);
        break;
      case 'GOOD':
        repetitionCount += 1;
        intervalDays = repetitionCount === 1 ? 1 : repetitionCount === 2 ? 6 : Math.round(intervalDays * easeFactor);
        break;
      case 'EASY':
        repetitionCount += 1;
        intervalDays = repetitionCount === 1 ? 4 : Math.round(intervalDays * easeFactor * 1.3);
        easeFactor = easeFactor + 0.15;
        break;
    }

    const nextReview = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);
    const updated = offlineUserStore.upsertRevision(userId, slug, {
      nextReviewAt: nextReview.toISOString(),
      intervalDays,
      repetitionCount,
      easeFactor,
      lastReviewedAt: new Date().toISOString()
    });

    return {
      revisionSchedule: {
        id: updated.id,
        nextReviewAt: new Date(updated.nextReviewAt),
        intervalDays: updated.intervalDays,
        repetitionCount: updated.repetitionCount,
        easeFactor: updated.easeFactor
      }
    };
  }
};
