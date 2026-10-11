import { NextRequest } from 'next/server';
import { CatalogService } from '@/services/catalog.service';
import { getAuthenticatedUser } from '@/lib/auth';
import { jsonSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> }
) {
  try {
    const { idOrSlug } = await params;
    const userId = await getAuthenticatedUser();
    const problem = await CatalogService.getProblemDetails(idOrSlug, userId);

    if (!problem) {
      return handleApiError(new Error(`Problem '${idOrSlug}' not found`));
    }

    return jsonSuccess(problem);
  } catch (error) {
    return handleApiError(error);
  }
}
