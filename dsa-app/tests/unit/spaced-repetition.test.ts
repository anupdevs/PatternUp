import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateNextRevisionSchedule } from '../../src/lib/spaced-repetition';
import { AttemptOutcome } from '@prisma/client';

describe('Spaced Repetition Algorithm (SM-2 for DSA)', () => {
  const baseDate = new Date('2026-01-01T00:00:00.000Z');

  it('schedules initial successful solve for review after 1 day', () => {
    const result = calculateNextRevisionSchedule({
      currentRepetitionCount: 0,
      currentIntervalDays: 0,
      currentEaseFactor: 2.5,
      outcome: AttemptOutcome.SOLVED,
      difficultyExperienced: 2, // easy
      referenceDate: baseDate
    });

    assert.strictEqual(result.intervalDays, 1);
    assert.strictEqual(result.repetitionCount, 1);
    assert.strictEqual(result.quality, 4);
    assert.ok(result.nextReviewAt.getTime() > baseDate.getTime());
    const expectedTime = new Date('2026-01-02T00:00:00.000Z').getTime();
    assert.strictEqual(result.nextReviewAt.getTime(), expectedTime);
  });

  it('schedules second consecutive solve for review after 3 days', () => {
    const result = calculateNextRevisionSchedule({
      currentRepetitionCount: 1,
      currentIntervalDays: 1,
      currentEaseFactor: 2.5,
      outcome: AttemptOutcome.SOLVED,
      difficultyExperienced: 3, // medium
      referenceDate: baseDate
    });

    assert.strictEqual(result.intervalDays, 3);
    assert.strictEqual(result.repetitionCount, 2);
    const expectedTime = new Date('2026-01-04T00:00:00.000Z').getTime();
    assert.strictEqual(result.nextReviewAt.getTime(), expectedTime);
  });

  it('multiplies previous interval by ease factor on third consecutive solve', () => {
    const result = calculateNextRevisionSchedule({
      currentRepetitionCount: 2,
      currentIntervalDays: 3,
      currentEaseFactor: 2.5,
      outcome: AttemptOutcome.SOLVED,
      difficultyExperienced: 1, // very easy (quality 5)
      referenceDate: baseDate
    });

    // 3 * 2.5 = 7.5 -> round to 8
    assert.strictEqual(result.intervalDays, 8);
    assert.strictEqual(result.repetitionCount, 3);
    assert.strictEqual(result.quality, 5);
    // Ease factor should increase for quality 5
    assert.ok(result.easeFactor > 2.5);
  });

  it('resets repetition streak and schedules for tomorrow on failure (lapse)', () => {
    const result = calculateNextRevisionSchedule({
      currentRepetitionCount: 5,
      currentIntervalDays: 24,
      currentEaseFactor: 2.4,
      outcome: AttemptOutcome.FAILED,
      difficultyExperienced: 5,
      referenceDate: baseDate
    });

    assert.strictEqual(result.intervalDays, 1);
    assert.strictEqual(result.repetitionCount, 0);
    assert.strictEqual(result.quality, 1);
    assert.strictEqual(result.easeFactor, 2.2); // 2.4 - 0.2
    const expectedTime = new Date('2026-01-02T00:00:00.000Z').getTime();
    assert.strictEqual(result.nextReviewAt.getTime(), expectedTime);
  });

  it('enforces minimum ease factor floor of 1.3 even after multiple consecutive failures', () => {
    const result = calculateNextRevisionSchedule({
      currentRepetitionCount: 0,
      currentIntervalDays: 1,
      currentEaseFactor: 1.35,
      outcome: AttemptOutcome.FAILED,
      referenceDate: baseDate
    });

    assert.strictEqual(result.easeFactor, 1.3);
  });

  it('handles partially solved outcome with quality 2 and next-day review', () => {
    const result = calculateNextRevisionSchedule({
      currentRepetitionCount: 2,
      currentIntervalDays: 3,
      currentEaseFactor: 2.5,
      outcome: AttemptOutcome.PARTIALLY_SOLVED,
      referenceDate: baseDate
    });

    assert.strictEqual(result.intervalDays, 1);
    assert.strictEqual(result.repetitionCount, 0);
    assert.strictEqual(result.quality, 2);
  });
});
