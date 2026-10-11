import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { ExportService } from '@/services/export.service';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'json';

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    if (format === 'csv') {
      const csvData = await ExportService.exportUserDataAsCsv(userId);
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="dsa_study_export_${timestamp}.csv"`
        }
      });
    }

    const jsonData = await ExportService.exportUserDataAsJson(userId);
    return new NextResponse(JSON.stringify(jsonData, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="dsa_study_export_${timestamp}.json"`
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
