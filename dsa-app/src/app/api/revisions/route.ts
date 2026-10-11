import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { RevisionService } from '@/services/revision.service';
import { jsonSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { searchParams } = new URL(req.url);
    const upcomingHours = Number(searchParams.get('upcomingHours') || '0');

    const dueProblems = await RevisionService.getRevisionDueProblems(userId, upcomingHours);
    return jsonSuccess(dueProblems);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await req.json();

    if (!body?.problemId) {
      throw new Error('Problem ID is required');
    }
    const validRatings = ['AGAIN', 'HARD', 'GOOD', 'EASY'];
    if (!validRatings.includes(body.rating)) {
      throw new Error(`Rating must be one of: ${validRatings.join(', ')}`);
    }

    const updatedSchedule = await RevisionService.recordReviewOutcome(
      userId,
      body.problemId,
      body.rating
    );

    return jsonSuccess(updatedSchedule);
  } catch (error) {
    return handleApiError(error);
  }
}
