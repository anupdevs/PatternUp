import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { revealHintSchema } from '@/lib/validations';
import { HintService } from '@/services/hint.service';
import { jsonSuccess, handleApiError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await req.json();
    const validatedInput = revealHintSchema.parse(body);

    const hint = await HintService.revealHint(
      userId,
      validatedInput.problemId,
      validatedInput.hintId
    );

    return jsonSuccess(hint);
  } catch (error) {
    return handleApiError(error);
  }
}
