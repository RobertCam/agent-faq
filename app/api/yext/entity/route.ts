import { NextRequest, NextResponse } from 'next/server';
import { yextGetEntity } from '@/lib/mcp-tools';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const entityId = req.nextUrl.searchParams.get('entityId');

    if (!entityId) {
      return NextResponse.json({ success: false, error: 'Missing entityId' }, { status: 400 });
    }

    const result = await yextGetEntity({ entityId });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[api/yext/entity] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
