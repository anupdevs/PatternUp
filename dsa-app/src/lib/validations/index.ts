import { z } from 'zod';
import { Difficulty, ProgressStatus, AttemptOutcome } from '@prisma/client';

export const problemQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  difficulty: z.nativeEnum(Difficulty).optional(),
  status: z.nativeEnum(ProgressStatus).optional(),
  topic: z.string().trim().optional(),
  pattern: z.string().trim().optional(),
  bookmarked: z.coerce.boolean().optional(),
  search: z.string().trim().optional()
});

export type ProblemQueryInput = z.infer<typeof problemQuerySchema>;

export const recordAttemptSchema = z.object({
  problemId: z.string().min(1, 'Problem ID is required'),
  outcome: z.nativeEnum(AttemptOutcome),
  durationSeconds: z.coerce.number().int().min(0).max(86400).default(0),
  approachNotes: z.string().max(10000).optional().nullable(),
  difficultyExperienced: z.coerce.number().int().min(1).max(5).optional().nullable(),
  personalDifficulty: z.coerce.number().int().min(1).max(5).optional().nullable(),
  confidenceRating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format').optional()
});

export type RecordAttemptInput = z.infer<typeof recordAttemptSchema>;

export const updateStatusSchema = z.object({
  problemId: z.string().min(1, 'Problem ID is required'),
  status: z.nativeEnum(ProgressStatus)
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

export const upsertNoteSchema = z.object({
  problemId: z.string().min(1, 'Problem ID is required'),
  content: z.string().min(1, 'Note content cannot be empty').max(50000, 'Note is too long')
});

export type UpsertNoteInput = z.infer<typeof upsertNoteSchema>;

export const toggleBookmarkSchema = z.object({
  problemId: z.string().min(1, 'Problem ID is required'),
  bookmarked: z.boolean()
});

export type ToggleBookmarkInput = z.infer<typeof toggleBookmarkSchema>;

export const revealHintSchema = z.object({
  problemId: z.string().min(1, 'Problem ID is required'),
  hintId: z.string().min(1, 'Hint ID is required')
});

export type RevealHintInput = z.infer<typeof revealHintSchema>;

export const updatePreferencesSchema = z.object({
  dailyProblemGoal: z.coerce.number().int().min(1).max(50).optional(),
  preferredCodingLanguage: z.string().trim().min(1).max(30).optional(),
  timezone: z.string().trim().min(1).max(50).optional(),
  themePreference: z.enum(['light', 'dark', 'system']).optional()
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
