import { prisma } from '@/lib/prisma';
import { RecordAttemptInput } from '@/lib/validations';
import { calculateNextRevisionSchedule } from '@/lib/spaced-repetition';
import { AttemptOutcome, ProgressStatus, Prisma } from '@prisma/client';
import { isLiveDb } from '@/lib/db-check';
import { offlineProgress } from '@/lib/offline-progress';

export class ProgressService {
  /**
   * Atomically records a practice attempt, updates user progress,
   * logs daily study activity, and advances revision scheduling within a single transaction.
   */
  static async recordAttempt(userId: string, input: RecordAttemptInput): Promise<any> {
    if (!isLiveDb()) {
      return offlineProgress.recordAttempt(userId, input);
    }
    try {
      return await this.recordAttemptInDb(userId, input);
    } catch {
      return offlineProgress.recordAttempt(userId, input);
    }
  }

  private static async recordAttemptInDb(userId: string, input: RecordAttemptInput) {
    const {
      problemId,
      outcome,
      durationSeconds,
      approachNotes,
      difficultyExperienced,
      personalDifficulty,
      confidenceRating
    } = input;

    // 1. Verify problem exists
    const problem = await prisma.problem.findFirst({
      where: {
        OR: [{ id: problemId }, { canonicalSlug: problemId }]
      }
    });
    if (!problem) {
      throw new Error(`Problem with id or slug '${problemId}' not found.`);
    }

    const resolvedProblemId = problem.id;
    const now = new Date();
    const todayStr = input.date || now.toISOString().slice(0, 10);

    return prisma.$transaction(async (tx) => {
      // A. Create immutable attempt history record
      const attempt = await tx.practiceAttempt.create({
        data: {
          clerkUserId: userId,
          problemId: resolvedProblemId,
          outcome,
          durationSeconds,
          approachNotes,
          difficultyExperienced,
          attemptedAt: now
        }
      });

      // B. Fetch existing progress and revision schedule
      const existingProgress = await tx.userProblemProgress.findUnique({
        where: { clerkUserId_problemId: { clerkUserId: userId, problemId: resolvedProblemId } }
      });

      const existingRevision = await tx.revisionSchedule.findUnique({
        where: { clerkUserId_problemId: { clerkUserId: userId, problemId: resolvedProblemId } }
      });

      // C. Determine next status based on outcome and current state
      let nextStatus: ProgressStatus;
      if (outcome === AttemptOutcome.SOLVED) {
        nextStatus = ProgressStatus.SOLVED;
      } else if (outcome === AttemptOutcome.FAILED) {
        if (existingProgress?.status === ProgressStatus.SOLVED) {
          nextStatus = ProgressStatus.NEEDS_REVISION;
        } else {
          nextStatus = existingProgress?.status ?? ProgressStatus.ATTEMPTED;
          if (nextStatus === ProgressStatus.NOT_STARTED) nextStatus = ProgressStatus.ATTEMPTED;
        }
      } else {
        // PARTIALLY_SOLVED
        if (existingProgress?.status === ProgressStatus.SOLVED) {
          nextStatus = ProgressStatus.SOLVED;
        } else {
          nextStatus = ProgressStatus.ATTEMPTED;
        }
      }

      // D. Update or initialize UserProblemProgress
      const progress = await tx.userProblemProgress.upsert({
        where: { clerkUserId_problemId: { clerkUserId: userId, problemId: resolvedProblemId } },
        create: {
          clerkUserId: userId,
          problemId: resolvedProblemId,
          status: nextStatus,
          firstAttemptAt: now,
          lastAttemptAt: now,
          solvedAt: outcome === AttemptOutcome.SOLVED ? now : null,
          totalAttempts: 1,
          successfulAttempts: outcome === AttemptOutcome.SOLVED ? 1 : 0,
          failedAttempts: outcome !== AttemptOutcome.SOLVED ? 1 : 0,
          totalTimeSpentSeconds: durationSeconds,
          personalDifficulty: personalDifficulty ?? difficultyExperienced,
          confidenceRating: confidenceRating
        },
        update: {
          status: nextStatus,
          lastAttemptAt: now,
          solvedAt:
            outcome === AttemptOutcome.SOLVED && !existingProgress?.solvedAt
              ? now
              : existingProgress?.solvedAt,
          totalAttempts: { increment: 1 },
          successfulAttempts: outcome === AttemptOutcome.SOLVED ? { increment: 1 } : undefined,
          failedAttempts: outcome !== AttemptOutcome.SOLVED ? { increment: 1 } : undefined,
          totalTimeSpentSeconds: { increment: durationSeconds },
          personalDifficulty: personalDifficulty ?? difficultyExperienced ?? undefined,
          confidenceRating: confidenceRating ?? undefined
        }
      });

      // E. Update Spaced Repetition Revision Schedule
      const revisionCalc = calculateNextRevisionSchedule({
        currentRepetitionCount: existingRevision?.repetitionCount ?? 0,
        currentIntervalDays: existingRevision?.intervalDays ?? 1.0,
        currentEaseFactor: existingRevision?.easeFactor ?? 2.5,
        outcome,
        difficultyExperienced,
        referenceDate: now
      });

      const revision = await tx.revisionSchedule.upsert({
        where: { clerkUserId_problemId: { clerkUserId: userId, problemId: resolvedProblemId } },
        create: {
          clerkUserId: userId,
          problemId: resolvedProblemId,
          nextReviewAt: revisionCalc.nextReviewAt,
          intervalDays: revisionCalc.intervalDays,
          repetitionCount: revisionCalc.repetitionCount,
          easeFactor: revisionCalc.easeFactor,
          lastReviewedAt: now
        },
        update: {
          nextReviewAt: revisionCalc.nextReviewAt,
          intervalDays: revisionCalc.intervalDays,
          repetitionCount: revisionCalc.repetitionCount,
          easeFactor: revisionCalc.easeFactor,
          lastReviewedAt: now
        }
      });

      // F. Update DailyActivity
      await tx.dailyActivity.upsert({
        where: { clerkUserId_date: { clerkUserId: userId, date: todayStr } },
        create: {
          clerkUserId: userId,
          date: todayStr,
          questionsAttempted: 1,
          questionsSolved: outcome === AttemptOutcome.SOLVED ? 1 : 0,
          studyDurationSeconds: durationSeconds
        },
        update: {
          questionsAttempted: { increment: 1 },
          questionsSolved: outcome === AttemptOutcome.SOLVED ? { increment: 1 } : undefined,
          studyDurationSeconds: { increment: durationSeconds }
        }
      });

      return {
        attempt,
        progress,
        revision
      };
    });
  }

  /**
   * Manual problem status update (e.g. marking solved or needs revision directly from UI).
   */
  static async updateStatus(userId: string, problemId: string, status: ProgressStatus): Promise<any> {
    if (!isLiveDb()) {
      return offlineProgress.updateProgressStatus(userId, problemId, status);
    }
    try {
      const problem = await prisma.problem.findFirst({
        where: {
          OR: [{ id: problemId }, { canonicalSlug: problemId }]
        }
      });
      if (!problem) return offlineProgress.updateProgressStatus(userId, problemId, status);

      const now = new Date();

      return await prisma.userProblemProgress.upsert({
        where: { clerkUserId_problemId: { clerkUserId: userId, problemId: problem.id } },
        create: {
          clerkUserId: userId,
          problemId: problem.id,
          status,
          solvedAt: status === ProgressStatus.SOLVED ? now : null,
          firstAttemptAt: status !== ProgressStatus.NOT_STARTED ? now : null,
          lastAttemptAt: status !== ProgressStatus.NOT_STARTED ? now : null
        },
        update: {
          status,
          solvedAt: status === ProgressStatus.SOLVED ? now : undefined
        }
      });
    } catch {
      return offlineProgress.updateProgressStatus(userId, problemId, status);
    }
  }

  /**
   * Aggregates comprehensive dashboard metrics for the authenticated user.
   */
  static async getDashboardStatistics(userId: string): Promise<any> {
    if (!isLiveDb()) {
      return offlineProgress.getDashboardStatistics(userId);
    }
    try {
      return await this.getDashboardStatisticsFromDb(userId);
    } catch {
      return offlineProgress.getDashboardStatistics(userId);
    }
  }

  private static async getDashboardStatisticsFromDb(userId: string) {
    const [
      totalPlatformProblems,
      userProgressRecords,
      totalAttemptsCount,
      recentAttempts,
      recentActivities
    ] = await prisma.$transaction([
      prisma.problem.count(),
      prisma.userProblemProgress.findMany({
        where: { clerkUserId: userId },
        include: {
          problem: {
            select: { difficulty: true }
          }
        }
      }),
      prisma.practiceAttempt.count({
        where: { clerkUserId: userId }
      }),
      prisma.practiceAttempt.findMany({
        where: { clerkUserId: userId },
        take: 10,
        orderBy: { attemptedAt: 'desc' },
        include: {
          problem: {
            select: { title: true, canonicalSlug: true, difficulty: true }
          }
        }
      }),
      prisma.dailyActivity.findMany({
        where: { clerkUserId: userId },
        take: 30,
        orderBy: { date: 'desc' }
      })
    ]);

    const solvedRecords = userProgressRecords.filter((r) => r.status === ProgressStatus.SOLVED);
    const attemptedRecords = userProgressRecords.filter((r) => r.status === ProgressStatus.ATTEMPTED);
    const revisionRecords = userProgressRecords.filter((r) => r.status === ProgressStatus.NEEDS_REVISION);

    let totalTimeSpentSeconds = 0;
    userProgressRecords.forEach((r) => {
      totalTimeSpentSeconds += r.totalTimeSpentSeconds;
    });

    const difficultyBreakdown = {
      EASY: { solved: 0, total: 0 },
      MEDIUM: { solved: 0, total: 0 },
      HARD: { solved: 0, total: 0 }
    };

    const difficultiesCount = await prisma.problem.groupBy({
      by: ['difficulty'],
      _count: true
    });

    difficultiesCount.forEach((d) => {
      if (d.difficulty in difficultyBreakdown) {
        difficultyBreakdown[d.difficulty as keyof typeof difficultyBreakdown].total = d._count;
      }
    });

    solvedRecords.forEach((r) => {
      const diff = r.problem.difficulty;
      if (diff in difficultyBreakdown) {
        difficultyBreakdown[diff as keyof typeof difficultyBreakdown].solved++;
      }
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
        totalAttemptsCount,
        totalTimeSpentSeconds
      },
      difficultyBreakdown,
      recentAttempts,
      recentActivities
    };
  }

  /**
   * Topic-level mastery and progress breakdown.
   */
  static async getTopicProgress(userId: string): Promise<any> {
    if (!isLiveDb()) {
      return offlineProgress.getTopicProgress(userId);
    }
    try {
      return await this.getTopicProgressFromDb(userId);
    } catch {
      return offlineProgress.getTopicProgress(userId);
    }
  }

  private static async getTopicProgressFromDb(userId: string) {
    const topics = await prisma.topic.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        patterns: {
          include: {
            problems: {
              include: {
                problem: {
                  include: {
                    progress: {
                      where: { clerkUserId: userId },
                      take: 1
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    return topics.map((t) => {
      const uniqueProblemIds = new Set<string>();
      const solvedProblemIds = new Set<string>();
      const attemptedProblemIds = new Set<string>();

      t.patterns.forEach((pat) => {
        pat.problems.forEach((pp) => {
          uniqueProblemIds.add(pp.problemId);
          const prog = pp.problem.progress[0];
          if (prog) {
            if (prog.status === ProgressStatus.SOLVED) {
              solvedProblemIds.add(pp.problemId);
            } else if (prog.status === ProgressStatus.ATTEMPTED || prog.status === ProgressStatus.NEEDS_REVISION) {
              attemptedProblemIds.add(pp.problemId);
            }
          }
        });
      });

      const totalProblems = uniqueProblemIds.size;
      const solvedProblems = solvedProblemIds.size;
      const attemptedProblems = attemptedProblemIds.size;

      return {
        topicId: t.id,
        topicName: t.name,
        topicSlug: t.slug,
        displayOrder: t.displayOrder,
        totalProblems,
        solvedProblems,
        attemptedProblems,
        percentComplete:
          totalProblems > 0 ? Number(((solvedProblems / totalProblems) * 100).toFixed(1)) : 0
      };
    });
  }

  /**
   * Fetches chronological practice attempt history for user with multi-criteria filtering.
   */
  static async getAttemptHistory(
    userId: string,
    filters: {
      topic?: string;
      outcome?: AttemptOutcome;
      from?: string;
      to?: string;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<any> {
    if (!isLiveDb()) {
      return offlineProgress.getPracticeHistory(userId, undefined, filters.page, filters.limit);
    }
    try {
      return await this.getAttemptHistoryFromDb(userId, filters);
    } catch {
      return offlineProgress.getPracticeHistory(userId, undefined, filters.page, filters.limit);
    }
  }

  private static async getAttemptHistoryFromDb(
    userId: string,
    filters: {
      topic?: string;
      outcome?: AttemptOutcome;
      from?: string;
      to?: string;
      limit?: number;
      page?: number;
    } = {}
  ) {
    const { topic, outcome, from, to, limit = 50, page = 1 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.PracticeAttemptWhereInput = {
      clerkUserId: userId
    };

    if (outcome) {
      where.outcome = outcome;
    }

    if (from || to) {
      where.attemptedAt = {};
      if (from) where.attemptedAt.gte = new Date(from);
      if (to) where.attemptedAt.lte = new Date(to);
    }

    if (topic) {
      where.problem = {
        patterns: {
          some: {
            pattern: {
              topic: {
                slug: topic
              }
            }
          }
        }
      };
    }

    const [attempts, totalCount] = await prisma.$transaction([
      prisma.practiceAttempt.findMany({
        where,
        orderBy: { attemptedAt: 'desc' },
        skip,
        take: limit,
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              canonicalSlug: true,
              difficulty: true,
              originalPdfQuestionNumber: true,
              patterns: {
                take: 1,
                include: {
                  pattern: {
                    include: { topic: true }
                  }
                }
              }
            }
          }
        }
      }),
      prisma.practiceAttempt.count({ where })
    ]);

    const formattedAttempts = attempts.map((att) => {
      const firstPattern = att.problem.patterns[0];
      return {
        id: att.id,
        attemptedAt: att.attemptedAt,
        outcome: att.outcome,
        durationSeconds: att.durationSeconds,
        approachNotes: att.approachNotes,
        difficultyExperienced: att.difficultyExperienced,
        problem: {
          id: att.problem.id,
          title: att.problem.title,
          canonicalSlug: att.problem.canonicalSlug,
          difficulty: att.problem.difficulty,
          originalPdfQuestionNumber: att.problem.originalPdfQuestionNumber,
          topicName: firstPattern?.pattern.topic.name || 'DSA',
          topicSlug: firstPattern?.pattern.topic.slug || '',
          patternName: firstPattern?.pattern.name || 'General'
        }
      };
    });

    return {
      attempts: formattedAttempts,
      pagination: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  /**
   * Comprehensive analytics and insights aggregation based on verified user records.
   */
  static async getAnalytics(userId: string): Promise<any> {
    if (!isLiveDb()) {
      return offlineProgress.getAnalytics(userId);
    }
    try {
      return await this.getAnalyticsFromDb(userId);
    } catch {
      return offlineProgress.getAnalytics(userId);
    }
  }

  private static async getAnalyticsFromDb(userId: string) {
    const [
      topicProgress,
      allProgress,
      allAttempts,
      dailyActivities,
      hintRevealsCount,
      revisionDueCount
    ] = await prisma.$transaction([
      // 1. Topic breakdown
      prisma.topic.findMany({
        orderBy: { displayOrder: 'asc' },
        include: {
          patterns: {
            include: {
              problems: {
                include: {
                  problem: {
                    include: {
                      progress: { where: { clerkUserId: userId }, take: 1 }
                    }
                  }
                }
              }
            }
          }
        }
      }),
      // 2. All user progress records
      prisma.userProblemProgress.findMany({
        where: { clerkUserId: userId },
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              canonicalSlug: true,
              difficulty: true,
              patterns: {
                take: 1,
                include: {
                  pattern: {
                    select: {
                      name: true,
                      slug: true,
                      topic: { select: { name: true, slug: true } }
                    }
                  }
                }
              }
            }
          }
        }
      }),
      // 3. User practice attempts
      prisma.practiceAttempt.findMany({
        where: { clerkUserId: userId },
        orderBy: { attemptedAt: 'desc' },
        select: {
          outcome: true,
          durationSeconds: true,
          attemptedAt: true,
          problemId: true
        }
      }),
      // 4. Daily study activities
      prisma.dailyActivity.findMany({
        where: { clerkUserId: userId },
        orderBy: { date: 'desc' },
        take: 365
      }),
      // 5. Total hint reveals
      prisma.hintReveal.count({
        where: { clerkUserId: userId }
      }),
      // 6. Problems currently needing revision
      prisma.revisionSchedule.count({
        where: {
          clerkUserId: userId,
          nextReviewAt: { lte: new Date() }
        }
      })
    ]);

    // Topic completion stats
    const topicStats = topicProgress.map((t) => {
      const problemSet = new Set<string>();
      const solvedSet = new Set<string>();
      t.patterns.forEach((p) => {
        p.problems.forEach((pp) => {
          problemSet.add(pp.problemId);
          if (pp.problem.progress[0]?.status === ProgressStatus.SOLVED) {
            solvedSet.add(pp.problemId);
          }
        });
      });
      return {
        topicName: t.name,
        topicSlug: t.slug,
        totalProblems: problemSet.size,
        solvedProblems: solvedSet.size,
        percentComplete: problemSet.size > 0 ? Number(((solvedSet.size / problemSet.size) * 100).toFixed(1)) : 0
      };
    });

    // Outcomes breakdown
    let totalSolvedAttempts = 0;
    let totalFailedAttempts = 0;
    let totalPartialAttempts = 0;
    let totalDurationSeconds = 0;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let past7DaysDurationSeconds = 0;

    allAttempts.forEach((att) => {
      totalDurationSeconds += att.durationSeconds;
      if (new Date(att.attemptedAt) >= sevenDaysAgo) {
        past7DaysDurationSeconds += att.durationSeconds;
      }
      if (att.outcome === AttemptOutcome.SOLVED) totalSolvedAttempts++;
      else if (att.outcome === AttemptOutcome.FAILED) totalFailedAttempts++;
      else totalPartialAttempts++;
    });

    // Repeated failures analysis (failed 2 or more times)
    const repeatedFailures = allProgress
      .filter((p) => p.failedAttempts >= 2)
      .map((p) => ({
        problemId: p.problem.id,
        title: p.problem.title,
        canonicalSlug: p.problem.canonicalSlug,
        difficulty: p.problem.difficulty,
        patternName: p.problem.patterns[0]?.pattern.name || 'General',
        failedAttempts: p.failedAttempts,
        status: p.status
      }))
      .sort((a, b) => b.failedAttempts - a.failedAttempts)
      .slice(0, 10);

    // Difficulty breakdown
    const difficultyDistribution = {
      EASY: { solved: 0, attempted: 0 },
      MEDIUM: { solved: 0, attempted: 0 },
      HARD: { solved: 0, attempted: 0 }
    };

    allProgress.forEach((p) => {
      const d = p.problem.difficulty as 'EASY' | 'MEDIUM' | 'HARD';
      if (difficultyDistribution[d]) {
        if (p.status === ProgressStatus.SOLVED) {
          difficultyDistribution[d].solved++;
        }
        if (p.totalAttempts > 0) {
          difficultyDistribution[d].attempted++;
        }
      }
    });

    // Pattern-level aggregation for Weak-Pattern Detection
    const patternMap = new Map<string, {
      name: string;
      slug: string;
      topicName: string;
      totalAttempts: number;
      failedAttempts: number;
      solvedCount: number;
      repeatedProblemsCount: number;
      confidenceSum: number;
      confidenceCount: number;
    }>();

    allProgress.forEach((p) => {
      const patRecord = p.problem.patterns[0];
      if (!patRecord?.pattern) return;
      const pat = patRecord.pattern;
      const key = pat.slug;

      if (!patternMap.has(key)) {
        patternMap.set(key, {
          name: pat.name,
          slug: pat.slug,
          topicName: pat.topic?.name || 'General',
          totalAttempts: 0,
          failedAttempts: 0,
          solvedCount: 0,
          repeatedProblemsCount: 0,
          confidenceSum: 0,
          confidenceCount: 0
        });
      }

      const entry = patternMap.get(key)!;
      entry.totalAttempts += p.totalAttempts;
      entry.failedAttempts += p.failedAttempts;
      if (p.status === ProgressStatus.SOLVED) entry.solvedCount++;
      if (p.totalAttempts >= 2) entry.repeatedProblemsCount++;
      if (p.confidenceRating) {
        entry.confidenceSum += p.confidenceRating;
        entry.confidenceCount++;
      }
    });

    // Flag weak patterns only when user has sufficient attempts (>= 2)
    const weakPatterns = Array.from(patternMap.values())
      .filter((entry) => entry.totalAttempts >= 2)
      .map((entry) => {
        const failRate = entry.totalAttempts > 0 ? entry.failedAttempts / entry.totalAttempts : 0;
        const avgConfidence = entry.confidenceCount > 0 ? entry.confidenceSum / entry.confidenceCount : null;
        const reasons: string[] = [];

        if (failRate >= 0.4) {
          reasons.push(`High failure rate (${Math.round(failRate * 100)}% of attempts unsuccessful)`);
        }
        if (entry.repeatedProblemsCount >= 2) {
          reasons.push(`${entry.repeatedProblemsCount} problems required repeated re-attempts`);
        }
        if (avgConfidence !== null && avgConfidence <= 2.5) {
          reasons.push(`Low self-reported confidence (${avgConfidence.toFixed(1)} / 5)`);
        }

        return {
          patternName: entry.name,
          patternSlug: entry.slug,
          topicName: entry.topicName,
          totalAttempts: entry.totalAttempts,
          failedAttempts: entry.failedAttempts,
          solvedCount: entry.solvedCount,
          failRate: Number((failRate * 100).toFixed(1)),
          avgConfidence: avgConfidence ? Number(avgConfidence.toFixed(1)) : null,
          reasons,
          isWeak: reasons.length > 0
        };
      })
      .filter((p) => p.isWeak)
      .sort((a, b) => b.failRate - a.failRate);

    return {
      topicStats,
      difficultyDistribution,
      attemptTotals: {
        totalAttempts: allAttempts.length,
        solvedAttempts: totalSolvedAttempts,
        failedAttempts: totalFailedAttempts,
        partialAttempts: totalPartialAttempts,
        totalDurationSeconds,
        past7DaysDurationSeconds
      },
      repeatedFailures,
      weakPatterns,
      dailyActivities,
      hintUsageCount: hintRevealsCount,
      revisionDueCount
    };
  }
}

