import { NextRequest, NextResponse } from 'next/server';
import { draftStoreGet } from '@/lib/mcp-tools';
import { DraftStoreGetInput } from '@/lib/types';
import { updateFAQEntity } from '@/lib/yext-client';
import { FAQComponentProps } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { draftIds, fieldId, yextApiKey, yextAccountId } = body;

    if (!draftIds || !Array.isArray(draftIds) || draftIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty draftIds array' },
        { status: 400 }
      );
    }

    if (!yextApiKey || !yextAccountId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Yext API Key and Account ID are required' 
        },
        { status: 400 }
      );
    }

    const targetFieldId = fieldId || 'c_minigolfMadness_locations_faqSection';
    const results: Array<{
      draftId: string;
      entityId: string;
      success: boolean;
      error?: string;
      entityName?: string;
    }> = [];

    console.log(`[bulk-approve] Processing ${draftIds.length} drafts`);

    for (const draftId of draftIds) {
      try {
        // Load the draft
        const input: DraftStoreGetInput = { draftId };
        const { draft } = await draftStoreGet(input);

        // Only handle FAQ content types
        if (draft.contentType !== 'FAQ') {
          results.push({
            draftId,
            entityId: draft.entityId || 'unknown',
            success: false,
            error: `Content type ${draft.contentType} is not supported`,
            entityName: draft.entityId || undefined,
          });
          continue;
        }

        // Get entityId from draft
        const targetEntityId = draft.entityId;
        
        if (!targetEntityId) {
          results.push({
            draftId,
            entityId: 'unknown',
            success: false,
            error: 'Missing entityId in draft',
          });
          continue;
        }

        // Validate FAQ content structure
        const faqContent = draft.content as FAQComponentProps;
        
        if (!faqContent || !faqContent.items || !Array.isArray(faqContent.items)) {
          results.push({
            draftId,
            entityId: targetEntityId,
            success: false,
            error: 'Invalid FAQ content structure',
            entityName: targetEntityId,
          });
          continue;
        }

        if (faqContent.items.length === 0) {
          results.push({
            draftId,
            entityId: targetEntityId,
            success: false,
            error: 'FAQ content has no items',
            entityName: targetEntityId,
          });
          continue;
        }

        console.log(`[bulk-approve] Updating Yext FAQ entity ${targetEntityId} for draft ${draftId}`);

        // Update FAQ entity in Yext
        const yextResponse = await updateFAQEntity(
          targetEntityId, 
          faqContent, 
          targetFieldId,
          yextApiKey,
          yextAccountId
        );

        results.push({
          draftId,
          entityId: targetEntityId,
          success: true,
          entityName: targetEntityId,
        });

        console.log(`[bulk-approve] Successfully updated Yext entity ${targetEntityId}`);
      } catch (error) {
        console.error(`[bulk-approve] Error processing draft ${draftId}:`, error);
        results.push({
          draftId,
          entityId: 'unknown',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Processed ${draftIds.length} drafts: ${successCount} succeeded, ${errorCount} failed`,
      results,
      summary: {
        total: draftIds.length,
        succeeded: successCount,
        failed: errorCount,
      },
    });
  } catch (error) {
    console.error('[bulk-approve] Error:', error);
    
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

