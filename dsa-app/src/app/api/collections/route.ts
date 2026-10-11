import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { CollectionService } from '@/services/collection.service';
import { jsonSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await requireAuth();
    const collections = await CollectionService.getUserCollections(userId);
    return jsonSuccess(collections);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await req.json();

    if (!body?.name || typeof body.name !== 'string') {
      throw new Error('Collection name is required');
    }

    const created = await CollectionService.createCollection(userId, {
      name: body.name,
      description: body.description,
      color: body.color
    });

    return jsonSuccess(created, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
