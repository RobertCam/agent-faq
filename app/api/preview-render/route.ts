import { NextRequest, NextResponse } from 'next/server';
import { draftStoreGet } from '@/lib/mcp-tools';
import { yextGetEntity } from '@/lib/mcp-tools';
import { renderContentForEntity } from '@/lib/content-preview';

export async function POST(req: NextRequest) {
  try {
    const { draftId, entityId, content: contentOverride } = await req.json();

    if (!draftId || !entityId) {
      return NextResponse.json(
        { success: false, error: 'draftId and entityId are required' },
        { status: 400 }
      );
    }

    const { draft } = await draftStoreGet({ draftId });
    const { entity } = await yextGetEntity({ entityId });

    const sourceContent = contentOverride || draft.content;
    const rendered = renderContentForEntity(draft.contentType, sourceContent, entity);

    return NextResponse.json({
      success: true,
      entity: {
        id: entityId,
        name: entity.name,
        address: entity.address,
      },
      rendered,
    });
  } catch (error) {
    console.error('[api/preview-render] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
