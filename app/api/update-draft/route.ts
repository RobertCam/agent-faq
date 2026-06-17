import { NextRequest, NextResponse } from 'next/server';
import { draftStoreGet } from '@/lib/mcp-tools';
import { Draft } from '@/lib/types';

function getDraftsMap(): Map<string, Draft> {
  if (!(globalThis as any).__draftsStore) {
    (globalThis as any).__draftsStore = new Map<string, Draft>();
  }
  return (globalThis as any).__draftsStore;
}

export async function POST(req: NextRequest) {
  try {
    const { draftId, content } = await req.json();

    if (!draftId || !content) {
      return NextResponse.json(
        { success: false, error: 'draftId and content are required' },
        { status: 400 }
      );
    }

    const { draft } = await draftStoreGet({ draftId });
    const drafts = getDraftsMap();

    const updated: Draft = {
      ...draft,
      content,
    };

    drafts.set(draftId, updated);

    return NextResponse.json({ success: true, draft: updated });
  } catch (error) {
    console.error('[api/update-draft] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
