import { NextRequest, NextResponse } from 'next/server';
import { draftStoreGet } from '@/lib/mcp-tools';
import { DraftStoreGetInput } from '@/lib/types';
import { updateFAQEntity } from '@/lib/yext-client';
import { FAQComponentProps } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { draftId, entityId, fieldId } = body;

    if (!draftId) {
      return NextResponse.json(
        { error: 'Missing draftId' },
        { status: 400 }
      );
    }

    // Load the draft
    const input: DraftStoreGetInput = { draftId };
    const { draft } = await draftStoreGet(input);

    // Only handle FAQ content types for now
    if (draft.contentType !== 'FAQ') {
      return NextResponse.json(
        { 
          success: false,
          error: `Content type ${draft.contentType} is not supported for Yext integration. Only FAQ is supported.` 
        },
        { status: 400 }
      );
    }

    // Get entityId from request body, draft metadata, or throw error
    const targetEntityId = entityId || draft.entityId;
    
    if (!targetEntityId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing entityId. Please provide entityId in the request body or store it with the draft.' 
        },
        { status: 400 }
      );
    }

    // Validate FAQ content structure
    const faqContent = draft.content as FAQComponentProps;
    
    if (!faqContent || !faqContent.items || !Array.isArray(faqContent.items)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid FAQ content structure' 
        },
        { status: 400 }
      );
    }

    if (faqContent.items.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'FAQ content has no items to publish' 
        },
        { status: 400 }
      );
    }

    console.log(`[approve] Updating Yext FAQ entity ${targetEntityId} for draft ${draftId}`);
    console.log(`[approve] FAQ items: ${faqContent.items.length}`);

    // Update FAQ entity in Yext
    const targetFieldId = fieldId || 'c_minigolfMadness_locations_faqSection';
    const yextResponse = await updateFAQEntity(targetEntityId, faqContent, targetFieldId);

    console.log(`[approve] Successfully updated Yext entity ${targetEntityId}`);

    return NextResponse.json({
      success: true,
      message: `Draft ${draftId} approved and published to Yext entity ${targetEntityId}`,
      entityId: targetEntityId,
      yextResponse: {
        uuid: yextResponse.meta.uuid,
      },
    });
  } catch (error) {
    console.error('[approve] Error:', error);
    
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

