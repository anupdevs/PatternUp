import { NextRequest } from 'next/server';
import { CatalogService } from '@/services/catalog.service';
import { problemQuerySchema } from '@/lib/validations';
import { getAuthenticatedUser } from '@/lib/auth';
import { jsonSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawParams = {
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      difficulty: searchParams.get('difficulty') || undefined,
      status: searchParams.get('status') || undefined,
      topic: searchParams.get('topic') || undefined,
      pattern: searchParams.get('pattern') || undefined,
      bookmarked: searchParams.get('bookmarked') || undefined,
      search: searchParams.get('search') || undefined
    };

    const validatedQuery = problemQuerySchema.parse(rawParams);
    const userId = await getAuthenticatedUser();

    const result = await CatalogService.listProblems(validatedQuery, userId);
    return jsonSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
