import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { CollectionService } from '@/services/collection.service';
import { jsonSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;

    const data = await CollectionService.getCollectionDetailsWithProblems(userId, id);
    if (!data) {
      throw new Error('Collection not found');
    }

    return jsonSuccess(data);
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

    await CollectionService.deleteCollection(userId, id);
    return jsonSuccess({ message: 'Collection deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
