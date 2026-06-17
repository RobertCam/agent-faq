import { NextRequest, NextResponse } from 'next/server';
import { listEntities } from '@/lib/yext-client';
import { resolveYextCredentials } from '@/lib/yext-credentials';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { entityType, limit, yextApiKey, yextAccountId } = body;

    const credentials = resolveYextCredentials(yextApiKey, yextAccountId);

    console.log(`[list-yext-entities] Listing entities${entityType ? ` of type ${entityType}` : ''}`);

    const entities = await listEntities(
      entityType,
      limit || 50,
      credentials.yextApiKey,
      credentials.yextAccountId
    );

    // Filter for FAQ entities and show their structure
    const faqEntities = entities.filter((e: any) => 
      e.meta?.entityType?.toLowerCase() === 'faq' || 
      e.meta?.entityType?.toLowerCase()?.includes('faq')
    );

    return NextResponse.json({
      success: true,
      totalEntities: entities.length,
      faqEntities: faqEntities.length,
      entities: entities.map((e: any) => ({
        id: e.meta?.id || e.meta?.uid,
        entityType: e.meta?.entityType,
        name: e.name,
        address: e.address,
        geomodifier: e.geomodifier,
        meta: e.meta,
        // Include full entity for customization
        fullEntity: e,
      })),
    });
  } catch (error) {
    console.error('[list-yext-entities] Error:', error);
    
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

