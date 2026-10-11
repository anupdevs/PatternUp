import { requireAuth } from '@/lib/auth';
import { ProgressService } from '@/services/progress.service';
import { jsonSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await requireAuth();
    const analytics = await ProgressService.getAnalytics(userId);
    return jsonSuccess(analytics);
  } catch (error) {
    return handleApiError(error);
  }
}
