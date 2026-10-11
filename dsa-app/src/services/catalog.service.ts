import { prisma } from '@/lib/prisma';
import { ProblemQueryInput } from '@/lib/validations';
import { Prisma, ProgressStatus } from '@prisma/client';
import { isLiveDb } from '@/lib/db-check';
import { offlineCatalog } from '@/lib/offline-catalog';

export interface CatalogProblemItem {
  id: string;
  canonicalSlug: string;
  title: string;
  difficulty: string;
  platform: string;
  externalUrl: string | null;
  originalPdfQuestionNumber: number;
  sourcePage: string | null;
  tags: string[];
  patterns: Array<{
    sheetNumber: number;
    pdfTitle: string;
    patternName: string;
    patternSlug: string;
    topicName: string;
    topicSlug: string;
  }>;
  userProgress?: {
    status: ProgressStatus;
    totalAttempts: number;
    successfulAttempts: number;
    solvedAt: Date | null;
  };
  isBookmarked?: boolean;
}

export class CatalogService {
  /**
   * List all topics with pattern counts and problem counts.
   */
  static async listTopics(): Promise<any> {
    if (!isLiveDb()) {
      return offlineCatalog.getTopics();
    }
    try {
      return await prisma.topic.findMany({
        orderBy: { displayOrder: 'asc' },
        include: {
          patterns: {
            orderBy: { displayOrder: 'asc' },
            include: {
              _count: {
                select: { problems: true }
              }
            }
          }
        }
      });
    } catch {
      return offlineCatalog.getTopics();
    }
  }

  /**
   * List patterns, optionally filtered by topic slug.
   */
  static async listPatterns(topicSlug?: string): Promise<any> {
    if (!isLiveDb()) {
      return offlineCatalog.getPatterns(topicSlug);
    }
    try {
      return await prisma.pattern.findMany({
        where: topicSlug ? { topic: { slug: topicSlug } } : undefined,
        orderBy: { displayOrder: 'asc' },
        include: {
          topic: true,
          _count: {
            select: { problems: true }
          }
        }
      });
    } catch {
      return offlineCatalog.getPatterns(topicSlug);
    }
  }

  /**
   * Paginated problem listing with comprehensive multi-criteria filtering.
   */
  static async listProblems(params: ProblemQueryInput, userId?: string | null): Promise<any> {
    if (!isLiveDb()) {
      return offlineCatalog.listProblems(params, userId);
    }
    try {
      return await this.listProblemsFromDb(params, userId);
    } catch {
      return offlineCatalog.listProblems(params, userId);
    }
  }

  private static async listProblemsFromDb(params: ProblemQueryInput, userId?: string | null) {
    const { page, limit, difficulty, status, topic, pattern, bookmarked, search } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ProblemWhereInput = {};

    if (difficulty) {
      where.difficulty = difficulty;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { canonicalSlug: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } }
      ];
    }

    if (topic || pattern) {
      where.patterns = {
        some: {
          pattern: {
            ...(pattern ? { slug: pattern } : {}),
            ...(topic ? { topic: { slug: topic } } : {})
          }
        }
      };
    }

    if (userId) {
      if (status) {
        if (status === ProgressStatus.NOT_STARTED) {
          where.OR = [
            { progress: { none: { clerkUserId: userId } } },
            { progress: { some: { clerkUserId: userId, status: ProgressStatus.NOT_STARTED } } }
          ];
        } else {
          where.progress = {
            some: {
              clerkUserId: userId,
              status
            }
          };
        }
      }

      if (bookmarked !== undefined) {
        if (bookmarked) {
          where.bookmarks = {
            some: { clerkUserId: userId }
          };
        } else {
          where.bookmarks = {
            none: { clerkUserId: userId }
          };
        }
      }
    }

    const [totalCount, problems] = await prisma.$transaction([
      prisma.problem.count({ where }),
      prisma.problem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { originalPdfQuestionNumber: 'asc' },
        include: {
          patterns: {
            include: {
              pattern: {
                include: { topic: true }
              }
            },
            orderBy: { displayOrder: 'asc' }
          },
          ...(userId
            ? {
                progress: {
                  where: { clerkUserId: userId },
                  take: 1
                },
                bookmarks: {
                  where: { clerkUserId: userId },
                  take: 1
                }
              }
            : {})
        }
      })
    ]);

    const formattedProblems: CatalogProblemItem[] = problems.map((p) => {
      const progressRecord = p.progress && p.progress.length > 0 ? p.progress[0] : null;
      const isBookmarked = p.bookmarks && p.bookmarks.length > 0;

      return {
        id: p.id,
        canonicalSlug: p.canonicalSlug,
        title: p.title,
        difficulty: p.difficulty,
        platform: p.platform,
        externalUrl: p.externalUrl,
        originalPdfQuestionNumber: p.originalPdfQuestionNumber,
        sourcePage: p.sourcePage,
        tags: p.tags,
        patterns: p.patterns.map((pp) => ({
          sheetNumber: pp.sheetNumber,
          pdfTitle: pp.pdfTitle,
          patternName: pp.pattern.name,
          patternSlug: pp.pattern.slug,
          topicName: pp.pattern.topic.name,
          topicSlug: pp.pattern.topic.slug
        })),
        userProgress: progressRecord
          ? {
              status: progressRecord.status,
              totalAttempts: progressRecord.totalAttempts,
              successfulAttempts: progressRecord.successfulAttempts,
              solvedAt: progressRecord.solvedAt
            }
          : {
              status: ProgressStatus.NOT_STARTED,
              totalAttempts: 0,
              successfulAttempts: 0,
              solvedAt: null
            },
        isBookmarked: Boolean(isBookmarked)
      };
    });

    return {
      problems: formattedProblems,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  /**
   * Fetch complete problem details, including notes, progressive hints, and revision state.
   */
  static async getProblemDetails(problemIdOrSlug: string, userId?: string | null): Promise<any> {
    if (!isLiveDb()) {
      return offlineCatalog.getProblemDetails(problemIdOrSlug, userId);
    }
    try {
      return await this.getProblemDetailsFromDb(problemIdOrSlug, userId);
    } catch {
      return offlineCatalog.getProblemDetails(problemIdOrSlug, userId);
    }
  }

  private static async getProblemDetailsFromDb(problemIdOrSlug: string, userId?: string | null) {
    const isCuid = problemIdOrSlug.startsWith('c') && problemIdOrSlug.length >= 20;

    const problem = await prisma.problem.findFirst({
      where: isCuid ? { id: problemIdOrSlug } : { canonicalSlug: problemIdOrSlug },
      include: {
        patterns: {
          include: {
            pattern: {
              include: { topic: true }
            }
          }
        },
        hints: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            order: true,
            sourceType: true,
            verified: true,
            content: true
          }
        },
        ...(userId
          ? {
              progress: { where: { clerkUserId: userId }, take: 1 },
              notes: { where: { clerkUserId: userId }, take: 1 },
              bookmarks: { where: { clerkUserId: userId }, take: 1 },
              revisionSchedules: { where: { clerkUserId: userId }, take: 1 },
              hintReveals: { where: { clerkUserId: userId } }
            }
          : {})
      }
    });

    if (!problem) return null;

    const userProgress = problem.progress && problem.progress.length > 0 ? problem.progress[0] : null;
    const userNote = problem.notes && problem.notes.length > 0 ? problem.notes[0] : null;
    const isBookmarked = problem.bookmarks && problem.bookmarks.length > 0;
    const revisionSchedule = problem.revisionSchedules && problem.revisionSchedules.length > 0 ? problem.revisionSchedules[0] : null;

    const revealedHintIds = new Set(
      problem.hintReveals ? problem.hintReveals.map((r) => r.hintId) : []
    );

    // Progressive Hints masking:
    // Only return the actual content if it was explicitly revealed by this user.
    // Order 1 is unrevealed until requested, or can be masked.
    const progressiveHints = problem.hints.map((h) => {
      const isRevealed = revealedHintIds.has(h.id);
      return {
        id: h.id,
        order: h.order,
        sourceType: h.sourceType,
        verified: h.verified,
        isRevealed,
        content: isRevealed ? h.content : null
      };
    });

    return {
      id: problem.id,
      canonicalSlug: problem.canonicalSlug,
      title: problem.title,
      description: problem.description,
      difficulty: problem.difficulty,
      difficultySource: problem.difficultySource,
      platform: problem.platform,
      externalUrl: problem.externalUrl,
      originalPdfQuestionNumber: problem.originalPdfQuestionNumber,
      sourcePage: problem.sourcePage,
      tags: problem.tags,
      examples: problem.examples,
      constraints: problem.constraints,
      patterns: problem.patterns.map((pp) => ({
        sheetNumber: pp.sheetNumber,
        pdfTitle: pp.pdfTitle,
        pdfPage: pp.pdfPage,
        patternName: pp.pattern.name,
        patternSlug: pp.pattern.slug,
        topicName: pp.pattern.topic.name,
        topicSlug: pp.pattern.topic.slug
      })),
      hints: progressiveHints,
      userProgress: userProgress ?? {
        status: ProgressStatus.NOT_STARTED,
        totalAttempts: 0,
        successfulAttempts: 0,
        failedAttempts: 0,
        totalTimeSpentSeconds: 0,
        firstAttemptAt: null,
        lastAttemptAt: null,
        solvedAt: null,
        personalDifficulty: null,
        confidenceRating: null
      },
      userNote: userNote ? { id: userNote.id, content: userNote.content, updatedAt: userNote.updatedAt } : null,
      isBookmarked: Boolean(isBookmarked),
      revisionSchedule: revisionSchedule
        ? {
            nextReviewAt: revisionSchedule.nextReviewAt,
            intervalDays: revisionSchedule.intervalDays,
            repetitionCount: revisionSchedule.repetitionCount,
            easeFactor: revisionSchedule.easeFactor,
            lastReviewedAt: revisionSchedule.lastReviewedAt
          }
        : null
    };
  }

  /**
   * Complete hierarchical view of Topics, Patterns, and their structured problems with user progress.
   */
  static async getPatternHierarchy(userId?: string | null): Promise<any> {
    if (!isLiveDb()) {
      return offlineCatalog.getPatternHierarchy(userId);
    }
    try {
      return await this.getPatternHierarchyFromDb(userId);
    } catch {
      return offlineCatalog.getPatternHierarchy(userId);
    }
  }

  private static async getPatternHierarchyFromDb(userId?: string | null) {
    const topics = await prisma.topic.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        patterns: {
          orderBy: { displayOrder: 'asc' },
          include: {
            problems: {
              orderBy: { sheetNumber: 'asc' },
              include: {
                problem: {
                  include: userId
                    ? {
                        progress: { where: { clerkUserId: userId }, take: 1 },
                        bookmarks: { where: { clerkUserId: userId }, take: 1 },
                        revisionSchedules: { where: { clerkUserId: userId }, take: 1 }
                      }
                    : undefined
                }
              }
            }
          }
        }
      }
    });

    return topics.map((t) => {
      let topicTotalProblems = 0;
      let topicSolved = 0;
      let topicAttempted = 0;
      const difficultyCount = { EASY: 0, MEDIUM: 0, HARD: 0 };

      const patterns = t.patterns.map((p) => {
        let patternSolved = 0;
        let patternAttempted = 0;

        const problems = p.problems.map((pp) => {
          const prob = pp.problem as any;
          const prog = prob.progress && prob.progress.length > 0 ? prob.progress[0] : null;
          const isBookmarked = Boolean(prob.bookmarks && prob.bookmarks.length > 0);
          const hasRevision = Boolean(prob.revisionSchedules && prob.revisionSchedules.length > 0);

          const status = prog?.status || ProgressStatus.NOT_STARTED;
          if (status === ProgressStatus.SOLVED) {
            patternSolved++;
          } else if (status === ProgressStatus.ATTEMPTED || status === ProgressStatus.NEEDS_REVISION) {
            patternAttempted++;
          }

          const diff = prob.difficulty as 'EASY' | 'MEDIUM' | 'HARD';
          if (diff in difficultyCount) {
            difficultyCount[diff]++;
          }

          return {
            id: prob.id,
            sheetNumber: pp.sheetNumber,
            title: prob.title,
            canonicalSlug: prob.canonicalSlug,
            difficulty: prob.difficulty,
            difficultySource: prob.difficultySource,
            platform: prob.platform,
            externalUrl: prob.externalUrl,
            status,
            isBookmarked,
            hasRevision,
            totalAttempts: prog?.totalAttempts || 0
          };
        });

        const totalProblems = problems.length;
        topicTotalProblems += totalProblems;
        topicSolved += patternSolved;
        topicAttempted += patternAttempted;

        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          displayOrder: p.displayOrder,
          totalProblems,
          solvedProblems: patternSolved,
          attemptedProblems: patternAttempted,
          percentComplete: totalProblems > 0 ? Number(((patternSolved / totalProblems) * 100).toFixed(1)) : 0,
          problems
        };
      });

      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        description: t.description,
        displayOrder: t.displayOrder,
        totalProblems: topicTotalProblems,
        solvedProblems: topicSolved,
        attemptedProblems: topicAttempted,
        percentComplete: topicTotalProblems > 0 ? Number(((topicSolved / topicTotalProblems) * 100).toFixed(1)) : 0,
        difficultyDistribution: difficultyCount,
        patterns
      };
    });
  }
}

