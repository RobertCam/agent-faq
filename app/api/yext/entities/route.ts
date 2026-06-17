import { NextRequest, NextResponse } from 'next/server';
import { yextListEntities } from '@/lib/mcp-tools';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const entityType = req.nextUrl.searchParams.get('entityType') || 'location';
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50', 10);

    const result = await yextListEntities({ entityType, limit });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[api/yext/entities] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
