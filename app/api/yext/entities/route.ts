import { NextRequest, NextResponse } from 'next/server';
import { yextListEntities } from '@/lib/mcp-tools';
import { resolveYextCredentials } from '@/lib/yext-credentials';

export const dynamic = 'force-dynamic';

async function listEntitiesWithCredentials(
  entityType: string,
  limit: number,
  yextApiKey?: string,
  yextAccountId?: string
) {
  const credentials = resolveYextCredentials(yextApiKey, yextAccountId);
  return yextListEntities({
    entityType,
    limit,
    yextApiKey: credentials.yextApiKey,
    yextAccountId: credentials.yextAccountId,
  });
}

export async function GET(req: NextRequest) {
  try {
    const entityType = req.nextUrl.searchParams.get('entityType') || 'location';
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50', 10);
    const yextApiKey = req.nextUrl.searchParams.get('yextApiKey') || undefined;
    const yextAccountId = req.nextUrl.searchParams.get('yextAccountId') || undefined;

    const result = await listEntitiesWithCredentials(entityType, limit, yextApiKey, yextAccountId);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[api/yext/entities] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      entityType = 'location',
      limit = 50,
      yextApiKey,
      yextAccountId,
    } = body;

    const result = await listEntitiesWithCredentials(entityType, limit, yextApiKey, yextAccountId);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[api/yext/entities] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
