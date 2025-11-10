import { FAQComponentProps, YextFAQEntity, YextAPIResponse } from './types';

const YEXT_API_BASE = 'https://api.yextapis.com/v2';

/**
 * Yext API client for managing FAQ entities in Knowledge Graph
 */

/**
 * Get Yext API credentials from parameters or environment variables (fallback)
 */
function getYextCredentials(apiKey?: string, accountId?: string) {
  const finalApiKey = apiKey || process.env.YEXT_API_KEY;
  const finalAccountId = accountId || process.env.YEXT_ACCOUNT_ID;

  if (!finalApiKey) {
    throw new Error('Yext API Key is required. Please provide it in the request or set YEXT_API_KEY environment variable.');
  }
  if (!finalAccountId) {
    throw new Error('Yext Account ID is required. Please provide it in the request or set YEXT_ACCOUNT_ID environment variable.');
  }

  return { apiKey: finalApiKey, accountId: finalAccountId };
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
export async function listEntities(
  entityType?: string, 
  limit: number = 50,
  apiKey?: string,
  accountId?: string
): Promise<any[]> {
  try {
    const { apiKey: finalApiKey, accountId: finalAccountId } = getYextCredentials(apiKey, accountId);
    const version = getCurrentVersion();

    let url = `${YEXT_API_BASE}/accounts/${finalAccountId}/entities?v=${version}&api_key=${finalApiKey}&limit=${limit}`;
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
export async function getFAQEntity(
  entityId: string,
  apiKey?: string,
  accountId?: string
): Promise<YextFAQEntity | null> {
  try {
    const { apiKey: finalApiKey, accountId: finalAccountId } = getYextCredentials(apiKey, accountId);
    const version = getCurrentVersion();

    const url = `${YEXT_API_BASE}/accounts/${finalAccountId}/entities/${entityId}?v=${version}&api_key=${finalApiKey}`;

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
 * Check if a field exists on an entity
 */
async function checkFieldExists(
  entityId: string,
  fieldId: string,
  apiKey: string,
  accountId: string
): Promise<boolean> {
  try {
    const version = getCurrentVersion();
    const url = `${YEXT_API_BASE}/accounts/${accountId}/entities/${entityId}?v=${version}&api_key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return false;
    }

    const data: YextAPIResponse<any> = await response.json();
    const entity = data.response;
    
    // Check if the field exists on the entity
    return entity && fieldId in entity;
  } catch (error) {
    console.error('[yext-client] Error checking field existence:', error);
    return false;
  }
}

/**
 * Update an FAQ entity in Yext Knowledge Graph
 * If the field doesn't exist, it will be created automatically by Yext API
 */
export async function updateFAQEntity(
  entityId: string,
  faqContent: FAQComponentProps,
  fieldId: string = 'c_minigolfMadness_locations_faqSection',
  apiKey?: string,
  accountId?: string
): Promise<YextAPIResponse> {
  try {
    const { apiKey: finalApiKey, accountId: finalAccountId } = getYextCredentials(apiKey, accountId);
    const version = getCurrentVersion();

    // Map our FAQ content to Yext format
    const yextEntity = mapFAQToYextEntity(faqContent, fieldId);

    const url = `${YEXT_API_BASE}/accounts/${finalAccountId}/entities/${entityId}?v=${version}&api_key=${finalApiKey}`;

    console.log(`[yext-client] Updating FAQ entity ${entityId} in account ${finalAccountId}`);
    console.log(`[yext-client] FAQ items count: ${faqContent.items.length}`);
    console.log(`[yext-client] Using field ID: ${fieldId}`);

    // Check if field exists (optional - Yext API will create it if it doesn't exist)
    const fieldExists = await checkFieldExists(entityId, fieldId, finalApiKey, finalAccountId);
    if (!fieldExists) {
      console.log(`[yext-client] Field ${fieldId} does not exist on entity ${entityId}, will be created on update`);
    }

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
      
      // Check if error is about field not existing - Yext should auto-create, but handle gracefully
      const errorMessage = errorMessages.toLowerCase();
      if (errorMessage.includes('field') && (errorMessage.includes('not exist') || errorMessage.includes('not found'))) {
        console.warn(`[yext-client] Field ${fieldId} may need to be created in Yext schema first`);
        throw new Error(`Field ${fieldId} does not exist on entity. Please ensure the field is defined in your Yext schema, or the field will be created automatically if your account allows custom field creation.`);
      }
      
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
