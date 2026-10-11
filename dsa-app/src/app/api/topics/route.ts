import { CatalogService } from '@/services/catalog.service';
import { jsonSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const topics = await CatalogService.listTopics();
    return jsonSuccess(topics);
  } catch (error) {
    return handleApiError(error);
  }
}
