import { NextRequest } from 'next/server';
import { 
  expandSeeds, 
  fetchPAA, 
  rankQuestions, 
  generateFAQJSON, 
  generateComparisonJSON,
  generateBlogJSON,
  draftStorePut,
  customizeFAQForEntity,
} from '@/lib/mcp-tools';
import { getFAQEntity, listEntities } from '@/lib/yext-client';

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = (type: string, data: any) => {
        try {
          const jsonStr = JSON.stringify({ type, data });
          controller.enqueue(encoder.encode(`data: ${jsonStr}\n\n`));
        } catch (error) {
          console.error('[run-demo-stream] Error serializing update:', error);
          // Send a simplified error message instead
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', data: { message: 'Failed to serialize update data' } })}\n\n`));
          } catch (e) {
            // If even error serialization fails, just log it
            console.error('[run-demo-stream] Critical: Cannot serialize error message');
          }
        }
      };

      try {
          const body = await req.json();
          const { 
            brand, 
            vertical, 
            region, 
            contentType, 
            customInstructions,
            genericContent,
            yextApiKey,
            yextAccountId,
            selectedEntityIds,
            yextFieldId,
          } = body;

          if (!vertical || !contentType) {
            sendUpdate('error', { message: 'Missing required fields: vertical and contentType are required' });
            controller.close();
            return;
          }

          if (!genericContent && !region) {
            sendUpdate('error', { message: 'Region is required unless generic content mode is enabled' });
            controller.close();
            return;
          }

        sendUpdate('start', { 
          brand: brand || undefined, 
          vertical, 
          region: region || 'Generic',
          genericContent: genericContent || false,
        });

        // Step 0: Fetch Yext entities if credentials provided
        let finalSelectedEntityIds = selectedEntityIds || [];
        if (yextApiKey && yextAccountId && contentType === 'FAQ') {
          sendUpdate('step', { step: 0, name: 'Fetching entities from Yext', status: 'running' });
          try {
            const entities = await listEntities('location', 50, yextApiKey, yextAccountId);
            const formattedEntities = entities.map((e: any) => ({
              id: e.meta?.id || e.meta?.uid,
              entityType: e.meta?.entityType,
              name: e.name || 'Unnamed Entity',
              address: e.address ? {
                line1: e.address.line1,
                line2: e.address.line2,
                city: e.address.city,
                region: e.address.region,
                postalCode: e.address.postalCode,
              } : undefined,
              geomodifier: e.geomodifier,
              // Store minimal meta info only
              meta: {
                id: e.meta?.id,
                uid: e.meta?.uid,
                entityType: e.meta?.entityType,
              },
            }));
            
            sendUpdate('step', { step: 0, name: 'Fetching entities from Yext', status: 'completed', data: { entities: formattedEntities } });
            sendUpdate('data', { yextEntities: formattedEntities });
            
            // If no entities were pre-selected, use all fetched entities
            if (!selectedEntityIds || selectedEntityIds.length === 0) {
              finalSelectedEntityIds = formattedEntities.map((e: any) => e.id);
              sendUpdate('data', { autoSelectedEntities: finalSelectedEntityIds });
            } else {
              // Use the pre-selected entities
              finalSelectedEntityIds = selectedEntityIds;
            }
          } catch (error) {
            console.error('[run-demo-stream] Error fetching entities:', error);
            sendUpdate('step', { step: 0, name: 'Fetching entities from Yext', status: 'completed', data: { error: error instanceof Error ? error.message : 'Failed to fetch entities' } });
            // Continue without entities if fetch fails
          }
        }

        // Step 1: Expand seeds
        sendUpdate('step', { step: 1, name: 'Expanding seed keywords', status: 'running' });
        const seedsResult = await expandSeeds({ 
          brand, 
          vertical, 
          region: genericContent ? undefined : region 
        });
        sendUpdate('step', { step: 1, name: 'Expanding seed keywords', status: 'completed', data: seedsResult });
        sendUpdate('data', { seeds: seedsResult.seeds });

        // Step 2: Fetch PAA questions from SERPapi
        sendUpdate('step', { step: 2, name: 'Fetching People Also Ask', status: 'running' });
        const paaResult = await fetchPAA({ 
          seeds: seedsResult.seeds, 
          location: genericContent ? undefined : region, 
          hl: 'en' 
        });
        sendUpdate('step', { step: 2, name: 'Fetching People Also Ask', status: 'completed', data: paaResult });
        sendUpdate('data', { paaRows: paaResult.rows });

        // Step 3: Rank questions
        sendUpdate('step', { step: 3, name: 'Ranking questions by opportunity', status: 'running' });
        const rankedResult = await rankQuestions({ brand, rows: paaResult.rows });
        sendUpdate('step', { step: 3, name: 'Ranking questions by opportunity', status: 'completed', data: rankedResult });
        sendUpdate('data', { rankedQuestions: rankedResult.top });

        // Step 4: Generate content based on user selection
        const selectedType = contentType;
        let generatedContent: any;
        
        sendUpdate('step', { step: 4, name: `Generating ${selectedType} content with AI`, status: 'running' });
        
        if (selectedType === 'FAQ') {
          const faqResult = await generateFAQJSON({ 
            brand, 
            region: genericContent ? undefined : region, 
            questions: rankedResult.top, 
            customInstructions,
            genericContent,
            useTemplate: finalSelectedEntityIds && finalSelectedEntityIds.length > 0,
          });
          generatedContent = faqResult.faqComponent;
          sendUpdate('step', { step: 4, name: `Generating ${selectedType} content with AI`, status: 'completed', data: faqResult });
          sendUpdate('data', { faqComponent: faqResult.faqComponent });
        } else if (selectedType === 'COMPARISON') {
          const comparisonResult = await generateComparisonJSON({ brand, vertical, region: genericContent ? undefined : region, questions: rankedResult.top, customInstructions });
          generatedContent = comparisonResult.comparisonComponent;
          sendUpdate('step', { step: 4, name: `Generating ${selectedType} content with AI`, status: 'completed', data: comparisonResult });
          sendUpdate('data', { comparisonComponent: comparisonResult.comparisonComponent });
        } else if (selectedType === 'BLOG') {
          const blogResult = await generateBlogJSON({ brand, vertical, region: genericContent ? undefined : region, questions: rankedResult.top, customInstructions });
          generatedContent = blogResult.blogComponent;
          sendUpdate('step', { step: 4, name: `Generating ${selectedType} content with AI`, status: 'completed', data: blogResult });
          sendUpdate('data', { blogComponent: blogResult.blogComponent });
        }

        // Step 5: Store draft(s)
        const isTemplate = (generatedContent as any)?.isTemplate || genericContent;
        if (finalSelectedEntityIds && finalSelectedEntityIds.length > 0 && selectedType === 'FAQ' && isTemplate) {
          // Multi-entity mode: create customized drafts for each entity
          sendUpdate('step', { step: 5, name: `Customizing content for ${finalSelectedEntityIds.length} entities`, status: 'running' });
          
          const draftIds: string[] = [];
          const entityDrafts: any[] = [];
          
          for (let i = 0; i < finalSelectedEntityIds.length; i++) {
            const entityId = finalSelectedEntityIds[i];
            sendUpdate('step', { 
              step: 5, 
              name: `Processing entity ${i + 1} of ${finalSelectedEntityIds.length}: ${entityId}`, 
              status: 'running' 
            });
            
            try {
              // Fetch entity details
              const entity = await getFAQEntity(entityId, yextApiKey, yextAccountId);
              
              if (!entity) {
                console.warn(`[run-demo-stream] Entity ${entityId} not found, skipping`);
                continue;
              }
              
              // Customize FAQ for this entity
              const customizedFAQ = customizeFAQForEntity(generatedContent, entity);
              
              // Store draft for this entity
              const entityDraft = await draftStorePut({
                brand,
                vertical,
                region: entity.address?.city || entity.geomodifier || region || 'Generic',
                contentType: selectedType,
                content: customizedFAQ,
                entityId,
              });
              
              draftIds.push(entityDraft.draftId);
              entityDrafts.push({
                entityId,
                entityName: entity.name,
                draftId: entityDraft.draftId,
              });
              
              sendUpdate('data', { 
                entityProcessed: {
                  entityId,
                  entityName: entity.name,
                  draftId: entityDraft.draftId,
                }
              });
            } catch (error) {
              console.error(`[run-demo-stream] Error processing entity ${entityId}:`, error);
              sendUpdate('data', {
                entityError: {
                  entityId,
                  error: error instanceof Error ? error.message : 'Unknown error',
                }
              });
            }
          }
          
          sendUpdate('step', { step: 5, name: 'Storing drafts', status: 'completed', data: { draftIds, entityDrafts } });
          sendUpdate('data', { 
            draftIds,
            entityDrafts,
            multiEntity: true,
          });
          
          sendUpdate('complete', { 
            draftIds,
            entityDrafts,
            multiEntity: true,
          });
        } else {
          // Single draft mode
          sendUpdate('step', { step: 5, name: 'Storing draft', status: 'running' });
          const draftResult = await draftStorePut({ 
            brand, 
            vertical, 
            region: region || 'Generic', 
            contentType: selectedType, 
            content: generatedContent 
          });
          sendUpdate('step', { step: 5, name: 'Storing draft', status: 'completed', data: draftResult });
          sendUpdate('data', { draftId: draftResult.draftId });

          sendUpdate('complete', { draftId: draftResult.draftId });
        }
        
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

