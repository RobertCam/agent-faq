import { NextRequest } from 'next/server';
import { draftStoreGet, yextGetEntity, yextUpdateEntity } from '@/lib/mcp-tools';
import { renderContentForEntity } from '@/lib/content-preview';
import { getDefaultFieldId } from '@/lib/constants';
import { resolveYextCredentialsFromSources } from '@/lib/yext-credentials';
import { ContentType } from '@/lib/types';

function verifyFieldContent(
  entity: any,
  fieldId: string,
  contentType: ContentType
): { verified: boolean; detail: string } {
  const field = entity[fieldId];
  if (field === undefined || field === null) {
    return { verified: false, detail: 'Field not present on entity after update' };
  }

  if (contentType === 'FAQ') {
    const faqs = field.faqs ?? field;
    const count = Array.isArray(faqs) ? faqs.length : 0;
    return {
      verified: count > 0,
      detail: count > 0 ? `${count} FAQ item(s) verified in Yext` : 'FAQ field empty after update',
    };
  }

  if (contentType === 'COMPARISON' || contentType === 'BLOG') {
    const hasContent = Array.isArray(field) ? field.length > 0 : !!field;
    return {
      verified: hasContent,
      detail: hasContent ? 'Field content verified in Yext' : 'Field empty after update',
    };
  }

  return { verified: true, detail: 'Update completed' };
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const body = await req.json();
  const { draftId, content, yextApiKey, yextAccountId } = body;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`));
      };

      try {
        if (!draftId) {
          send('error', { message: 'Missing draftId' });
          controller.close();
          return;
        }

        const { draft } = await draftStoreGet({ draftId });
        const credentials = resolveYextCredentialsFromSources(
          { yextApiKey, yextAccountId },
          draft.runContext
        );
        const templateContent = content || draft.content;
        const entityIds = draft.runContext?.selectedEntityIds || [];
        const fieldId = draft.fieldId || draft.runContext?.fieldId || getDefaultFieldId(draft.contentType);
        const total = entityIds.length;

        if (total === 0) {
          send('error', { message: 'No entities selected for this draft' });
          controller.close();
          return;
        }

        const entityMeta = new Map(
          (draft.runContext?.selectedEntities || []).map((e) => [e.id, e])
        );

        send('start', {
          total,
          fieldId,
          entities: entityIds.map((id) => {
            const meta = entityMeta.get(id);
            return { entityId: id, entityName: meta?.name, city: meta?.city };
          }),
        });

        const results: any[] = [];

        for (let i = 0; i < entityIds.length; i++) {
          const entityId = entityIds[i];
          const meta = entityMeta.get(entityId);
          const displayName = meta?.name || entityId;

          send('progress', {
            index: i + 1,
            total,
            entityId,
            entityName: meta?.name,
            status: 'publishing',
            message: `Publishing to ${displayName}...`,
          });

          try {
            const { entity } = await yextGetEntity({
              entityId,
              yextApiKey: credentials.yextApiKey,
              yextAccountId: credentials.yextAccountId,
            });
            const customized = renderContentForEntity(draft.contentType, templateContent, entity);

            const updateResult = await yextUpdateEntity({
              entityId,
              contentType: draft.contentType,
              content: customized,
              fieldId,
              yextApiKey: credentials.yextApiKey,
              yextAccountId: credentials.yextAccountId,
            });

            send('progress', {
              index: i + 1,
              total,
              entityId,
              entityName: entity.name,
              status: 'verifying',
              message: `Verifying ${entity.name || entityId}...`,
            });

            const { entity: updatedEntity } = await yextGetEntity({
              entityId,
              yextApiKey: credentials.yextApiKey,
              yextAccountId: credentials.yextAccountId,
            });
            const verification = verifyFieldContent(updatedEntity, fieldId, draft.contentType);

            const result = {
              entityId,
              entityName: entity.name,
              success: verification.verified,
              uuid: updateResult.uuid,
              verification: verification.detail,
              error: verification.verified ? undefined : verification.detail,
            };
            results.push(result);

            send('entity_complete', { ...result, index: i + 1, total });
          } catch (error) {
            const result = {
              entityId,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
            results.push(result);
            send('entity_complete', { ...result, index: i + 1, total });
          }
        }

        const succeeded = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;

        send('complete', {
          success: failed === 0,
          message: `Published and verified ${succeeded} of ${total} entities`,
          results,
          summary: { total, succeeded, failed },
        });

        controller.close();
      } catch (error) {
        send('error', { message: error instanceof Error ? error.message : 'Unknown error' });
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
