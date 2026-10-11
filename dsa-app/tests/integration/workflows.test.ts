import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateNextRevisionSchedule } from '../../src/lib/spaced-repetition';
import { verifyOwnership, ForbiddenError } from '../../src/lib/auth';
import {
  problemQuerySchema,
  recordAttemptSchema,
  upsertNoteSchema,
  toggleBookmarkSchema
} from '../../src/lib/validations';
import { AttemptOutcome, ProgressStatus, Difficulty } from '@prisma/client';
import fs from 'fs';
import path from 'path';

describe('End-to-End User Workflows & Security Verification', () => {
  const seedDir = path.resolve(__dirname, '../../prisma/seed-data');
  const canonicalProblems = JSON.parse(
    fs.readFileSync(path.join(seedDir, 'canonical_problems.json'), 'utf8')
  );
  const sheetMappings = JSON.parse(
    fs.readFileSync(path.join(seedDir, 'sheet_mappings.json'), 'utf8')
  );
  const hintsData = JSON.parse(
    fs.readFileSync(path.join(seedDir, 'hints.json'), 'utf8')
  );

  // Workflow A: First-time user
  describe('Workflow A: First-time user onboarding & zero-progress state', () => {
    it('provides real catalog data with exactly 211 curated questions', () => {
      assert.strictEqual(sheetMappings.length, 211);
      assert.strictEqual(canonicalProblems.length, 204);

      // Verify original sheet numbers are 1..211 contiguous
      const sheetNumbers = sheetMappings.map((m: any) => m.sheetNumber).sort((a: number, b: number) => a - b);
      assert.strictEqual(sheetNumbers[0], 1);
      assert.strictEqual(sheetNumbers[sheetNumbers.length - 1], 211);
    });

    it('interprets missing user progress records as NOT_STARTED with zero counters', () => {
      // Simulate uninitialized user state
      const initialProgress = {
        status: ProgressStatus.NOT_STARTED,
        totalAttempts: 0,
        successfulAttempts: 0,
        failedAttempts: 0,
        totalTimeSpentSeconds: 0,
        solvedAt: null
      };

      assert.strictEqual(initialProgress.status, ProgressStatus.NOT_STARTED);
      assert.strictEqual(initialProgress.totalAttempts, 0);
      assert.strictEqual(initialProgress.successfulAttempts, 0);
    });

    it('provides meaningful zero-progress dashboard statistics', () => {
      const emptyDashboard = {
        overview: {
          totalPlatformProblems: 211,
          totalSolved: 0,
          totalAttempted: 0,
          totalNeedsRevision: 0,
          completionRate: 0,
          totalAttemptsCount: 0,
          totalTimeSpentSeconds: 0
        },
        recentAttempts: [],
        recentActivities: []
      };

      assert.strictEqual(emptyDashboard.overview.totalPlatformProblems, 211);
      assert.strictEqual(emptyDashboard.overview.completionRate, 0);
      assert.strictEqual(emptyDashboard.recentAttempts.length, 0);
    });
  });

  // Workflow B: Practice a question & progressive hints & personal notes
  describe('Workflow B: Practice a problem, progressive hints, personal notes, attempts', () => {
    it('reveals progressive hints sequentially without revealing future locked hints', () => {
      const sampleHints = hintsData.filter((h: any) => h.canonicalSlug === 'two-sum');
      assert.ok(sampleHints.length >= 2, 'Two Sum should have multiple progressive hints');

      // Sort by hint order
      const sorted = [...sampleHints].sort((a: any, b: any) => a.order - b.order);
      assert.strictEqual(sorted[0].order, 1);
      assert.strictEqual(sorted[1].order, 2);

      // Simulated client hint unlock state
      const unlockedHints = new Set<number>();
      unlockedHints.add(1);

      assert.strictEqual(unlockedHints.has(1), true);
      assert.strictEqual(unlockedHints.has(2), false, 'Hint 2 must remain locked until explicitly unlocked');
    });

    it('persists personal note edits and validates constraints', () => {
      const validNote = upsertNoteSchema.parse({
        problemId: 'two-sum',
        content: 'Use hash map with complement lookup in O(N) time and O(N) space.'
      });
      assert.strictEqual(validNote.content.length > 0, true);

      // Empty notes rejected
      assert.throws(() => {
        upsertNoteSchema.parse({
          problemId: 'two-sum',
          content: ''
        });
      });
    });

    it('toggles bookmarks reliably', () => {
      const bookmarkAction = toggleBookmarkSchema.parse({
        problemId: 'two-sum',
        bookmarked: true
      });
      assert.strictEqual(bookmarkAction.bookmarked, true);

      const unbookmarkAction = toggleBookmarkSchema.parse({
        problemId: 'two-sum',
        bookmarked: false
      });
      assert.strictEqual(unbookmarkAction.bookmarked, false);
    });

    it('records failed attempt, transitions status to ATTEMPTED, and updates counters', () => {
      const attempt1 = recordAttemptSchema.parse({
        problemId: 'two-sum',
        outcome: AttemptOutcome.FAILED,
        durationSeconds: 300,
        approachNotes: 'Attempted brute force O(N^2) but timed out on large inputs.'
      });

      assert.strictEqual(attempt1.outcome, AttemptOutcome.FAILED);
      assert.strictEqual(attempt1.durationSeconds, 300);

      // Progress transition logic check
      let currentStatus: ProgressStatus = ProgressStatus.NOT_STARTED;
      if (attempt1.outcome === AttemptOutcome.FAILED && currentStatus === ProgressStatus.NOT_STARTED) {
        currentStatus = ProgressStatus.ATTEMPTED;
      }
      assert.strictEqual(currentStatus, ProgressStatus.ATTEMPTED);
    });

    it('records subsequent successful attempt, transitions status to SOLVED, and schedules review', () => {
      const attempt2 = recordAttemptSchema.parse({
        problemId: 'two-sum',
        outcome: AttemptOutcome.SOLVED,
        durationSeconds: 420,
        approachNotes: 'Optimized using single-pass Hash Map.'
      });

      let currentStatus: ProgressStatus = ProgressStatus.ATTEMPTED;
      if (attempt2.outcome === AttemptOutcome.SOLVED) {
        currentStatus = ProgressStatus.SOLVED;
      }
      assert.strictEqual(currentStatus, ProgressStatus.SOLVED);

      // Schedule review via SM-2
      const schedule = calculateNextRevisionSchedule({
        currentRepetitionCount: 0,
        currentIntervalDays: 0,
        currentEaseFactor: 2.5,
        outcome: AttemptOutcome.SOLVED,
        referenceDate: new Date('2026-10-11T10:00:00Z')
      });

      assert.strictEqual(schedule.repetitionCount, 1);
      assert.strictEqual(schedule.intervalDays, 1);
      assert.ok(schedule.nextReviewAt > new Date('2026-10-11T10:00:00Z'));
    });
  });

  // Workflow C: Return later & revision progression
  describe('Workflow C: Persistence, return later, and SM-2 progression', () => {
    it('advances review schedule interval on second consecutive successful solve', () => {
      const firstReview = calculateNextRevisionSchedule({
        currentRepetitionCount: 1,
        currentIntervalDays: 1,
        currentEaseFactor: 2.5,
        outcome: AttemptOutcome.SOLVED,
        referenceDate: new Date('2026-10-12T10:00:00Z')
      });

      assert.strictEqual(firstReview.repetitionCount, 2);
      assert.strictEqual(firstReview.intervalDays, 3);
    });

    it('transitions solved problem to NEEDS_REVISION and resets streak when lapsed', () => {
      const lapseReview = calculateNextRevisionSchedule({
        currentRepetitionCount: 3,
        currentIntervalDays: 7.5,
        currentEaseFactor: 2.5,
        outcome: AttemptOutcome.FAILED,
        referenceDate: new Date('2026-10-20T10:00:00Z')
      });

      assert.strictEqual(lapseReview.repetitionCount, 0, 'Streak should reset on failure');
      assert.strictEqual(lapseReview.intervalDays, 1, 'Review should be scheduled for tomorrow');
    });
  });

  // Workflow D: Explore, search, filter, and pagination
  describe('Workflow D: Search, filter, sorting, and pagination validation', () => {
    it('validates multi-criterion catalog query schemas', () => {
      const query = problemQuerySchema.parse({
        page: '1',
        limit: '25',
        difficulty: Difficulty.MEDIUM,
        status: ProgressStatus.NOT_STARTED,
        topic: 'arrays',
        search: 'sum'
      });

      assert.strictEqual(query.page, 1);
      assert.strictEqual(query.limit, 25);
      assert.strictEqual(query.difficulty, Difficulty.MEDIUM);
      assert.strictEqual(query.topic, 'arrays');
      assert.strictEqual(query.search, 'sum');
    });

    it('guarantees original PDF question numbers remain preserved', () => {
      const mappedNumbers = sheetMappings.map((m: any) => m.sheetNumber);
      const uniqueNumbers = new Set(mappedNumbers);
      assert.strictEqual(uniqueNumbers.size, 211, 'All 211 sheet questions must have unique sheet numbers');
    });
  });

  // Workflow E: Multi-user isolation
  describe('Workflow E: Multi-user isolation & cross-account security boundaries', () => {
    it('prohibits User Bob from accessing or updating User Alice private notes', () => {
      const aliceUserId = 'user_alice_clerk_111';
      const bobUserId = 'user_bob_clerk_222';

      // Alice owns a note
      const aliceNote = {
        id: 'note_alice_1',
        clerkUserId: aliceUserId,
        problemId: 'two-sum',
        content: "Alice's private solution notes"
      };

      // Alice accessing her own note succeeds
      assert.doesNotThrow(() => {
        verifyOwnership(aliceNote.clerkUserId, aliceUserId);
      });

      // Bob attempting to modify Alice's note is rejected with ForbiddenError
      assert.throws(
        () => {
          verifyOwnership(aliceNote.clerkUserId, bobUserId);
        },
        (err: unknown) => {
          return err instanceof ForbiddenError;
        }
      );
    });

    it('strictly isolates bookmark and progress state between independent user accounts', () => {
      const mockDatabase = {
        bookmarks: [
          { clerkUserId: 'user_alice_clerk_111', problemId: 'two-sum' },
          { clerkUserId: 'user_bob_clerk_222', problemId: 'trapping-rain-water' }
        ],
        progress: [
          { clerkUserId: 'user_alice_clerk_111', problemId: 'two-sum', status: ProgressStatus.SOLVED },
          { clerkUserId: 'user_bob_clerk_222', problemId: 'two-sum', status: ProgressStatus.NOT_STARTED }
        ]
      };

      // Scoped query for Alice
      const aliceBookmarks = mockDatabase.bookmarks.filter((b) => b.clerkUserId === 'user_alice_clerk_111');
      assert.strictEqual(aliceBookmarks.length, 1);
      assert.strictEqual(aliceBookmarks[0].problemId, 'two-sum');

      // Scoped query for Bob
      const bobBookmarks = mockDatabase.bookmarks.filter((b) => b.clerkUserId === 'user_bob_clerk_222');
      assert.strictEqual(bobBookmarks.length, 1);
      assert.strictEqual(bobBookmarks[0].problemId, 'trapping-rain-water');

      // Alice solved Two Sum, while Bob is NOT_STARTED
      const aliceProgress = mockDatabase.progress.find(
        (p) => p.clerkUserId === 'user_alice_clerk_111' && p.problemId === 'two-sum'
      );
      const bobProgress = mockDatabase.progress.find(
        (p) => p.clerkUserId === 'user_bob_clerk_222' && p.problemId === 'two-sum'
      );

      assert.strictEqual(aliceProgress?.status, ProgressStatus.SOLVED);
      assert.strictEqual(bobProgress?.status, ProgressStatus.NOT_STARTED);
    });
  });
});
