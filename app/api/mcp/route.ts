import { NextRequest, NextResponse } from 'next/server';
import {
  expandSeeds,
  fetchPAA,
  rankQuestions,
  recommendContentType,
  generateFAQJSON,
  generateComparisonJSON,
  generateBlogJSON,
  draftStorePut,
  draftStoreGet,
} from '@/lib/mcp-tools';
import {
  ExpandSeedsInput,
  FetchPAAInput,
  RankQuestionsInput,
  RecommendContentTypeInput,
  GenerateFAQInput,
  GenerateComparisonInput,
  GenerateBlogInput,
  DraftStorePutInput,
  DraftStoreGetInput,
} from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accent } = body;

    // Handle different tool calls
    switch (body.tool) {
      case 'expand_seeds': {
        const input = body.args as ExpandSeedsInput;
        const result = await expandSeeds(input);
        return NextResponse.json({ result });
      }

      case 'fetch_paa': {
        const input = body.args as FetchPAAInput;
        const result = await fetchPAA(input);
        return NextResponse.json({ result });
      }

      case 'rank_questions': {
        const input = body.args as RankQuestionsInput;
        const result = await rankQuestions(input);
        return NextResponse.json({ result });
      }

      case 'recommend_content_type': {
        const input = body.args as RecommendContentTypeInput;
        const result = await recommendContentType(input);
        return NextResponse.json({ result });
      }

      case 'generate_faq_json': {
        const input = body.args as GenerateFAQInput;
        const result = await generateFAQJSON(input);
        return NextResponse.json({ result });
      }

      case 'generate_comparison_json': {
        const input = body.args as GenerateComparisonInput;
        const result = await generateComparisonJSON(input);
        return NextResponse.json({ result });
      }

      case 'generate_blog_json': {
        const input = body.args as GenerateBlogInput;
        const result = await generateBlogJSON(input);
        return NextResponse.json({ result });
      }

      case 'draft_store.put': {
        const input = body.args as DraftStorePutInput;
        const result = await draftStorePut(input);
        return NextResponse.json({ result });
      }

      case 'draft_store.get': {
        const input = body.args as DraftStoreGetInput;
        const result = await draftStoreGet(input);
        return NextResponse.json({ result });
      }

      default:
        return NextResponse.json(
          { error: `Unknown tool: ${body.tool}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[MCP API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'DESKTOP' },
      { status: 500 }
    );
  }
}

