import { NextRequest, NextResponse } from 'next/server';
import { draftStoreGet } from '@/lib/mcp-tools';
import { DraftStoreGetInput } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { draftId } = body;

    if (!draftId) {
      return NextResponse.json(
        { error: 'Missing draftId' },
        { status: 400 }
      );
    }

    const input: DraftStoreGetInput = { draftId };
    const { draft } = await draftStoreGet(input);

    return NextResponse.json({
      success: true,
      draft,
    });
  } catch (error) {
    console.error('[load-draft] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

