import { NextRequest, NextResponse } from 'next/server';
import { draftStoreGet, yextGetEntity, yextUpdateEntity } from '@/lib/mcp-tools';
import { renderContentForEntity } from '@/lib/content-preview';
import { getDefaultFieldId } from '@/lib/constants';
import { resolveYextCredentialsFromSources } from '@/lib/yext-credentials';

export async function POST(req: NextRequest) {
  try {
    const { draftId, content, yextApiKey, yextAccountId } = await req.json();

    if (!draftId) {
      return NextResponse.json({ success: false, error: 'Missing draftId' }, { status: 400 });
    }

    const { draft } = await draftStoreGet({ draftId });
    const credentials = resolveYextCredentialsFromSources(
      { yextApiKey, yextAccountId },
      draft.runContext
    );
    const templateContent = content || draft.content;
    const entityIds = draft.runContext?.selectedEntityIds || [];
    const fieldId = draft.fieldId || draft.runContext?.fieldId || getDefaultFieldId(draft.contentType);

    if (entityIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No entities selected for this draft' },
        { status: 400 }
      );
    }

    const results: Array<{
      entityId: string;
      entityName?: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const entityId of entityIds) {
      try {
        const { entity } = await yextGetEntity({
          entityId,
          yextApiKey: credentials.yextApiKey,
          yextAccountId: credentials.yextAccountId,
        });
        const customized = renderContentForEntity(draft.contentType, templateContent, entity);

        await yextUpdateEntity({
          entityId,
          contentType: draft.contentType,
          content: customized,
          fieldId,
          yextApiKey: credentials.yextApiKey,
          yextAccountId: credentials.yextAccountId,
        });

        results.push({ entityId, entityName: entity.name, success: true });
      } catch (error) {
        results.push({
          entityId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: failed === 0,
      message: `Published ${succeeded} of ${entityIds.length} entities`,
      results,
      summary: { total: entityIds.length, succeeded, failed },
    });
  } catch (error) {
    console.error('[publish-template] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
