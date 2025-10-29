import { NextRequest } from 'next/server';
import { expandSeeds, fetchPAA, rankQuestions, generateFAQJSON, draftStorePut } from '@/lib/mcp-tools';

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = (type: string, data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`));
      };

      try {
        const body = await req.json();
        const { brand, vertical, region } = body;

        if (!brand || !vertical || !region) {
          sendUpdate('error', { message: 'Missing required fields' });
          controller.close();
          return;
        }

        sendUpdate('start', { brand, vertical, region });

        // Step 1: Expand seeds
        sendUpdate('step', { step: 1, name: 'Expanding seed keywords', status: 'running' });
        const seedsResult = await expandSeeds({ brand, vertical, region });
        sendUpdate('step', { step: 1, name: 'Expanding seed keywords', status: 'completed', data: seedsResult });
        sendUpdate('data', { seeds: seedsResult.seeds });

        // Step 2: Fetch PAA
        sendUpdate('step', { step: 2, name: 'Fetching People Also Ask', status: 'running' });
        const paaResult = await fetchPAA({ seeds: seedsResult.seeds, location: region, hl: 'en' });
        sendUpdate('step', { step: 2, name: 'Fetching People Also Ask', status: 'completed', data: paaResult });
        sendUpdate('data', { paaRows: paaResult.rows });

        // Step 3: Rank questions
        sendUpdate('step', { step: 3, name: 'Ranking questions', status: 'running' });
        const rankedResult = await rankQuestions({ brand, rows: paaResult.rows });
        sendUpdate('step', { step: 3, name: 'Ranking questions', status: 'completed', data: rankedResult });
        sendUpdate('data', { rankedQuestions: rankedResult.top });

        // Step 4: Generate FAQ
        sendUpdate('step', { step: 4, name: 'Generating FAQ with AI', status: 'running' });
        const faqResult = await generateFAQJSON({ brand, region, questions: rankedResult.top });
        sendUpdate('step', { step: 4, name: 'Generating FAQ with AI', status: 'completed', data: faqResult });
        sendUpdate('data', { faqComponent: faqResult.faqComponent });

        // Step 5: Store draft
        sendUpdate('step', { step: 5, name: 'Storing draft', status: 'running' });
        const draftResult = await draftStorePut({ brand, vertical, region, faqComponent: faqResult.faqComponent });
        sendUpdate('step', { step: 5, name: 'Storing draft', status: 'completed', data: draftResult });
        sendUpdate('data', { draftId: draftResult.draftId });

        sendUpdate('complete', { draftId: draftResult.draftId });
        controller.close();
      } catch (error) {
        sendUpdate('error', { message: error instanceof Error ? error.message : 'Unknown error' });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

