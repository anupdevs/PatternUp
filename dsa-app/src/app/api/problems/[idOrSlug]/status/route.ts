import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { updateStatusSchema } from '@/lib/validations';
import { ProgressService } from '@/services/progress.service';
import { jsonSuccess, handleApiError } from '@/lib/api-response';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> }
) {
  try {
    const userId = await requireAuth();
    const { idOrSlug } = await params;
    const body = await req.json();

    const validatedInput = updateStatusSchema.parse({
      ...body,
      problemId: idOrSlug
    });

    const result = await ProgressService.updateStatus(
      userId,
      validatedInput.problemId,
      validatedInput.status
    );

    return jsonSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
