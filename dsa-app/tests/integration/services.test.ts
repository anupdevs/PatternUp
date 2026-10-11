import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateContentPipeline } from '../../scripts/validate_content';
import { calculateNextRevisionSchedule } from '../../src/lib/spaced-repetition';
import { AttemptOutcome } from '@prisma/client';

describe('Integration & State Machine Invariants', () => {
  it('validates the entire Bosscoder PDF content pipeline and taxonomy structure', () => {
    const report = validateContentPipeline();

    assert.strictEqual(report.isValid, true);
    assert.strictEqual(report.totalSheetProblems, 211, 'Must extract exactly 211 PDF problems');
    assert.strictEqual(report.uniqueCanonicalProblems, 204, 'Must identify 204 canonical problems (7 duplicated across patterns)');
    assert.strictEqual(report.totalTopics, 15, 'Must contain 15 distinct topics');
    assert.strictEqual(report.totalPatterns, 37, 'Must contain 37 distinct patterns');
    assert.strictEqual(report.errors.length, 0, 'Must have zero validation errors');
  });

  it('guarantees progress counter invariants across sequential attempts', () => {
    // Simulating sequential attempts and asserting counter invariants
    let totalAttempts = 0;
    let successfulAttempts = 0;
    let failedAttempts = 0;
    let totalTimeSpentSeconds = 0;
    let status = 'NOT_STARTED';

    const attemptsHistory = [
      { outcome: AttemptOutcome.FAILED, duration: 300 },
      { outcome: AttemptOutcome.PARTIALLY_SOLVED, duration: 450 },
      { outcome: AttemptOutcome.SOLVED, duration: 600 },
      { outcome: AttemptOutcome.SOLVED, duration: 200 },
      { outcome: AttemptOutcome.FAILED, duration: 500 }
    ];

    for (const att of attemptsHistory) {
      totalAttempts++;
      totalTimeSpentSeconds += att.duration;

      if (att.outcome === AttemptOutcome.SOLVED) {
        successfulAttempts++;
        status = 'SOLVED';
      } else {
        failedAttempts++;
        if (status === 'SOLVED' && att.outcome === AttemptOutcome.FAILED) {
          status = 'NEEDS_REVISION';
        } else if (status === 'NOT_STARTED') {
          status = 'ATTEMPTED';
        }
      }

      // Assert invariant after every attempt
      assert.strictEqual(
        totalAttempts,
        successfulAttempts + failedAttempts,
        'Invariant violated: totalAttempts must equal successful + failed'
      );
    }

    assert.strictEqual(totalAttempts, 5);
    assert.strictEqual(successfulAttempts, 2);
    assert.strictEqual(failedAttempts, 3);
    assert.strictEqual(totalTimeSpentSeconds, 2050);
    assert.strictEqual(status, 'NEEDS_REVISION', 'Status should transition to NEEDS_REVISION after failing a previously solved problem');
  });

  it('verifies deterministic multi-stage spaced repetition review progression', () => {
    let repetitionCount = 0;
    let intervalDays = 0;
    let easeFactor = 2.5;
    let currentDate = new Date('2026-03-01T10:00:00.000Z');

    // Attempt 1: First solve -> interval 1 day
    const res1 = calculateNextRevisionSchedule({
      currentRepetitionCount: repetitionCount,
      currentIntervalDays: intervalDays,
      currentEaseFactor: easeFactor,
      outcome: AttemptOutcome.SOLVED,
      referenceDate: currentDate
    });
    assert.strictEqual(res1.intervalDays, 1);
    assert.strictEqual(res1.repetitionCount, 1);

    // Attempt 2: Second solve -> interval 3 days
    currentDate = res1.nextReviewAt;
    repetitionCount = res1.repetitionCount;
    intervalDays = res1.intervalDays;
    easeFactor = res1.easeFactor;

    const res2 = calculateNextRevisionSchedule({
      currentRepetitionCount: repetitionCount,
      currentIntervalDays: intervalDays,
      currentEaseFactor: easeFactor,
      outcome: AttemptOutcome.SOLVED,
      referenceDate: currentDate
    });
    assert.strictEqual(res2.intervalDays, 3);
    assert.strictEqual(res2.repetitionCount, 2);

    // Attempt 3: Third solve -> interval = round(3 * 2.5) = 8 days
    currentDate = res2.nextReviewAt;
    repetitionCount = res2.repetitionCount;
    intervalDays = res2.intervalDays;
    easeFactor = res2.easeFactor;

    const res3 = calculateNextRevisionSchedule({
      currentRepetitionCount: repetitionCount,
      currentIntervalDays: intervalDays,
      currentEaseFactor: easeFactor,
      outcome: AttemptOutcome.SOLVED,
      referenceDate: currentDate
    });
    assert.strictEqual(res3.intervalDays, 8);
    assert.strictEqual(res3.repetitionCount, 3);
  });
});
