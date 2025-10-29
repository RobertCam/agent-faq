import { NextRequest, NextResponse } from 'next/server';
import { runFAQAgent } from '@/lib/faq-agent';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brand, vertical, region } = body;

    if (!brand || !vertical || !region) {
      return NextResponse.json(
        { error: 'Missing required fields: brand, vertical, region' },
        { status: 400 }
      );
    }

    console.log(`[run-demo] Starting agent for ${brand} / ${vertical} / ${region}`);

    const result = await runFAQAgent({ brand, vertical, region });

    return NextResponse.json({
      success: true,
      draftId: result.draftId,
      logs: result.logs,
      workflowData: result.workflowData, // Add the detailed data
    });
  } catch (error) {
    console.error('[run-demo] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
