import fs from 'fs';
import path from 'path';
import { getDataDirPath } from './paths';

function ensureFile<T>(filename: string, defaultData: T): T {
  const dataDir = getDataDirPath();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const filePath = path.join(dataDir, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf8');
    return defaultData;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return defaultData;
  }
}

function writeFile<T>(filename: string, data: T): void {
  const dataDir = getDataDirPath();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const filePath = path.join(dataDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

export interface UserPreferencesRecord {
  id: string;
  clerkUserId: string;
  dailyProblemGoal: number;
  preferredCodingLanguage: string;
  timezone: string;
  themePreference: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserBookmarkRecord {
  id: string;
  clerkUserId: string;
  problemSlug: string;
  createdAt: string;
}

export interface UserProgressRecord {
  id: string;
  clerkUserId: string;
  problemSlug: string;
  status: 'NOT_STARTED' | 'ATTEMPTED' | 'SOLVED' | 'NEEDS_REVISION';
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  totalTimeSpentSeconds: number;
  firstAttemptAt: string | null;
  lastAttemptAt: string | null;
  solvedAt: string | null;
  personalDifficulty: string | null;
  confidenceRating: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserAttemptRecord {
  id: string;
  clerkUserId: string;
  problemSlug: string;
  outcome: 'SOLVED' | 'FAILED' | 'PARTIALLY_SOLVED';
  durationSeconds: number;
  language?: string | null;
  codeSnippet?: string | null;
  notes?: string | null;
  selfRating?: number | null;
  attemptedAt: string;
}

export interface UserNoteRecord {
  id: string;
  clerkUserId: string;
  problemSlug: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserRevisionRecord {
  id: string;
  clerkUserId: string;
  problemSlug: string;
  nextReviewAt: string;
  intervalDays: number;
  repetitionCount: number;
  easeFactor: number;
  lastReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HintRevealRecord {
  id: string;
  clerkUserId: string;
  problemSlug: string;
  hintOrder: number;
  revealedAt: string;
}

export const offlineUserStore = {
  // Preferences
  getPreferences(userId: string): UserPreferencesRecord {
    const list = ensureFile<UserPreferencesRecord[]>('user_preferences.json', []);
    let found = list.find((p) => p.clerkUserId === userId);
    if (!found) {
      found = {
        id: `pref_${Date.now()}`,
        clerkUserId: userId,
        dailyProblemGoal: 3,
        preferredCodingLanguage: 'python',
        timezone: 'UTC',
        themePreference: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      list.push(found);
      writeFile('user_preferences.json', list);
    }
    return found;
  },

  updatePreferences(userId: string, updates: Partial<UserPreferencesRecord>): UserPreferencesRecord {
    const list = ensureFile<UserPreferencesRecord[]>('user_preferences.json', []);
    let found = list.find((p) => p.clerkUserId === userId);
    const now = new Date().toISOString();
    if (!found) {
      found = {
        id: `pref_${Date.now()}`,
        clerkUserId: userId,
        dailyProblemGoal: updates.dailyProblemGoal ?? 3,
        preferredCodingLanguage: updates.preferredCodingLanguage ?? 'python',
        timezone: updates.timezone ?? 'UTC',
        themePreference: updates.themePreference ?? 'system',
        createdAt: now,
        updatedAt: now
      };
      list.push(found);
    } else {
      Object.assign(found, updates, { updatedAt: now });
    }
    writeFile('user_preferences.json', list);
    return found;
  },

  // Bookmarks
  getBookmarks(userId: string): UserBookmarkRecord[] {
    const list = ensureFile<UserBookmarkRecord[]>('user_bookmarks.json', []);
    return list.filter((b) => b.clerkUserId === userId);
  },

  isBookmarked(userId: string, problemSlug: string): boolean {
    const list = ensureFile<UserBookmarkRecord[]>('user_bookmarks.json', []);
    return list.some((b) => b.clerkUserId === userId && b.problemSlug === problemSlug);
  },

  toggleBookmark(userId: string, problemSlug: string, bookmarked: boolean) {
    let list = ensureFile<UserBookmarkRecord[]>('user_bookmarks.json', []);
    if (bookmarked) {
      if (!list.some((b) => b.clerkUserId === userId && b.problemSlug === problemSlug)) {
        list.push({
          id: `bm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          clerkUserId: userId,
          problemSlug,
          createdAt: new Date().toISOString()
        });
      }
    } else {
      list = list.filter((b) => !(b.clerkUserId === userId && b.problemSlug === problemSlug));
    }
    writeFile('user_bookmarks.json', list);
    return { bookmarked };
  },

  // Progress
  getProgressList(userId: string): UserProgressRecord[] {
    const list = ensureFile<UserProgressRecord[]>('user_progress.json', []);
    return list.filter((p) => p.clerkUserId === userId);
  },

  getProgress(userId: string, problemSlug: string): UserProgressRecord | null {
    const list = ensureFile<UserProgressRecord[]>('user_progress.json', []);
    return list.find((p) => p.clerkUserId === userId && p.problemSlug === problemSlug) || null;
  },

  updateProgress(
    userId: string,
    problemSlug: string,
    updateFn: (current: UserProgressRecord | null) => Partial<UserProgressRecord>
  ): UserProgressRecord {
    const list = ensureFile<UserProgressRecord[]>('user_progress.json', []);
    const now = new Date().toISOString();
    let current = list.find((p) => p.clerkUserId === userId && p.problemSlug === problemSlug) || null;
    const partial = updateFn(current);

    if (!current) {
      current = {
        id: `prog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        clerkUserId: userId,
        problemSlug,
        status: partial.status || 'ATTEMPTED',
        totalAttempts: partial.totalAttempts ?? 1,
        successfulAttempts: partial.successfulAttempts ?? 0,
        failedAttempts: partial.failedAttempts ?? 0,
        totalTimeSpentSeconds: partial.totalTimeSpentSeconds ?? 0,
        firstAttemptAt: partial.firstAttemptAt ?? now,
        lastAttemptAt: partial.lastAttemptAt ?? now,
        solvedAt: partial.solvedAt ?? null,
        personalDifficulty: partial.personalDifficulty ?? null,
        confidenceRating: partial.confidenceRating ?? null,
        createdAt: now,
        updatedAt: now
      };
      list.push(current);
    } else {
      Object.assign(current, partial, { updatedAt: now });
    }
    writeFile('user_progress.json', list);
    return current;
  },

  // Attempts
  getAttempts(userId: string, problemSlug?: string): UserAttemptRecord[] {
    const list = ensureFile<UserAttemptRecord[]>('practice_attempts.json', []);
    return list
      .filter((a) => a.clerkUserId === userId && (!problemSlug || a.problemSlug === problemSlug))
      .sort((a, b) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime());
  },

  recordAttempt(attempt: Omit<UserAttemptRecord, 'id'>): UserAttemptRecord {
    const list = ensureFile<UserAttemptRecord[]>('practice_attempts.json', []);
    const record: UserAttemptRecord = {
      ...attempt,
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    };
    list.unshift(record);
    writeFile('practice_attempts.json', list);
    return record;
  },

  // Notes
  getNote(userId: string, problemSlug: string): UserNoteRecord | null {
    const list = ensureFile<UserNoteRecord[]>('user_notes.json', []);
    return list.find((n) => n.clerkUserId === userId && n.problemSlug === problemSlug) || null;
  },

  saveNote(userId: string, problemSlug: string, content: string): UserNoteRecord {
    const list = ensureFile<UserNoteRecord[]>('user_notes.json', []);
    const now = new Date().toISOString();
    let found = list.find((n) => n.clerkUserId === userId && n.problemSlug === problemSlug);
    if (!found) {
      found = {
        id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        clerkUserId: userId,
        problemSlug,
        content,
        createdAt: now,
        updatedAt: now
      };
      list.push(found);
    } else {
      found.content = content;
      found.updatedAt = now;
    }
    writeFile('user_notes.json', list);
    return found;
  },

  deleteNote(userId: string, problemSlug: string): void {
    let list = ensureFile<UserNoteRecord[]>('user_notes.json', []);
    list = list.filter((n) => !(n.clerkUserId === userId && n.problemSlug === problemSlug));
    writeFile('user_notes.json', list);
  },

  // Revisions
  getRevisions(userId: string): UserRevisionRecord[] {
    const list = ensureFile<UserRevisionRecord[]>('user_revisions.json', []);
    return list.filter((r) => r.clerkUserId === userId);
  },

  getRevision(userId: string, problemSlug: string): UserRevisionRecord | null {
    const list = ensureFile<UserRevisionRecord[]>('user_revisions.json', []);
    return list.find((r) => r.clerkUserId === userId && r.problemSlug === problemSlug) || null;
  },

  upsertRevision(
    userId: string,
    problemSlug: string,
    data: Partial<UserRevisionRecord>
  ): UserRevisionRecord {
    const list = ensureFile<UserRevisionRecord[]>('user_revisions.json', []);
    const now = new Date().toISOString();
    let found = list.find((r) => r.clerkUserId === userId && r.problemSlug === problemSlug);
    if (!found) {
      found = {
        id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        clerkUserId: userId,
        problemSlug,
        nextReviewAt: data.nextReviewAt || now,
        intervalDays: data.intervalDays ?? 1,
        repetitionCount: data.repetitionCount ?? 0,
        easeFactor: data.easeFactor ?? 2.5,
        lastReviewedAt: data.lastReviewedAt || null,
        createdAt: now,
        updatedAt: now
      };
      list.push(found);
    } else {
      Object.assign(found, data, { updatedAt: now });
    }
    writeFile('user_revisions.json', list);
    return found;
  },

  // Hints
  getRevealedHints(userId: string, problemSlug: string): number[] {
    const list = ensureFile<HintRevealRecord[]>('hint_reveals.json', []);
    return list
      .filter((h) => h.clerkUserId === userId && h.problemSlug === problemSlug)
      .map((h) => h.hintOrder);
  },

  revealHint(userId: string, problemSlug: string, hintOrder: number): HintRevealRecord {
    const list = ensureFile<HintRevealRecord[]>('hint_reveals.json', []);
    let found = list.find(
      (h) => h.clerkUserId === userId && h.problemSlug === problemSlug && h.hintOrder === hintOrder
    );
    if (!found) {
      found = {
        id: `hr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        clerkUserId: userId,
        problemSlug,
        hintOrder,
        revealedAt: new Date().toISOString()
      };
      list.push(found);
      writeFile('hint_reveals.json', list);
    }
    return found;
  }
};
