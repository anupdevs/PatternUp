import { CatalogService } from '@/services/catalog.service';
import { getAuthenticatedUser } from '@/lib/auth';
import { jsonSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getAuthenticatedUser();
    const hierarchy = await CatalogService.getPatternHierarchy(userId);
    return jsonSuccess(hierarchy);
  } catch (error) {
    return handleApiError(error);
  }
}
