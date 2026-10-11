import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  recordAttemptSchema,
  problemQuerySchema,
  upsertNoteSchema,
  toggleBookmarkSchema,
  updatePreferencesSchema
} from '../../src/lib/validations';
import { AttemptOutcome, Difficulty, ProgressStatus } from '@prisma/client';

describe('Validation Schemas (Zod)', () => {
  describe('recordAttemptSchema', () => {
    it('accepts valid attempt input', () => {
      const valid = {
        problemId: 'cm1234567890',
        outcome: AttemptOutcome.SOLVED,
        durationSeconds: 900,
        approachNotes: 'Used two pointers approach.',
        difficultyExperienced: 3,
        confidenceRating: 4,
        date: '2026-10-11'
      };

      const parsed = recordAttemptSchema.parse(valid);
      assert.strictEqual(parsed.problemId, 'cm1234567890');
      assert.strictEqual(parsed.outcome, AttemptOutcome.SOLVED);
      assert.strictEqual(parsed.durationSeconds, 900);
    });

    it('rejects missing problemId', () => {
      assert.throws(() => {
        recordAttemptSchema.parse({
          outcome: AttemptOutcome.SOLVED,
          durationSeconds: 120
        });
      });
    });

    it('rejects invalid outcome enum value', () => {
      assert.throws(() => {
        recordAttemptSchema.parse({
          problemId: 'cm123',
          outcome: 'NOT_VALID_OUTCOME'
        });
      });
    });

    it('rejects negative duration', () => {
      assert.throws(() => {
        recordAttemptSchema.parse({
          problemId: 'cm123',
          outcome: AttemptOutcome.FAILED,
          durationSeconds: -50
        });
      });
    });

    it('rejects invalid date format', () => {
      assert.throws(() => {
        recordAttemptSchema.parse({
          problemId: 'cm123',
          outcome: AttemptOutcome.SOLVED,
          date: '11/10/2026'
        });
      });
    });
  });

  describe('problemQuerySchema', () => {
    it('applies default pagination values', () => {
      const parsed = problemQuerySchema.parse({});
      assert.strictEqual(parsed.page, 1);
      assert.strictEqual(parsed.limit, 20);
    });

    it('parses enum difficulty and status filters', () => {
      const parsed = problemQuerySchema.parse({
        difficulty: Difficulty.MEDIUM,
        status: ProgressStatus.SOLVED,
        page: '2',
        limit: '50'
      });
      assert.strictEqual(parsed.difficulty, Difficulty.MEDIUM);
      assert.strictEqual(parsed.status, ProgressStatus.SOLVED);
      assert.strictEqual(parsed.page, 2);
      assert.strictEqual(parsed.limit, 50);
    });
  });

  describe('upsertNoteSchema', () => {
    it('accepts valid note content', () => {
      const parsed = upsertNoteSchema.parse({
        problemId: 'prob-1',
        content: 'Key insight: use a monotonic stack.'
      });
      assert.strictEqual(parsed.content, 'Key insight: use a monotonic stack.');
    });

    it('rejects empty content', () => {
      assert.throws(() => {
        upsertNoteSchema.parse({
          problemId: 'prob-1',
          content: ''
        });
      });
    });
  });

  describe('toggleBookmarkSchema', () => {
    it('validates bookmark payload', () => {
      const parsed = toggleBookmarkSchema.parse({
        problemId: 'prob-1',
        bookmarked: true
      });
      assert.strictEqual(parsed.bookmarked, true);
    });
  });

  describe('updatePreferencesSchema', () => {
    it('validates preference updates within range', () => {
      const parsed = updatePreferencesSchema.parse({
        dailyProblemGoal: 5,
        preferredCodingLanguage: 'python',
        themePreference: 'dark'
      });
      assert.strictEqual(parsed.dailyProblemGoal, 5);
      assert.strictEqual(parsed.preferredCodingLanguage, 'python');
      assert.strictEqual(parsed.themePreference, 'dark');
    });

    it('rejects out-of-range dailyProblemGoal', () => {
      assert.throws(() => {
        updatePreferencesSchema.parse({
          dailyProblemGoal: 100 // max is 50
        });
      });
    });
  });
});
