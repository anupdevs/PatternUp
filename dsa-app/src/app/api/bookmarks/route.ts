import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { toggleBookmarkSchema } from '@/lib/validations';
import { BookmarkService } from '@/services/bookmark.service';
import { jsonSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await requireAuth();
    const bookmarks = await BookmarkService.getUserBookmarks(userId);
    return jsonSuccess(bookmarks);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await req.json();
    const validatedInput = toggleBookmarkSchema.parse(body);

    const result = await BookmarkService.toggleBookmark(
      userId,
      validatedInput.problemId,
      validatedInput.bookmarked
    );

    return jsonSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
