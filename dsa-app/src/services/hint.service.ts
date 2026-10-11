import { prisma } from '@/lib/prisma';
import { isLiveDb } from '@/lib/db-check';
import { offlineUserStore } from '@/lib/offline-user-store';
import { offlineCatalog } from '@/lib/offline-catalog';

export class HintService {
  /**
   * Atomically records that a user has revealed a hint, and returns the hint content.
   */
  static async revealHint(userId: string, problemId: string, hintId: string) {
    if (!isLiveDb()) {
      return this.revealOfflineHint(userId, problemId, hintId);
    }
    try {
      const hint = await prisma.problemHint.findUnique({
        where: { id: hintId },
        include: { problem: true }
      });

      if (!hint || (hint.problemId !== problemId && hint.problem.canonicalSlug !== problemId)) {
        return this.revealOfflineHint(userId, problemId, hintId);
      }

      const reveal = await prisma.hintReveal.upsert({
        where: {
          clerkUserId_hintId: {
            clerkUserId: userId,
            hintId
          }
        },
        create: {
          clerkUserId: userId,
          problemId: hint.problemId,
          hintId
        },
        update: {}
      });

      return {
        revealId: reveal.id,
        hintId: hint.id,
        order: hint.order,
        content: hint.content,
        sourceType: hint.sourceType,
        verified: hint.verified,
        revealedAt: reveal.revealedAt
      };
    } catch {
      return this.revealOfflineHint(userId, problemId, hintId);
    }
  }

  private static revealOfflineHint(userId: string, problemId: string, hintId: string) {
    // In offline mode, hintId may be e.g. "hint_two-sum_1"
    const orderMatch = hintId.match(/(\d+)$/);
    const order = orderMatch ? parseInt(orderMatch[1], 10) : 1;

    const details = offlineCatalog.getProblemDetails(problemId, userId);
    const hint = details?.hints?.find((h) => h.id === hintId || h.order === order);
    const reveal = offlineUserStore.revealHint(userId, problemId, order);

    return {
      revealId: reveal.id,
      hintId,
      order,
      content: hint?.content || 'Editorial technique guidance.',
      sourceType: hint?.sourceType || 'INFERRED_EDITORIAL',
      verified: true,
      revealedAt: new Date(reveal.revealedAt)
    };
  }
}
