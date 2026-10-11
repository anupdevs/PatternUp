import { AttemptOutcome } from '@prisma/client';

export interface SpacedRepetitionInput {
  currentRepetitionCount: number;
  currentIntervalDays: number;
  currentEaseFactor: number;
  outcome: AttemptOutcome;
  difficultyExperienced?: number | null; // 1 (very easy) to 5 (very hard)
  referenceDate?: Date;
}

export interface SpacedRepetitionResult {
  nextReviewAt: Date;
  intervalDays: number;
  repetitionCount: number;
  easeFactor: number;
  quality: number;
}

/**
 * SuperMemo SM-2 Spaced Repetition Algorithm adapted for DSA problem solving.
 * 
 * - Repetition 1: 1 day interval (immediate consolidation)
 * - Repetition 2: 3 days interval (short-term retention)
 * - Repetition 3+: interval * easeFactor (long-term recall)
 * - Lapse (FAILED): resets repetitionCount to 0, interval to 1 day, and lowers ease factor.
 * - Minimum ease factor floor: 1.3 to prevent stagnation traps.
 */
export function calculateNextRevisionSchedule(
  input: SpacedRepetitionInput
): SpacedRepetitionResult {
  const {
    currentRepetitionCount,
    currentIntervalDays,
    currentEaseFactor = 2.5,
    outcome,
    difficultyExperienced,
    referenceDate = new Date()
  } = input;

  // 1. Map outcome and user difficulty to quality score (0 - 5)
  let quality: number;

  if (outcome === AttemptOutcome.SOLVED) {
    if (difficultyExperienced) {
      if (difficultyExperienced <= 1) quality = 5;      // Trivial
      else if (difficultyExperienced === 2) quality = 4; // Comfortable
      else if (difficultyExperienced === 3) quality = 4; // Standard
      else if (difficultyExperienced === 4) quality = 3; // Hard
      else quality = 3;                                  // Very hard but solved
    } else {
      quality = 4; // Default satisfactory solve
    }
  } else if (outcome === AttemptOutcome.PARTIALLY_SOLVED) {
    quality = 2; // Incomplete / required help
  } else {
    quality = 1; // Failed completely
  }

  let nextIntervalDays: number;
  let nextRepetitionCount: number;
  let nextEaseFactor: number;

  if (quality >= 3) {
    // Successful recall / solve
    if (currentRepetitionCount <= 0) {
      nextIntervalDays = 1.0;
      nextRepetitionCount = 1;
    } else if (currentRepetitionCount === 1) {
      nextIntervalDays = 3.0;
      nextRepetitionCount = 2;
    } else {
      const baseInterval = currentIntervalDays > 0 ? currentIntervalDays : 3.0;
      nextIntervalDays = Math.max(4.0, Math.round(baseInterval * currentEaseFactor));
      nextRepetitionCount = currentRepetitionCount + 1;
    }

    // Standard SM-2 ease factor delta formula
    const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    nextEaseFactor = Math.max(1.3, Number((currentEaseFactor + delta).toFixed(2)));
  } else {
    // Failure or partial solve - reset interval to next day
    nextIntervalDays = 1.0;
    nextRepetitionCount = 0;
    nextEaseFactor = Math.max(1.3, Number((currentEaseFactor - 0.2).toFixed(2)));
  }

  const nextReviewAt = new Date(
    referenceDate.getTime() + Math.round(nextIntervalDays * 24 * 60 * 60 * 1000)
  );

  return {
    nextReviewAt,
    intervalDays: nextIntervalDays,
    repetitionCount: nextRepetitionCount,
    easeFactor: nextEaseFactor,
    quality
  };
}
