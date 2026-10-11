import { NextRequest } from 'next/server';
import { CatalogService } from '@/services/catalog.service';
import { jsonSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const topicSlug = searchParams.get('topic') || undefined;
    const patterns = await CatalogService.listPatterns(topicSlug);
    return jsonSuccess(patterns);
  } catch (error) {
    return handleApiError(error);
  }
}
