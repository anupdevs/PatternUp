import { prisma } from '@/lib/prisma';
import { AttemptOutcome, ProgressStatus } from '@prisma/client';
import { isLiveDb } from '@/lib/db-check';
import { offlineProgress } from '@/lib/offline-progress';

export type ReviewRating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

export class RevisionService {
  /**
   * Fetches problems currently due for spaced repetition review.
   * Sorted by most overdue first (nextReviewAt ASC).
   */
  static async getRevisionDueProblems(userId: string, includeUpcomingHours = 0): Promise<any> {
    if (!isLiveDb()) {
      return offlineProgress.getRevisionDueProblems(userId, includeUpcomingHours);
    }
    try {
      return await this.getRevisionDueProblemsFromDb(userId, includeUpcomingHours);
    } catch {
      return offlineProgress.getRevisionDueProblems(userId, includeUpcomingHours);
    }
  }

  private static async getRevisionDueProblemsFromDb(userId: string, includeUpcomingHours = 0) {
    const cutoffDate = new Date(Date.now() + includeUpcomingHours * 60 * 60 * 1000);

    return prisma.revisionSchedule.findMany({
      where: {
        clerkUserId: userId,
        nextReviewAt: {
          lte: cutoffDate
        }
      },
      orderBy: { nextReviewAt: 'asc' },
      include: {
        problem: {
          include: {
            patterns: {
              include: {
                pattern: {
                  include: { topic: true }
                }
              }
            },
            progress: {
              where: { clerkUserId: userId },
              take: 1
            }
          }
        }
      }
    });
  }

  /**
   * Records a spaced repetition review rating (Again, Hard, Good, Easy)
   * and adjusts next review date, interval, and ease factor deterministically.
   */
  static async recordReviewOutcome(
    userId: string,
    problemId: string,
    rating: ReviewRating
  ): Promise<any> {
    if (!isLiveDb()) {
      return offlineProgress.recordReviewOutcome(userId, problemId, rating);
    }
    try {
      return await this.recordReviewOutcomeInDb(userId, problemId, rating);
    } catch {
      return offlineProgress.recordReviewOutcome(userId, problemId, rating);
    }
  }

  private static async recordReviewOutcomeInDb(
    userId: string,
    problemId: string,
    rating: ReviewRating
  ) {
    // 1. Resolve problem ID (support ID or canonical slug)
    const problem = await prisma.problem.findFirst({
      where: {
        OR: [{ id: problemId }, { canonicalSlug: problemId }]
      }
    });
    if (!problem) {
      throw new Error(`Problem not found: ${problemId}`);
    }

    const resolvedProblemId = problem.id;
    const now = new Date();

    return prisma.$transaction(async (tx) => {
      const currentSchedule = await tx.revisionSchedule.findUnique({
        where: { clerkUserId_problemId: { clerkUserId: userId, problemId: resolvedProblemId } }
      });

      const currentEase = currentSchedule?.easeFactor ?? 2.5;
      const currentInterval = currentSchedule?.intervalDays ?? 1.0;
      const currentStreak = currentSchedule?.repetitionCount ?? 0;

      let nextIntervalDays: number;
      let nextRepetitionCount: number;
      let nextEaseFactor: number;
      let attemptOutcome: AttemptOutcome;
      let nextStatus: ProgressStatus;

      switch (rating) {
        case 'AGAIN':
          nextIntervalDays = 1.0;
          nextRepetitionCount = 0;
          nextEaseFactor = Math.max(1.3, Number((currentEase - 0.2).toFixed(2)));
          attemptOutcome = AttemptOutcome.FAILED;
          nextStatus = ProgressStatus.NEEDS_REVISION;
          break;

        case 'HARD':
          nextIntervalDays = Math.max(1.5, Number(((currentInterval || 1.0) * 1.2).toFixed(1)));
          nextRepetitionCount = currentStreak + 1;
          nextEaseFactor = Math.max(1.3, Number((currentEase - 0.15).toFixed(2)));
          attemptOutcome = AttemptOutcome.SOLVED;
          nextStatus = ProgressStatus.SOLVED;
          break;

        case 'GOOD':
          if (currentStreak <= 0) nextIntervalDays = 1.0;
          else if (currentStreak === 1) nextIntervalDays = 3.0;
          else nextIntervalDays = Math.max(4.0, Math.round(currentInterval * currentEase));
          nextRepetitionCount = currentStreak + 1;
          nextEaseFactor = Number(currentEase.toFixed(2));
          attemptOutcome = AttemptOutcome.SOLVED;
          nextStatus = ProgressStatus.SOLVED;
          break;

        case 'EASY':
          if (currentStreak <= 0) nextIntervalDays = 2.0;
          else if (currentStreak === 1) nextIntervalDays = 4.0;
          else nextIntervalDays = Math.max(5.0, Math.round(currentInterval * (currentEase + 0.2)));
          nextRepetitionCount = currentStreak + 1;
          nextEaseFactor = Math.min(3.0, Number((currentEase + 0.15).toFixed(2)));
          attemptOutcome = AttemptOutcome.SOLVED;
          nextStatus = ProgressStatus.SOLVED;
          break;
      }

      const nextReviewAt = new Date(now.getTime() + Math.round(nextIntervalDays * 24 * 60 * 60 * 1000));

      // Upsert revision schedule
      const updatedSchedule = await tx.revisionSchedule.upsert({
        where: { clerkUserId_problemId: { clerkUserId: userId, problemId: resolvedProblemId } },
        create: {
          clerkUserId: userId,
          problemId: resolvedProblemId,
          nextReviewAt,
          intervalDays: nextIntervalDays,
          repetitionCount: nextRepetitionCount,
          easeFactor: nextEaseFactor,
          lastReviewedAt: now
        },
        update: {
          nextReviewAt,
          intervalDays: nextIntervalDays,
          repetitionCount: nextRepetitionCount,
          easeFactor: nextEaseFactor,
          lastReviewedAt: now
        }
      });

      // Update progress
      await tx.userProblemProgress.upsert({
        where: { clerkUserId_problemId: { clerkUserId: userId, problemId: resolvedProblemId } },
        create: {
          clerkUserId: userId,
          problemId: resolvedProblemId,
          status: nextStatus,
          firstAttemptAt: now,
          lastAttemptAt: now,
          solvedAt: attemptOutcome === AttemptOutcome.SOLVED ? now : null,
          totalAttempts: 1,
          successfulAttempts: attemptOutcome === AttemptOutcome.SOLVED ? 1 : 0,
          failedAttempts: attemptOutcome !== AttemptOutcome.SOLVED ? 1 : 0,
          totalTimeSpentSeconds: 120
        },
        update: {
          status: nextStatus,
          lastAttemptAt: now,
          solvedAt: attemptOutcome === AttemptOutcome.SOLVED ? now : undefined,
          totalAttempts: { increment: 1 },
          successfulAttempts: attemptOutcome === AttemptOutcome.SOLVED ? { increment: 1 } : undefined,
          failedAttempts: attemptOutcome !== AttemptOutcome.SOLVED ? { increment: 1 } : undefined
        }
      });

      // Create practice attempt log
      await tx.practiceAttempt.create({
        data: {
          clerkUserId: userId,
          problemId: resolvedProblemId,
          outcome: attemptOutcome,
          durationSeconds: 120,
          approachNotes: `SM-2 Spaced Revision: Evaluated as ${rating}. Next review in ${nextIntervalDays} day(s).`,
          attemptedAt: now
        }
      });

      return updatedSchedule;
    });
  }
}

