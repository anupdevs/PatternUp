import fs from 'fs';
import path from 'path';
import { ProblemQueryInput } from '@/lib/validations';
import { offlineUserStore } from './offline-user-store';
import { getSeedDataPath } from './paths';

interface RawProblem {
  canonicalSlug: string;
  title: string;
  description: string;
  difficulty: string;
  difficultySource?: string;
  platform: string;
  externalUrl: string | null;
  originalPdfQuestionNumber: number;
  sourcePage: string | null;
  displayOrder: number;
  tags: string[];
  examples: any;
  constraints: any;
  contentVerificationStatus: string;
}

interface RawMapping {
  sheetNumber: number;
  canonicalSlug: string;
  topicSlug: string;
  patternSlug: string;
  pdfTitle: string;
  pdfPage: number;
  displayOrder: number;
}

interface RawTopic {
  slug: string;
  name: string;
  description: string;
  displayOrder: number;
}

interface RawPattern {
  topicSlug: string;
  name: string;
  slug: string;
  description: string;
  displayOrder: number;
}

interface RawHint {
  canonicalSlug: string;
  order: number;
  content: string;
  sourceType: string;
  verified: boolean;
}

class OfflineCatalogLoader {
  private problems: RawProblem[] = [];
  private mappings: RawMapping[] = [];
  private topics: RawTopic[] = [];
  private patterns: RawPattern[] = [];
  private hints: RawHint[] = [];
  private initialized = false;

  private loadSeed<T>(filename: string): T[] {
    const p = getSeedDataPath(filename);
    if (!fs.existsSync(p)) return [];
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch {
      return [];
    }
  }

  private init() {
    if (this.initialized) return;
    this.problems = this.loadSeed<RawProblem>('canonical_problems.json');
    this.mappings = this.loadSeed<RawMapping>('sheet_mappings.json');
    this.topics = this.loadSeed<RawTopic>('topics.json');
    this.patterns = this.loadSeed<RawPattern>('patterns.json');
    this.hints = this.loadSeed<RawHint>('hints.json');
    this.initialized = true;
  }

  getTopics() {
    this.init();
    return this.topics.map((t) => {
      const topicPatterns = this.patterns.filter((p) => p.topicSlug === t.slug);
      return {
        id: `topic_${t.slug}`,
        name: t.name,
        slug: t.slug,
        description: t.description,
        displayOrder: t.displayOrder,
        patterns: topicPatterns.map((p) => {
          const problemCount = this.mappings.filter(
            (m) => m.topicSlug === t.slug && m.patternSlug === p.slug
          ).length;
          return {
            id: `pat_${p.slug}`,
            name: p.name,
            slug: p.slug,
            description: p.description,
            displayOrder: p.displayOrder,
            topicId: `topic_${t.slug}`,
            _count: { problems: problemCount }
          };
        })
      };
    });
  }

  getPatterns(topicSlug?: string) {
    this.init();
    const list = topicSlug
      ? this.patterns.filter((p) => p.topicSlug === topicSlug)
      : this.patterns;

    return list.map((p) => {
      const topic = this.topics.find((t) => t.slug === p.topicSlug);
      const problemCount = this.mappings.filter(
        (m) => m.patternSlug === p.slug && (!topicSlug || m.topicSlug === topicSlug)
      ).length;

      return {
        id: `pat_${p.slug}`,
        name: p.name,
        slug: p.slug,
        description: p.description,
        displayOrder: p.displayOrder,
        topic: topic ? { id: `topic_${topic.slug}`, ...topic } : null,
        _count: { problems: problemCount }
      };
    });
  }

  listProblems(params: ProblemQueryInput, userId?: string | null) {
    this.init();
    const { page, limit, difficulty, status, topic, pattern, bookmarked, search } = params;

    const topicMap = new Map(this.topics.map((t) => [t.slug, t.name]));
    const patternMap = new Map(this.patterns.map((p) => [p.slug, p.name]));

    // Build enriched problem list
    let list = this.problems.map((p) => {
      const relMappings = this.mappings.filter((m) => m.canonicalSlug === p.canonicalSlug);
      const patternItems = relMappings.map((m) => ({
        sheetNumber: m.sheetNumber,
        pdfTitle: m.pdfTitle,
        patternName: patternMap.get(m.patternSlug) || m.patternSlug,
        patternSlug: m.patternSlug,
        topicName: topicMap.get(m.topicSlug) || m.topicSlug,
        topicSlug: m.topicSlug
      }));

      const userProg = userId ? offlineUserStore.getProgress(userId, p.canonicalSlug) : null;
      const isBook = userId ? offlineUserStore.isBookmarked(userId, p.canonicalSlug) : false;

      return {
        id: p.canonicalSlug,
        canonicalSlug: p.canonicalSlug,
        title: p.title,
        difficulty: p.difficulty,
        platform: p.platform,
        externalUrl: p.externalUrl,
        originalPdfQuestionNumber: p.originalPdfQuestionNumber,
        sourcePage: p.sourcePage,
        tags: p.tags || [],
        patterns: patternItems,
        userProgress: userProg
          ? {
              status: userProg.status,
              totalAttempts: userProg.totalAttempts,
              successfulAttempts: userProg.successfulAttempts,
              solvedAt: userProg.solvedAt ? new Date(userProg.solvedAt) : null
            }
          : {
              status: 'NOT_STARTED' as const,
              totalAttempts: 0,
              successfulAttempts: 0,
              solvedAt: null
            },
        isBookmarked: Boolean(isBook)
      };
    });

    // Apply filtering
    if (difficulty) {
      list = list.filter((p) => p.difficulty === difficulty);
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => {
        return (
          p.title.toLowerCase().includes(q) ||
          p.canonicalSlug.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
        );
      });
    }

    if (topic) {
      list = list.filter((p) => p.patterns.some((pp) => pp.topicSlug === topic));
    }

    if (pattern) {
      list = list.filter((p) => p.patterns.some((pp) => pp.patternSlug === pattern));
    }

    if (userId) {
      if (status) {
        list = list.filter((p) => p.userProgress.status === status);
      }
      if (bookmarked !== undefined) {
        list = list.filter((p) => (bookmarked ? p.isBookmarked : !p.isBookmarked));
      }
    }

    // Sort by originalPdfQuestionNumber or first sheetNumber
    list.sort((a, b) => {
      const numA = a.patterns[0]?.sheetNumber || a.originalPdfQuestionNumber;
      const numB = b.patterns[0]?.sheetNumber || b.originalPdfQuestionNumber;
      return numA - numB;
    });

    const totalCount = list.length;
    const skip = (page - 1) * limit;
    const paginatedProblems = list.slice(skip, skip + limit);

    return {
      problems: paginatedProblems,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  getProblemDetails(problemIdOrSlug: string, userId?: string | null) {
    this.init();
    const raw = (problemIdOrSlug || '').trim();
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      decoded = raw;
    }
    const lower = decoded.toLowerCase();

    const problem = this.problems.find(
      (p) =>
        p.canonicalSlug === decoded ||
        p.canonicalSlug.toLowerCase() === lower ||
        p.canonicalSlug === raw ||
        String(p.originalPdfQuestionNumber) === decoded
    );
    if (!problem) return null;

    const topicMap = new Map(this.topics.map((t) => [t.slug, t.name]));
    const patternMap = new Map(this.patterns.map((p) => [p.slug, p.name]));
    const relMappings = this.mappings.filter((m) => m.canonicalSlug === problem.canonicalSlug);

    const patterns = relMappings.map((m) => ({
      sheetNumber: m.sheetNumber,
      pdfTitle: m.pdfTitle,
      pdfPage: m.pdfPage,
      patternName: patternMap.get(m.patternSlug) || m.patternSlug,
      patternSlug: m.patternSlug,
      topicName: topicMap.get(m.topicSlug) || m.topicSlug,
      topicSlug: m.topicSlug
    }));

    const rawHints = this.hints.filter((h) => h.canonicalSlug === problem.canonicalSlug);
    const revealedOrderSet = new Set(
      userId ? offlineUserStore.getRevealedHints(userId, problem.canonicalSlug) : []
    );

    const hints = rawHints.map((h) => {
      const isRevealed = revealedOrderSet.has(h.order);
      return {
        id: `hint_${h.canonicalSlug}_${h.order}`,
        order: h.order,
        sourceType: h.sourceType,
        verified: h.verified,
        isRevealed,
        content: isRevealed ? h.content : null
      };
    });

    const userProg = userId ? offlineUserStore.getProgress(userId, problem.canonicalSlug) : null;
    const userNote = userId ? offlineUserStore.getNote(userId, problem.canonicalSlug) : null;
    const isBook = userId ? offlineUserStore.isBookmarked(userId, problem.canonicalSlug) : false;
    const rev = userId ? offlineUserStore.getRevision(userId, problem.canonicalSlug) : null;

    return {
      id: problem.canonicalSlug,
      canonicalSlug: problem.canonicalSlug,
      title: problem.title,
      description: problem.description,
      difficulty: problem.difficulty,
      difficultySource: problem.difficultySource || 'Verified Curriculum',
      platform: problem.platform,
      externalUrl: problem.externalUrl,
      originalPdfQuestionNumber: problem.originalPdfQuestionNumber,
      sourcePage: problem.sourcePage,
      tags: problem.tags || [],
      examples: problem.examples,
      constraints: problem.constraints,
      patterns,
      hints,
      userProgress: userProg
        ? {
            status: userProg.status,
            totalAttempts: userProg.totalAttempts,
            successfulAttempts: userProg.successfulAttempts,
            failedAttempts: userProg.failedAttempts,
            totalTimeSpentSeconds: userProg.totalTimeSpentSeconds,
            firstAttemptAt: userProg.firstAttemptAt ? new Date(userProg.firstAttemptAt) : null,
            lastAttemptAt: userProg.lastAttemptAt ? new Date(userProg.lastAttemptAt) : null,
            solvedAt: userProg.solvedAt ? new Date(userProg.solvedAt) : null,
            personalDifficulty: userProg.personalDifficulty,
            confidenceRating: userProg.confidenceRating
          }
        : {
            status: 'NOT_STARTED' as const,
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
      userNote: userNote
        ? {
            id: userNote.id,
            content: userNote.content,
            updatedAt: new Date(userNote.updatedAt)
          }
        : null,
      isBookmarked: Boolean(isBook),
      revisionSchedule: rev
        ? {
            nextReviewAt: new Date(rev.nextReviewAt),
            intervalDays: rev.intervalDays,
            repetitionCount: rev.repetitionCount,
            easeFactor: rev.easeFactor,
            lastReviewedAt: rev.lastReviewedAt ? new Date(rev.lastReviewedAt) : null
          }
        : null
    };
  }

  getPatternHierarchy(userId?: string | null) {
    this.init();
    const problemMap = new Map(this.problems.map((p) => [p.canonicalSlug, p]));

    return this.topics.map((t) => {
      let topicTotalProblems = 0;
      let topicSolved = 0;
      let topicAttempted = 0;
      const difficultyCount = { EASY: 0, MEDIUM: 0, HARD: 0 };

      const topicPatterns = this.patterns.filter((p) => p.topicSlug === t.slug);

      const patterns = topicPatterns.map((p) => {
        let patternSolved = 0;
        let patternAttempted = 0;

        const relMappings = this.mappings
          .filter((m) => m.topicSlug === t.slug && m.patternSlug === p.slug)
          .sort((a, b) => a.sheetNumber - b.sheetNumber);

        const problems = relMappings.map((m) => {
          const prob = problemMap.get(m.canonicalSlug);
          const userProg = userId
            ? offlineUserStore.getProgress(userId, m.canonicalSlug)
            : null;
          const isBook = userId
            ? offlineUserStore.isBookmarked(userId, m.canonicalSlug)
            : false;
          const rev = userId
            ? offlineUserStore.getRevision(userId, m.canonicalSlug)
            : null;

          const status = userProg?.status || 'NOT_STARTED';
          if (status === 'SOLVED') {
            patternSolved++;
          } else if (status === 'ATTEMPTED' || status === 'NEEDS_REVISION') {
            patternAttempted++;
          }

          const diff = (prob?.difficulty || 'MEDIUM') as 'EASY' | 'MEDIUM' | 'HARD';
          if (diff in difficultyCount) {
            difficultyCount[diff]++;
          }

          return {
            id: prob?.canonicalSlug || m.canonicalSlug,
            sheetNumber: m.sheetNumber,
            title: prob?.title || m.pdfTitle,
            canonicalSlug: m.canonicalSlug,
            difficulty: prob?.difficulty || 'MEDIUM',
            difficultySource: prob?.difficultySource || 'Verified',
            platform: prob?.platform || 'LEETCODE',
            externalUrl: prob?.externalUrl || null,
            status,
            isBookmarked: Boolean(isBook),
            hasRevision: Boolean(rev),
            totalAttempts: userProg?.totalAttempts || 0
          };
        });

        const totalProblems = problems.length;
        topicTotalProblems += totalProblems;
        topicSolved += patternSolved;
        topicAttempted += patternAttempted;

        return {
          id: `pat_${p.slug}`,
          name: p.name,
          slug: p.slug,
          description: p.description,
          displayOrder: p.displayOrder,
          totalProblems,
          solvedProblems: patternSolved,
          attemptedProblems: patternAttempted,
          percentComplete:
            totalProblems > 0
              ? Number(((patternSolved / totalProblems) * 100).toFixed(1))
              : 0,
          problems
        };
      });

      return {
        id: `topic_${t.slug}`,
        name: t.name,
        slug: t.slug,
        description: t.description,
        displayOrder: t.displayOrder,
        totalProblems: topicTotalProblems,
        solvedProblems: topicSolved,
        attemptedProblems: topicAttempted,
        percentComplete:
          topicTotalProblems > 0
            ? Number(((topicSolved / topicTotalProblems) * 100).toFixed(1))
            : 0,
        difficultyDistribution: difficultyCount,
        patterns
      };
    });
  }
}

export const offlineCatalog = new OfflineCatalogLoader();
