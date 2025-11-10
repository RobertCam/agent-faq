import { FAQComponentProps, YextFAQEntity, YextAPIResponse } from './types';

const YEXT_API_BASE = 'https://api.yextapis.com/v2';

/**
 * Yext API client for managing FAQ entities in Knowledge Graph
 */

/**
 * Get Yext API credentials from environment variables
 */
function getYextCredentials() {
  const apiKey = process.env.YEXT_API_KEY;
  const accountId = process.env.YEXT_ACCOUNT_ID;

  if (!apiKey) {
    throw new Error('YEXT_API_KEY environment variable is not set');
  }
  if (!accountId) {
    throw new Error('YEXT_ACCOUNT_ID environment variable is not set');
  }

  return { apiKey, accountId };
}

/**
 * Get current date in YYYYMMDD format for API version parameter
 */
function getCurrentVersion(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * List entities from Yext
 */
export async function listEntities(entityType?: string, limit: number = 50): Promise<any[]> {
  try {
    const { apiKey, accountId } = getYextCredentials();
    const version = getCurrentVersion();

    let url = `${YEXT_API_BASE}/accounts/${accountId}/entities?v=${version}&api_key=${apiKey}&limit=${limit}`;
    if (entityType) {
      url += `&entityTypes=${entityType}`;
    }

    console.log(`[yext-client] Listing entities${entityType ? ` of type ${entityType}` : ''}...`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Yext API error (${response.status}): ${errorText}`);
    }

    const data: YextAPIResponse<{ entities: any[] }> = await response.json();

    if (data.meta.errors && data.meta.errors.length > 0) {
      throw new Error(`Yext API errors: ${data.meta.errors.map(e => e.message).join(', ')}`);
    }

    const entities = data.response?.entities || [];
    console.log(`[yext-client] Found ${entities.length} entities`);
    
    return entities;
  } catch (error) {
    console.error('[yext-client] Error listing entities:', error);
    throw error;
  }
}

/**
 * Fetch an existing FAQ entity from Yext
 */
export async function getFAQEntity(entityId: string): Promise<YextFAQEntity | null> {
  try {
    const { apiKey, accountId } = getYextCredentials();
    const version = getCurrentVersion();

    const url = `${YEXT_API_BASE}/accounts/${accountId}/entities/${entityId}?v=${version}&api_key=${apiKey}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Entity not found
      }
      const errorText = await response.text();
      throw new Error(`Yext API error (${response.status}): ${errorText}`);
    }

    const data: YextAPIResponse<YextFAQEntity> = await response.json();

    if (data.meta.errors && data.meta.errors.length > 0) {
      throw new Error(`Yext API errors: ${data.meta.errors.map(e => e.message).join(', ')}`);
    }

    return data.response;
  } catch (error) {
    console.error('[yext-client] Error fetching FAQ entity:', error);
    throw error;
  }
}

/**
 * Convert plain text to Lexical editor JSON format
 */
function textToLexicalJson(text: string): any {
  return {
    json: {
      root: {
        type: "root",
        direction: "ltr",
        format: "",
        indent: 0,
        children: [
          {
            type: "paragraph",
            direction: "ltr",
            format: "",
            indent: 0,
            children: [
              {
                type: "text",
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
                text: text,
                version: 1
              }
            ],
            version: 1
          }
        ],
        version: 1
      }
    }
  };
}

/**
 * Map FAQComponentProps to Yext FAQ entity format
 * Uses the custom field structure specified by fieldId
 */
export function mapFAQToYextEntity(
  faqContent: FAQComponentProps,
  fieldId: string = 'c_minigolfMadness_locations_faqSection'
): Partial<YextFAQEntity> {
  // Map FAQ items to Yext format with Lexical JSON structure for answers
  const yextFAQs = faqContent.items.map(item => ({
    question: item.question,
    answer: textToLexicalJson(item.answer),
  }));

  // Build the entity structure using the specified custom field
  const entity: Partial<YextFAQEntity> = {
    [fieldId]: {
      faqs: yextFAQs,
    },
  };

  return entity;
}

/**
 * Update an FAQ entity in Yext Knowledge Graph
 */
export async function updateFAQEntity(
  entityId: string,
  faqContent: FAQComponentProps,
  fieldId: string = 'c_minigolfMadness_locations_faqSection'
): Promise<YextAPIResponse> {
  try {
    const { apiKey, accountId } = getYextCredentials();
    const version = getCurrentVersion();

    // Map our FAQ content to Yext format
    const yextEntity = mapFAQToYextEntity(faqContent, fieldId);

    const url = `${YEXT_API_BASE}/accounts/${accountId}/entities/${entityId}?v=${version}&api_key=${apiKey}`;

    console.log(`[yext-client] Updating FAQ entity ${entityId} in account ${accountId}`);
    console.log(`[yext-client] FAQ items count: ${faqContent.items.length}`);
    console.log(`[yext-client] Using field ID: ${fieldId}`);

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(yextEntity),
    });

    const responseText = await response.text();
    let data: YextAPIResponse;

    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Invalid JSON response from Yext API: ${responseText}`);
    }

    if (!response.ok) {
      const errorMessages = data.meta.errors
        ? data.meta.errors.map(e => e.message).join(', ')
        : `HTTP ${response.status}: ${responseText}`;
      throw new Error(`Yext API error: ${errorMessages}`);
    }

    if (data.meta.errors && data.meta.errors.length > 0) {
      const errorMessages = data.meta.errors.map(e => e.message).join(', ');
      throw new Error(`Yext API errors: ${errorMessages}`);
    }

    console.log(`[yext-client] Successfully updated FAQ entity ${entityId}`);
    return data;
  } catch (error) {
    console.error('[yext-client] Error updating FAQ entity:', error);
    throw error;
  }
}
