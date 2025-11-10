import { FAQComponentProps, ComparisonComponentProps, BlogComponentProps, YextFAQEntity, YextAPIResponse } from './types';

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
 * Convert blog sections to Lexical editor JSON format
 * Handles headings, paragraphs, and basic formatting
 */
function blogSectionsToLexicalJson(sections: Array<{ heading: string; content: string }>): any {
  const children: any[] = [];
  
  for (const section of sections) {
    // Add heading (H2)
    if (section.heading) {
      children.push({
        type: "heading",
        direction: "ltr",
        format: "",
        indent: 0,
        tag: "h2",
        children: [
          {
            type: "text",
            detail: 0,
            format: 1, // Bold
            mode: "normal",
            style: "",
            text: section.heading,
            version: 1
          }
        ],
        version: 1
      });
    }
    
    // Add content paragraphs
    if (section.content) {
      // Split content by double newlines to create multiple paragraphs
      const paragraphs = section.content.split(/\n\n+/).filter(p => p.trim());
      for (const paraText of paragraphs) {
        children.push({
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
              text: paraText.trim(),
              version: 1
            }
          ],
          version: 1
        });
      }
    }
    
    // Add spacing paragraph between sections
    children.push({
      type: "paragraph",
      format: "",
      indent: 0,
      children: [],
      version: 1
    });
  }
  
  return {
    json: {
      root: {
        type: "root",
        direction: "ltr",
        format: "",
        indent: 0,
        children,
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
 * Map ComparisonComponentProps to Yext Product Comparison entity format
 */
export function mapComparisonToYextEntity(
  comparisonContent: ComparisonComponentProps,
  fieldId: string = 'c_minigolfMadnessProductComparison'
): any {
  // Convert comparison items to features, pros, and cons
  const featureList: string[] = [];
  const pros: string[] = [];
  const cons: string[] = [];
  
  comparisonContent.items.forEach(item => {
    featureList.push(item.feature);
    if (item.brandValue && item.competitorValue) {
      // If brand value is better, it's a pro; if competitor is better, it's a con
      // Simple heuristic: if brandValue is longer/more detailed, it's likely better
      if (item.brandValue.length > item.competitorValue.length) {
        pros.push(`${item.feature}: ${item.brandValue}`);
      } else {
        cons.push(`${item.feature}: ${item.competitorValue} (competitor advantage)`);
      }
    }
  });
  
  // Create product comparison entry
  const productComparison = {
    productName: comparisonContent.brand || 'Product',
    description: textToLexicalJson(
      `Comparison of ${comparisonContent.brand || 'our product'} vs ${comparisonContent.competitor || 'competitor'} in ${comparisonContent.category}${comparisonContent.region ? ` (${comparisonContent.region})` : ''}.`
    ),
    featureList: featureList.slice(0, 10), // Limit to 10 features
    pros: pros.slice(0, 5), // Limit to 5 pros
    cons: cons.slice(0, 5), // Limit to 5 cons
    rating: textToLexicalJson('Based on feature comparison analysis'),
    // Note: image, price, and cta are optional and can be added later if needed
  };
  
  return {
    [fieldId]: [productComparison], // Array format as per Yext structure
  };
}

/**
 * Map BlogComponentProps to Yext Blog entity format
 */
export function mapBlogToYextEntity(
  blogContent: BlogComponentProps,
  fieldId: string = 'c_minigolfMandnessBlogs'
): any {
  // Calculate read time (rough estimate: 200 words per minute)
  const totalWords = blogContent.sections.reduce((sum, section) => {
    return sum + (section.content?.split(/\s+/).length || 0);
  }, 0);
  const readTime = Math.max(1, Math.ceil(totalWords / 200));
  
  // Convert sections to Lexical JSON for bodyContent
  const bodyContent = blogSectionsToLexicalJson(blogContent.sections);
  
  // Create blog entry
  const blogEntry = {
    title: blogContent.title,
    authorName: blogContent.brand || 'Content Team',
    publishDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
    summary: textToLexicalJson(blogContent.metaDescription),
    bodyContent: bodyContent,
    tags: [
      blogContent.vertical,
      ...(blogContent.region ? [blogContent.region] : []),
      ...(blogContent.brand ? [blogContent.brand] : []),
    ].filter(Boolean),
    readTime: readTime.toString(),
    // Note: heroImage and cta are optional and can be added later if needed
  };
  
  return {
    [fieldId]: [blogEntry], // Array format as per Yext structure
  };
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

/**
 * Update a Comparison entity in Yext Knowledge Graph
 */
export async function updateComparisonEntity(
  entityId: string,
  comparisonContent: ComparisonComponentProps,
  fieldId: string = 'c_minigolfMadnessProductComparison',
  apiKey?: string,
  accountId?: string
): Promise<YextAPIResponse> {
  try {
    const { apiKey: finalApiKey, accountId: finalAccountId } = getYextCredentials(apiKey, accountId);
    const version = getCurrentVersion();

    // Map our comparison content to Yext format
    const yextEntity = mapComparisonToYextEntity(comparisonContent, fieldId);

    const url = `${YEXT_API_BASE}/accounts/${finalAccountId}/entities/${entityId}?v=${version}&api_key=${finalApiKey}`;

    console.log(`[yext-client] Updating Comparison entity ${entityId} in account ${finalAccountId}`);
    console.log(`[yext-client] Comparison items: ${comparisonContent.items.length}`);
    console.log(`[yext-client] Using field ID: ${fieldId}`);

    // Check if field exists
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
      
      const errorMessage = errorMessages.toLowerCase();
      if (errorMessage.includes('field') && (errorMessage.includes('not exist') || errorMessage.includes('not found'))) {
        console.warn(`[yext-client] Field ${fieldId} may need to be created in Yext schema first`);
        throw new Error(`Field ${fieldId} does not exist on entity. Please ensure the field is defined in your Yext schema.`);
      }
      
      throw new Error(`Yext API error: ${errorMessages}`);
    }

    if (data.meta.errors && data.meta.errors.length > 0) {
      const errorMessages = data.meta.errors.map(e => e.message).join(', ');
      throw new Error(`Yext API errors: ${errorMessages}`);
    }

    console.log(`[yext-client] Successfully updated Comparison entity ${entityId}`);
    return data;
  } catch (error) {
    console.error('[yext-client] Error updating Comparison entity:', error);
    throw error;
  }
}

/**
 * Update a Blog entity in Yext Knowledge Graph
 */
export async function updateBlogEntity(
  entityId: string,
  blogContent: BlogComponentProps,
  fieldId: string = 'c_minigolfMandnessBlogs',
  apiKey?: string,
  accountId?: string
): Promise<YextAPIResponse> {
  try {
    const { apiKey: finalApiKey, accountId: finalAccountId } = getYextCredentials(apiKey, accountId);
    const version = getCurrentVersion();

    // Map our blog content to Yext format
    const yextEntity = mapBlogToYextEntity(blogContent, fieldId);

    const url = `${YEXT_API_BASE}/accounts/${finalAccountId}/entities/${entityId}?v=${version}&api_key=${finalApiKey}`;

    console.log(`[yext-client] Updating Blog entity ${entityId} in account ${finalAccountId}`);
    console.log(`[yext-client] Blog sections: ${blogContent.sections.length}`);
    console.log(`[yext-client] Using field ID: ${fieldId}`);

    // Check if field exists
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
      
      const errorMessage = errorMessages.toLowerCase();
      if (errorMessage.includes('field') && (errorMessage.includes('not exist') || errorMessage.includes('not found'))) {
        console.warn(`[yext-client] Field ${fieldId} may need to be created in Yext schema first`);
        throw new Error(`Field ${fieldId} does not exist on entity. Please ensure the field is defined in your Yext schema.`);
      }
      
      throw new Error(`Yext API error: ${errorMessages}`);
    }

    if (data.meta.errors && data.meta.errors.length > 0) {
      const errorMessages = data.meta.errors.map(e => e.message).join(', ');
      throw new Error(`Yext API errors: ${errorMessages}`);
    }

    console.log(`[yext-client] Successfully updated Blog entity ${entityId}`);
    return data;
  } catch (error) {
    console.error('[yext-client] Error updating Blog entity:', error);
    throw error;
  }
}
