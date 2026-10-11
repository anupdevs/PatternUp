import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { upsertNoteSchema } from '@/lib/validations';
import { NoteService } from '@/services/note.service';
import { jsonSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { searchParams } = new URL(req.url);
    const problemId = searchParams.get('problemId');

    if (!problemId) {
      return handleApiError(new Error('problemId query parameter is required'));
    }

    const note = await NoteService.getNote(userId, problemId);
    return jsonSuccess(note);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await req.json();
    const validatedInput = upsertNoteSchema.parse(body);

    const note = await NoteService.saveNote(
      userId,
      validatedInput.problemId,
      validatedInput.content
    );

    return jsonSuccess(note);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { searchParams } = new URL(req.url);
    const noteId = searchParams.get('noteId');

    if (!noteId) {
      return handleApiError(new Error('noteId query parameter is required'));
    }

    const deleted = await NoteService.deleteNote(userId, noteId);
    return jsonSuccess(deleted);
  } catch (error) {
    return handleApiError(error);
  }
}
