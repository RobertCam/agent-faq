import { NextRequest } from 'next/server';
import {
  expandSeeds,
  fetchPAA,
  rankQuestions,
  generateFAQJSON,
  generateComparisonJSON,
  generateBlogJSON,
  draftStorePut,
  yextListEntities,
  yextGetEntity,
} from '@/lib/mcp-tools';
import { RunContext, RunContextEntity } from '@/lib/types';
import { getDefaultFieldId } from '@/lib/constants';

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const stepLog: RunContext['steps'] = [];

      const sendUpdate = (type: string, data: any) => {
        try {
          const jsonStr = JSON.stringify({ type, data });
          controller.enqueue(encoder.encode(`data: ${jsonStr}\n\n`));
        } catch (error) {
          console.error('[run-demo-stream] Error serializing update:', error);
          try {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'error', data: { message: 'Failed to serialize update data' } })}\n\n`
              )
            );
          } catch {
            console.error('[run-demo-stream] Critical: Cannot serialize error message');
          }
        }
      };

      const trackStep = (step: number, name: string, status: string) => {
        const existing = stepLog.filter((s) => s.step !== step);
        stepLog.length = 0;
        stepLog.push(...existing, { step, name, status });
      };

      try {
        const body = await req.json();
        const {
          brand,
          category,
          contentType,
          customInstructions,
          selectedEntityIds,
          fieldId,
          yextFieldId,
          testMode,
        } = body;

        if (!category || !contentType) {
          sendUpdate('error', { message: 'Missing required fields: category and contentType are required' });
          controller.close();
          return;
        }

        const resolvedFieldId = fieldId || yextFieldId || getDefaultFieldId(contentType);

        if (!selectedEntityIds || !Array.isArray(selectedEntityIds) || selectedEntityIds.length === 0) {
          sendUpdate('error', { message: 'Select at least one Yext entity before running' });
          controller.close();
          return;
        }

        const finalSelectedEntityIds: string[] = selectedEntityIds;
        const selectedEntities: RunContextEntity[] = [];

        sendUpdate('start', { brand: brand || undefined, category, contentType });

        // Step 0: Validate entities exist in Yext
        trackStep(0, 'Loading Yext entities', 'running');
        sendUpdate('step', { step: 0, name: 'Loading Yext entities', status: 'running' });
        try {
          const entitiesResult = await yextListEntities({ entityType: 'location', limit: 50 });
          const entityMap = new Map(entitiesResult.entities.map((e) => [e.id, e]));

          for (const id of finalSelectedEntityIds) {
            const e = entityMap.get(id);
            if (e) {
              selectedEntities.push({
                id: e.id,
                name: e.name,
                city: e.address?.city,
                region: e.address?.region,
              });
            }
          }

          trackStep(0, 'Loading Yext entities', 'completed');
          sendUpdate('step', {
            step: 0,
            name: 'Loading Yext entities',
            status: 'completed',
            data: { total: selectedEntities.length },
          });
        } catch (error) {
          console.error('[run-demo-stream] Error loading entities:', error);
          sendUpdate('error', {
            message: error instanceof Error ? error.message : 'Failed to load Yext entities',
          });
          controller.close();
          return;
        }

        // Fetch sample entity for generation context
        let sampleEntityData: any;
        try {
          const sample = await yextGetEntity({ entityId: finalSelectedEntityIds[0] });
          sampleEntityData = sample.entity;
        } catch {
          // Continue without entity context
        }

        // Step 1: Expand seeds
        trackStep(1, 'Expanding seed keywords', 'running');
        sendUpdate('step', { step: 1, name: 'Expanding seed keywords', status: 'running' });
        const seedsResult = await expandSeeds({ brand, vertical: category });
        trackStep(1, 'Expanding seed keywords', 'completed');
        sendUpdate('step', { step: 1, name: 'Expanding seed keywords', status: 'completed', data: seedsResult });
        sendUpdate('data', { seeds: seedsResult.seeds });

        // Step 2: Fetch PAA
        trackStep(2, 'Fetching People Also Ask', 'running');
        sendUpdate('step', { step: 2, name: 'Fetching People Also Ask', status: 'running' });
        const paaResult = await fetchPAA({
          seeds: seedsResult.seeds,
          hl: 'en',
          testMode: testMode || false,
        });
        trackStep(2, 'Fetching People Also Ask', 'completed');
        sendUpdate('step', { step: 2, name: 'Fetching People Also Ask', status: 'completed', data: paaResult });
        sendUpdate('data', { paaRows: paaResult.rows });

        // Step 3: Rank questions
        trackStep(3, 'Ranking questions by opportunity', 'running');
        sendUpdate('step', { step: 3, name: 'Ranking questions by opportunity', status: 'running' });
        const rankedResult = await rankQuestions({ brand, rows: paaResult.rows });
        trackStep(3, 'Ranking questions by opportunity', 'completed');
        sendUpdate('step', { step: 3, name: 'Ranking questions by opportunity', status: 'completed', data: rankedResult });
        sendUpdate('data', { rankedQuestions: rankedResult.top });

        // Step 4: Generate template content
        const selectedType = contentType;
        let generatedContent: any;

        trackStep(4, `Generating ${selectedType} template with AI`, 'running');
        sendUpdate('step', { step: 4, name: `Generating ${selectedType} template with AI`, status: 'running' });

        if (selectedType === 'FAQ') {
          const faqResult = await generateFAQJSON({
            brand,
            questions: rankedResult.top,
            customInstructions,
            genericContent: true,
            useTemplate: true,
            entityData: sampleEntityData,
          });
          generatedContent = faqResult.faqComponent;
          sendUpdate('data', { faqComponent: faqResult.faqComponent });
        } else if (selectedType === 'COMPARISON') {
          const comparisonResult = await generateComparisonJSON({
            brand,
            vertical: category,
            questions: rankedResult.top,
            customInstructions,
            genericContent: true,
            useTemplate: true,
            entityData: sampleEntityData,
          });
          generatedContent = comparisonResult.comparisonComponent;
          sendUpdate('data', { comparisonComponent: comparisonResult.comparisonComponent });
        } else if (selectedType === 'BLOG') {
          const blogResult = await generateBlogJSON({
            brand,
            vertical: category,
            questions: rankedResult.top,
            customInstructions,
            genericContent: true,
            useTemplate: true,
            entityData: sampleEntityData,
          });
          generatedContent = blogResult.blogComponent;
          sendUpdate('data', { blogComponent: blogResult.blogComponent });
        }

        trackStep(4, `Generating ${selectedType} template with AI`, 'completed');
        sendUpdate('step', { step: 4, name: `Generating ${selectedType} template with AI`, status: 'completed' });

        // Step 5: Store template draft with run context
        trackStep(5, 'Storing template draft', 'running');
        sendUpdate('step', { step: 5, name: 'Storing template draft', status: 'running' });

        const runContext: RunContext = {
          category,
          fieldId: resolvedFieldId,
          customInstructions,
          testMode: testMode || false,
          seeds: seedsResult.seeds,
          paaRows: paaResult.rows,
          rankedQuestions: rankedResult.top,
          steps: [...stepLog],
          selectedEntityIds: finalSelectedEntityIds,
          selectedEntities,
          isTemplate: true,
        };

        const draftResult = await draftStorePut({
          brand,
          category,
          region: 'Template',
          contentType: selectedType,
          content: generatedContent,
          fieldId: resolvedFieldId,
          runContext,
        });

        trackStep(5, 'Storing template draft', 'completed');
        sendUpdate('step', { step: 5, name: 'Storing template draft', status: 'completed', data: draftResult });
        sendUpdate('data', { draftId: draftResult.draftId });

        sendUpdate('complete', {
          draftId: draftResult.draftId,
          selectedEntityIds: finalSelectedEntityIds,
          selectedEntities,
        });

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
