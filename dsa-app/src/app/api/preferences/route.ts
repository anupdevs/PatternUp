 import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { updatePreferencesSchema } from '@/lib/validations';
import { PreferenceService } from '@/services/preference.service';
import { jsonSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await requireAuth();
    const prefs = await PreferenceService.getPreferences(userId);
    return jsonSuccess(prefs);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await req.json();
    const validatedInput = updatePreferencesSchema.parse(body);

    const updated = await PreferenceService.updatePreferences(userId, validatedInput);
    return jsonSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
