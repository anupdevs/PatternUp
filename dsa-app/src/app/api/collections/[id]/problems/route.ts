import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { CollectionService } from '@/services/collection.service';
import { jsonSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const body = await req.json();

    if (!body?.problemId) {
      throw new Error('Problem ID is required');
    }

    const updated = await CollectionService.addProblemToCollection(userId, id, body.problemId);
    return jsonSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const problemId = searchParams.get('problemId');

    if (!problemId) {
      throw new Error('Problem ID is required');
    }

    const updated = await CollectionService.removeProblemFromCollection(userId, id, problemId);
    return jsonSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
