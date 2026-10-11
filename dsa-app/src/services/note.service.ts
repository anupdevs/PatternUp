import { prisma } from '@/lib/prisma';
import { verifyOwnership } from '@/lib/auth';
import { isLiveDb } from '@/lib/db-check';
import { offlineUserStore } from '@/lib/offline-user-store';

export class NoteService {
  /**
   * Fetch primary note for a problem by authenticated user.
   */
  static async getNote(userId: string, problemId: string) {
    if (!isLiveDb()) {
      const note = offlineUserStore.getNote(userId, problemId);
      return note ? { id: note.id, content: note.content, clerkUserId: note.clerkUserId, updatedAt: new Date(note.updatedAt) } : null;
    }
    try {
      const problem = await prisma.problem.findFirst({
        where: { OR: [{ id: problemId }, { canonicalSlug: problemId }] }
      });
      if (!problem) return null;

      return await prisma.problemNote.findUnique({
        where: {
          clerkUserId_problemId: {
            clerkUserId: userId,
            problemId: problem.id
          }
        }
      });
    } catch {
      const note = offlineUserStore.getNote(userId, problemId);
      return note ? { id: note.id, content: note.content, clerkUserId: note.clerkUserId, updatedAt: new Date(note.updatedAt) } : null;
    }
  }

  /**
   * Upsert problem note. Enforces that only the authenticated user's note is created/updated.
   */
  static async saveNote(userId: string, problemId: string, content: string) {
    if (!isLiveDb()) {
      const note = offlineUserStore.saveNote(userId, problemId, content);
      return { id: note.id, content: note.content, clerkUserId: note.clerkUserId, updatedAt: new Date(note.updatedAt) };
    }
    try {
      const problem = await prisma.problem.findFirst({
        where: { OR: [{ id: problemId }, { canonicalSlug: problemId }] }
      });
      if (!problem) {
        const note = offlineUserStore.saveNote(userId, problemId, content);
        return { id: note.id, content: note.content, clerkUserId: note.clerkUserId, updatedAt: new Date(note.updatedAt) };
      }

      const existing = await prisma.problemNote.findUnique({
        where: { clerkUserId_problemId: { clerkUserId: userId, problemId: problem.id } }
      });

      if (existing) {
        verifyOwnership(existing.clerkUserId, userId);
        return await prisma.problemNote.update({
          where: { id: existing.id },
          data: { content }
        });
      }

      return await prisma.problemNote.create({
        data: {
          clerkUserId: userId,
          problemId: problem.id,
          content
        }
      });
    } catch {
      const note = offlineUserStore.saveNote(userId, problemId, content);
      return { id: note.id, content: note.content, clerkUserId: note.clerkUserId, updatedAt: new Date(note.updatedAt) };
    }
  }

  /**
   * Delete a note with ownership verification.
   */
  static async deleteNote(userId: string, noteId: string) {
    if (!isLiveDb()) {
      offlineUserStore.deleteNote(userId, noteId);
      return { id: noteId };
    }
    try {
      const note = await prisma.problemNote.findUnique({
        where: { id: noteId }
      });

      if (!note) return null;

      verifyOwnership(note.clerkUserId, userId);

      return await prisma.problemNote.delete({
        where: { id: noteId }
      });
    } catch {
      offlineUserStore.deleteNote(userId, noteId);
      return { id: noteId };
    }
  }
}
