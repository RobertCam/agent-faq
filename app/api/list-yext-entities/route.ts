import { NextRequest, NextResponse } from 'next/server';
import { listEntities } from '@/lib/yext-client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { entityType, limit } = body;

    console.log(`[list-yext-entities] Listing entities${entityType ? ` of type ${entityType}` : ''}`);

    const entities = await listEntities(entityType, limit || 50);

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
        // Show first few fields to understand structure
        sampleFields: Object.keys(e).slice(0, 10),
      })),
      // Show full structure of first FAQ entity if found
      sampleFAQEntity: faqEntities.length > 0 ? faqEntities[0] : (entities.length > 0 ? entities[0] : null),
      sampleFAQEntityStructure: faqEntities.length > 0 
        ? JSON.stringify(faqEntities[0], null, 2)
        : (entities.length > 0 ? JSON.stringify(entities[0], null, 2) : null),
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

