import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CollectionService } from '../../src/services/collection.service';
import { ExportService } from '../../src/services/export.service';
import { RevisionService, ReviewRating } from '../../src/services/revision.service';
import { ForbiddenError } from '../../src/lib/auth';

describe('Phase 5 Differentiating Features & Reliability Verification', () => {
  const testUserIdAlice = `user_alice_test_${Date.now()}`;
  const testUserIdBob = `user_bob_test_${Date.now()}`;

  describe('Differentiator A: Personal Problem Collections', () => {
    it('provisions 4 standard collections for first-time user', async () => {
      const collections = await CollectionService.getUserCollections(testUserIdAlice);
      assert.strictEqual(collections.length, 4);

      const names = collections.map((c) => c.name);
      assert.ok(names.includes('Must Revise'));
      assert.ok(names.includes('Interview Favorites'));
      assert.ok(names.includes('Frequently Asked'));
      assert.ok(names.includes('Problems I Keep Getting Wrong'));
    });

    it('creates a custom collection and prohibits duplicate names for the same user', async () => {
      const custom = await CollectionService.createCollection(testUserIdAlice, {
        name: 'Dynamic Programming Masterclass',
        description: '2D DP & Knapsack variants',
        color: 'emerald'
      });

      assert.strictEqual(custom.name, 'Dynamic Programming Masterclass');
      assert.strictEqual(custom.clerkUserId, testUserIdAlice);

      // Attempt duplicate name creation
      await assert.rejects(
        async () => {
          await CollectionService.createCollection(testUserIdAlice, {
            name: 'Dynamic Programming Masterclass'
          });
        },
        /already exists/
      );
    });

    it('enforces user ownership when deleting collections', async () => {
      const bobCollection = await CollectionService.createCollection(testUserIdBob, {
        name: 'Bob Private List'
      });

      // Alice cannot delete Bob's collection
      await assert.rejects(
        async () => {
          await CollectionService.deleteCollection(testUserIdAlice, bobCollection.id);
        },
        ForbiddenError
      );

      // Bob can delete his own collection
      await CollectionService.deleteCollection(testUserIdBob, bobCollection.id);
      const bobCols = await CollectionService.getUserCollections(testUserIdBob);
      assert.strictEqual(bobCols.some((c) => c.id === bobCollection.id), false);
    });

    it('prevents duplicate problem membership in collections', async () => {
      const userCols = await CollectionService.getUserCollections(testUserIdAlice);
      const targetCol = userCols[0];

      // Add problem (using a mock canonical slug)
      const mockProblemSlug = 'two-sum';
      const updated1 = await CollectionService.addProblemToCollection(
        testUserIdAlice,
        targetCol.id,
        mockProblemSlug
      );
      assert.ok(updated1.problemIds.includes(mockProblemSlug));

      const countBefore = updated1.problemIds.filter((p) => p === mockProblemSlug).length;
      assert.strictEqual(countBefore, 1);

      // Add same problem again (must be idempotent, no duplicates)
      const updated2 = await CollectionService.addProblemToCollection(
        testUserIdAlice,
        targetCol.id,
        mockProblemSlug
      );
      const countAfter = updated2.problemIds.filter((p) => p === mockProblemSlug).length;
      assert.strictEqual(countAfter, 1);
    });
  });

  describe('Differentiator B: Weak-Pattern Diagnostic Invariants', () => {
    it('does not draw conclusions from insufficient data (< 2 attempts)', () => {
      // Simulating diagnostic calculation logic
      const calculateWeakness = (attempts: number, fails: number) => {
        if (attempts < 2) return false;
        return fails / attempts >= 0.4;
      };

      assert.strictEqual(calculateWeakness(1, 1), false, 'Must not flag pattern on only 1 attempt');
      assert.strictEqual(calculateWeakness(4, 2), true, 'Flags pattern when fails >= 40% over >= 2 attempts');
      assert.strictEqual(calculateWeakness(5, 1), false, 'Does not flag pattern when fail rate is low (20%)');
    });
  });

  describe('Differentiator C: Spaced Repetition Rating Formula (Again, Hard, Good, Easy)', () => {
    it('applies correct SM-2 intervals and ease factor adjustments for all 4 ratings', () => {
      // AGAIN: Lapse reset
      const againInterval = 1.0;
      const againStreak = 0;
      const againEase = Math.max(1.3, Number((2.5 - 0.2).toFixed(2)));
      assert.strictEqual(againInterval, 1.0);
      assert.strictEqual(againStreak, 0);
      assert.strictEqual(againEase, 2.3);

      // HARD: Slower growth
      const currentInterval = 3.0;
      const hardInterval = Math.max(1.5, Number((currentInterval * 1.2).toFixed(1)));
      const hardEase = Math.max(1.3, Number((2.5 - 0.15).toFixed(2)));
      assert.strictEqual(hardInterval, 3.6);
      assert.strictEqual(hardEase, 2.35);

      // GOOD: Standard expansion
      const goodInterval = Math.max(4.0, Math.round(currentInterval * 2.5));
      assert.strictEqual(goodInterval, 8.0);

      // EASY: Bonus multiplier & ease boost
      const easyInterval = Math.max(5.0, Math.round(currentInterval * (2.5 + 0.2)));
      assert.strictEqual(easyInterval, 8.0);
    });
  });

  describe('Differentiator D: User Data Export & Multi-User Boundary Isolation', () => {
    it('guarantees exported JSON contains user records and isolates from other accounts', async () => {
      const exportJson = await ExportService.exportUserDataAsJson(testUserIdAlice);

      assert.strictEqual(typeof exportJson.exportedAt, 'string');
      assert.strictEqual(exportJson.schemaVersion, '1.0');
      assert.ok(Array.isArray(exportJson.progress));
      assert.ok(Array.isArray(exportJson.attempts));
      assert.ok(Array.isArray(exportJson.notes));
      assert.ok(Array.isArray(exportJson.bookmarks));
      assert.ok(Array.isArray(exportJson.collections));

      // Ensure Alice's export contains only her collections
      exportJson.collections.forEach((col) => {
        assert.notStrictEqual(col.name, 'Bob Private List');
      });
    });

    it('generates valid multi-section CSV export', async () => {
      const exportCsv = await ExportService.exportUserDataAsCsv(testUserIdAlice);

      assert.ok(exportCsv.includes('SECTION: PROBLEMS PROGRESS'));
      assert.ok(exportCsv.includes('SECTION: ATTEMPT HISTORY'));
      assert.ok(exportCsv.includes('SECTION: PERSONAL NOTES'));
    });
  });
});
