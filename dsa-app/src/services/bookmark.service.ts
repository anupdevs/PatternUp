import { prisma } from '@/lib/prisma';
import { isLiveDb } from '@/lib/db-check';
import { offlineUserStore } from '@/lib/offline-user-store';
import { offlineCatalog } from '@/lib/offline-catalog';

export class BookmarkService {
  /**
   * Toggle or set bookmark state for a problem.
   */
  static async toggleBookmark(userId: string, problemId: string, bookmarked: boolean) {
    if (!isLiveDb()) {
      return offlineUserStore.toggleBookmark(userId, problemId, bookmarked);
    }
    try {
      const problem = await prisma.problem.findFirst({
        where: {
          OR: [{ id: problemId }, { canonicalSlug: problemId }]
        }
      });
      if (!problem) {
        return offlineUserStore.toggleBookmark(userId, problemId, bookmarked);
      }

      if (bookmarked) {
        return await prisma.bookmark.upsert({
          where: {
            clerkUserId_problemId: {
              clerkUserId: userId,
              problemId: problem.id
            }
          },
          create: {
            clerkUserId: userId,
            problemId: problem.id
          },
          update: {}
        });
      } else {
        await prisma.bookmark.deleteMany({
          where: {
            clerkUserId: userId,
            problemId: problem.id
          }
        });
        return { bookmarked: false };
      }
    } catch {
      return offlineUserStore.toggleBookmark(userId, problemId, bookmarked);
    }
  }

  /**
   * Get all bookmarked problems for user.
   */
  static async getUserBookmarks(userId: string) {
    if (!isLiveDb()) {
      return this.getOfflineBookmarks(userId);
    }
    try {
      return await prisma.bookmark.findMany({
        where: { clerkUserId: userId },
        include: {
          problem: {
            include: {
              patterns: {
                include: {
                  pattern: {
                    include: { topic: true }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch {
      return this.getOfflineBookmarks(userId);
    }
  }

  private static getOfflineBookmarks(userId: string) {
    const bookmarks = offlineUserStore.getBookmarks(userId);
    return bookmarks.map((b) => {
      const problem = offlineCatalog.getProblemDetails(b.problemSlug, userId);
      return {
        id: b.id,
        clerkUserId: userId,
        problemId: b.problemSlug,
        createdAt: new Date(b.createdAt),
        problem: problem
          ? {
              id: problem.id,
              canonicalSlug: problem.canonicalSlug,
              title: problem.title,
              difficulty: problem.difficulty,
              platform: problem.platform,
              externalUrl: problem.externalUrl,
              originalPdfQuestionNumber: problem.originalPdfQuestionNumber,
              patterns: problem.patterns.map((pp) => ({
                sheetNumber: pp.sheetNumber,
                pattern: {
                  name: pp.patternName,
                  slug: pp.patternSlug,
                  topic: { name: pp.topicName, slug: pp.topicSlug }
                }
              }))
            }
          : null
      };
    });
  }
}
