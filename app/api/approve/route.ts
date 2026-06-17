import { NextRequest, NextResponse } from 'next/server';
import { draftStoreGet } from '@/lib/mcp-tools';
import { DraftStoreGetInput, FAQComponentProps, ComparisonComponentProps, BlogComponentProps } from '@/lib/types';
import { updateFAQEntity, updateComparisonEntity, updateBlogEntity } from '@/lib/yext-client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { draftId, entityId, fieldId, yextApiKey, yextAccountId } = body;

    if (!draftId) {
      return NextResponse.json(
        { error: 'Missing draftId' },
        { status: 400 }
      );
    }

    // Load the draft
    const input: DraftStoreGetInput = { draftId };
    const { draft } = await draftStoreGet(input);

    // Validate content type
    if (!['FAQ', 'COMPARISON', 'BLOG'].includes(draft.contentType)) {
      return NextResponse.json(
        { 
          success: false,
          error: `Content type ${draft.contentType} is not supported for Yext integration. Supported types: FAQ, COMPARISON, BLOG.` 
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

    // Validate Yext credentials (fall back to server env)
    const resolvedApiKey = yextApiKey || process.env.YEXT_API_KEY;
    const resolvedAccountId = yextAccountId || process.env.YEXT_ACCOUNT_ID;

    if (!resolvedApiKey || !resolvedAccountId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Yext API Key and Account ID are required. Set YEXT_API_KEY and YEXT_ACCOUNT_ID in environment.' 
        },
        { status: 400 }
      );
    }

    let yextResponse;
    let defaultFieldId: string;

    // Handle each content type
    if (draft.contentType === 'FAQ') {
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

      defaultFieldId = 'c_minigolfMadness_locations_faqSection';
      const targetFieldId = fieldId || defaultFieldId;
      
      console.log(`[approve] Updating Yext FAQ entity ${targetEntityId} for draft ${draftId}`);
      console.log(`[approve] FAQ items: ${faqContent.items.length}`);
      
      yextResponse = await updateFAQEntity(
        targetEntityId, 
        faqContent, 
        targetFieldId,
        resolvedApiKey,
        resolvedAccountId
      );
    } else if (draft.contentType === 'COMPARISON') {
      const comparisonContent = draft.content as ComparisonComponentProps;
      
      if (!comparisonContent || !comparisonContent.items || !Array.isArray(comparisonContent.items)) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Invalid Comparison content structure' 
          },
          { status: 400 }
        );
      }

      if (comparisonContent.items.length === 0) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Comparison content has no items to publish' 
          },
          { status: 400 }
        );
      }

      defaultFieldId = 'c_minigolfMadnessProductComparison';
      const targetFieldId = fieldId || defaultFieldId;
      
      console.log(`[approve] Updating Yext Comparison entity ${targetEntityId} for draft ${draftId}`);
      console.log(`[approve] Comparison items: ${comparisonContent.items.length}`);
      
      yextResponse = await updateComparisonEntity(
        targetEntityId, 
        comparisonContent, 
        targetFieldId,
        resolvedApiKey,
        resolvedAccountId
      );
    } else if (draft.contentType === 'BLOG') {
      const blogContent = draft.content as BlogComponentProps;
      
      if (!blogContent || !blogContent.sections || !Array.isArray(blogContent.sections)) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Invalid Blog content structure' 
          },
          { status: 400 }
        );
      }

      if (blogContent.sections.length === 0) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Blog content has no sections to publish' 
          },
          { status: 400 }
        );
      }

      defaultFieldId = 'c_minigolfMandnessBlogs';
      const targetFieldId = fieldId || defaultFieldId;
      
      console.log(`[approve] Updating Yext Blog entity ${targetEntityId} for draft ${draftId}`);
      console.log(`[approve] Blog sections: ${blogContent.sections.length}`);
      
      yextResponse = await updateBlogEntity(
        targetEntityId, 
        blogContent, 
        targetFieldId,
        resolvedApiKey,
        resolvedAccountId
      );
    } else {
      // This shouldn't happen due to validation above, but satisfies TypeScript
      return NextResponse.json(
        { 
          success: false,
          error: `Unsupported content type: ${draft.contentType}` 
        },
        { status: 400 }
      );
    }

    if (!yextResponse) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to update Yext entity: No response received' 
        },
        { status: 500 }
      );
    }

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

