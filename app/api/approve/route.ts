import { NextRequest, NextResponse } from 'next/server';

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

    console.log(`[approve] Simulated approval of draft ${draftId}`);
    console.log('[approve] In production, this would publish the FAQ to your CMS');

    return NextResponse.json({
      success: true,
      message: `Draft ${draftId} approved (simulated)`,
    });
  } catch (error) {
    console.error('[approve] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

