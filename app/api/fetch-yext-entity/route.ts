import { NextRequest, NextResponse } from 'next/server';
import { getFAQEntity } from '@/lib/yext-client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { entityId } = body;

    if (!entityId) {
      return NextResponse.json(
        { error: 'Missing entityId' },
        { status: 400 }
      );
    }

    console.log(`[fetch-yext-entity] Fetching entity ${entityId}`);

    const entity = await getFAQEntity(entityId);

    if (!entity) {
      return NextResponse.json(
        { 
          success: false,
          error: `Entity ${entityId} not found` 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      entity,
      // Pretty print the structure for inspection
      entityStructure: JSON.stringify(entity, null, 2),
    });
  } catch (error) {
    console.error('[fetch-yext-entity] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

