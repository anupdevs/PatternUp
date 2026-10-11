import { prisma } from '@/lib/prisma';
import { CollectionService } from '@/services/collection.service';

export class ExportService {
  /**
   * Generates a sanitized JSON export of all personal study data for the authenticated user.
   * Guaranteed to isolate and include ONLY the authenticated user's records.
   */
  static async exportUserDataAsJson(userId: string) {
    let progress: any[] = [];
    let attempts: any[] = [];
    let notes: any[] = [];
    let bookmarks: any[] = [];
    let revisions: any[] = [];
    let preferences: any = null;

    const isLiveDb =
      process.env.DATABASE_URL &&
      !process.env.DATABASE_URL.includes('placeholder') &&
      !process.env.DATABASE_URL.includes('dummy');

    if (isLiveDb) {
      try {
        [progress, attempts, notes, bookmarks, revisions, preferences] =
          await Promise.all([
            prisma.userProblemProgress.findMany({
              where: { clerkUserId: userId },
              include: {
                problem: {
                  select: {
                    canonicalSlug: true,
                    title: true,
                    difficulty: true,
                    originalPdfQuestionNumber: true
                  }
                }
              }
            }),
            prisma.practiceAttempt.findMany({
              where: { clerkUserId: userId },
              orderBy: { attemptedAt: 'desc' },
              include: {
                problem: {
                  select: {
                    canonicalSlug: true,
                    title: true,
                    difficulty: true
                  }
                }
              }
            }),
            prisma.problemNote.findMany({
              where: { clerkUserId: userId },
              include: {
                problem: {
                  select: {
                    canonicalSlug: true,
                    title: true
                  }
                }
              }
            }),
            prisma.bookmark.findMany({
              where: { clerkUserId: userId },
              include: {
                problem: {
                  select: {
                    canonicalSlug: true,
                    title: true,
                    difficulty: true
                  }
                }
              }
            }),
            prisma.revisionSchedule.findMany({
              where: { clerkUserId: userId },
              include: {
                problem: {
                  select: {
                    canonicalSlug: true,
                    title: true
                  }
                }
              }
            }),
            prisma.userPreferences.findUnique({
              where: { clerkUserId: userId }
            })
          ]);
      } catch {
        // Fallback when live DB query encounters errors
      }
    }

    const collections = await CollectionService.getUserCollections(userId);

    return {
      exportedAt: new Date().toISOString(),
      platform: 'DSA Sheet Platform (Bosscoder 211 Edition)',
      schemaVersion: '1.0',
      userSummary: {
        totalProgressRecords: progress.length,
        totalSolved: progress.filter((p) => p.status === 'SOLVED').length,
        totalAttempts: attempts.length,
        totalNotes: notes.length,
        totalBookmarks: bookmarks.length,
        totalScheduledRevisions: revisions.length,
        totalCollections: collections.length
      },
      preferences: preferences
        ? {
            dailyProblemGoal: preferences.dailyProblemGoal,
            preferredCodingLanguage: preferences.preferredCodingLanguage,
            timezone: preferences.timezone,
            themePreference: preferences.themePreference
          }
        : null,
      progress: progress.map((p) => ({
        problemNumber: p.problem?.originalPdfQuestionNumber,
        title: p.problem?.title,
        slug: p.problem?.canonicalSlug,
        difficulty: p.problem?.difficulty,
        status: p.status,
        totalAttempts: p.totalAttempts,
        successfulAttempts: p.successfulAttempts,
        failedAttempts: p.failedAttempts,
        totalTimeSpentSeconds: p.totalTimeSpentSeconds,
        firstAttemptAt: p.firstAttemptAt,
        lastAttemptAt: p.lastAttemptAt,
        solvedAt: p.solvedAt
      })),
      attempts: attempts.map((a) => ({
        problemTitle: a.problem?.title,
        problemSlug: a.problem?.canonicalSlug,
        difficulty: a.problem?.difficulty,
        outcome: a.outcome,
        durationSeconds: a.durationSeconds,
        approachNotes: a.approachNotes,
        attemptedAt: a.attemptedAt
      })),
      notes: notes.map((n) => ({
        problemTitle: n.problem?.title,
        problemSlug: n.problem?.canonicalSlug,
        content: n.content,
        updatedAt: n.updatedAt
      })),
      bookmarks: bookmarks.map((b) => ({
        problemTitle: b.problem?.title,
        problemSlug: b.problem?.canonicalSlug,
        difficulty: b.problem?.difficulty,
        bookmarkedAt: b.createdAt
      })),
      revisionSchedules: revisions.map((r) => ({
        problemTitle: r.problem?.title,
        problemSlug: r.problem?.canonicalSlug,
        nextReviewAt: r.nextReviewAt,
        intervalDays: r.intervalDays,
        repetitionCount: r.repetitionCount,
        easeFactor: r.easeFactor,
        lastReviewedAt: r.lastReviewedAt
      })),
      collections: collections.map((c) => ({
        name: c.name,
        description: c.description,
        problemSlugs: c.problemIds
      }))
    };
  }

  /**
   * Generates a CSV export of user solved progress and attempt records.
   */
  static async exportUserDataAsCsv(userId: string): Promise<string> {
    const data = await this.exportUserDataAsJson(userId);

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    let csv = '# DSA Platform - Personal Study Export\n';
    csv += `# Exported At: ${data.exportedAt}\n\n`;

    csv += 'SECTION: PROBLEMS PROGRESS\n';
    csv += 'Number,Title,Difficulty,Status,Total Attempts,Successful,Failed,Time Spent (s),Solved At\n';
    data.progress.forEach((p) => {
      csv += `${p.problemNumber},${escapeCsv(p.title)},${p.difficulty},${p.status},${p.totalAttempts},${p.successfulAttempts},${p.failedAttempts},${p.totalTimeSpentSeconds},${escapeCsv(p.solvedAt)}\n`;
    });

    csv += '\nSECTION: ATTEMPT HISTORY\n';
    csv += 'Date,Problem Title,Difficulty,Outcome,Duration (s),Approach Notes\n';
    data.attempts.forEach((a) => {
      csv += `${escapeCsv(a.attemptedAt)},${escapeCsv(a.problemTitle)},${a.difficulty},${a.outcome},${a.durationSeconds},${escapeCsv(a.approachNotes)}\n`;
    });

    csv += '\nSECTION: PERSONAL NOTES\n';
    csv += 'Problem Title,Updated At,Note Content\n';
    data.notes.forEach((n) => {
      csv += `${escapeCsv(n.problemTitle)},${escapeCsv(n.updatedAt)},${escapeCsv(n.content)}\n`;
    });

    return csv;
  }
}
