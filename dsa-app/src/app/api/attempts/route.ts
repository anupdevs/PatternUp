import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { recordAttemptSchema } from '@/lib/validations';
import { ProgressService } from '@/services/progress.service';
import { jsonSuccess, handleApiError } from '@/lib/api-response';
import { AttemptOutcome } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { searchParams } = new URL(req.url);

    const topic = searchParams.get('topic') || undefined;
    const outcomeParam = searchParams.get('outcome');
    const outcome = outcomeParam && Object.values(AttemptOutcome).includes(outcomeParam as AttemptOutcome)
      ? (outcomeParam as AttemptOutcome)
      : undefined;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;

    const history = await ProgressService.getAttemptHistory(userId, {
      topic,
      outcome,
      from,
      to,
      limit,
      page
    });

    return jsonSuccess(history);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await req.json();
    const validatedInput = recordAttemptSchema.parse(body);

    const result = await ProgressService.recordAttempt(userId, validatedInput);
    return jsonSuccess(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
