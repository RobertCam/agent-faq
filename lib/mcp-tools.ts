import { getJson } from 'serpapi';
import OpenAI from 'openai';
import {
  ExpandSeedsInput,
  FetchPAAInput,
  RankQuestionsInput,
  GenerateFAQInput,
  PAARow,
  RankedQuestion,
  FAQComponentProps,
  FAQItem,
  SchemaOrgFAQ,
  DraftStorePutInput,
  DraftStoreGetInput,
  Draft,
  ContentType,
  RecommendContentTypeInput,
  ContentRecommendation,
  ComparisonComponentProps,
  BlogComponentProps,
  GenerateComparisonInput,
  GenerateBlogInput,
  YextListEntitiesInput,
  YextListEntitiesOutput,
  YextGetEntityInput,
  YextGetEntityOutput,
  YextUpdateEntityInput,
  YextUpdateEntityOutput,
  YextCheckFieldInput,
  YextCheckFieldOutput,
  YextGetFieldSchemaInput,
  YextGetFieldSchemaOutput,
} from './types';
import { 
  getFAQEntity, 
  listEntities, 
  updateFAQEntity, 
  updateComparisonEntity, 
  updateBlogEntity,
  checkFieldExists
} from './yext-client';
import { getMockPAAData } from './mock-data';

// In-memory draft storage
// Use globalThis to persist across hot reloads in dev mode
function getDraftsMap(): Map<string, Draft> {
  if (!(globalThis as any).__draftsStore) {
    (globalThis as any).__draftsStore = new Map<string, Draft>();
  }
  return (globalThis as any).__draftsStore;
}

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * Tool 1: Expand seeds - Generate keyword variations
 */
export async function expandSeeds(input: ExpandSeedsInput): Promise<{ seeds: string[] }> {
  const { brand, vertical, region } = input;
  
  // Generate seed variations - with or without brand and region
  const templates: string[] = [];
  
  if (region) {
    // Region-specific templates
    if (brand) {
      // Brand-specific templates with region
      templates.push(
        `${brand} ${vertical} ${region}`,
        `${brand} near me ${region}`,
        `${brand} hours ${region}`,
        `${brand} menu ${region}`,
        `${brand} location ${region}`,
        `where to find ${brand} ${region}`,
        `${brand} reviews ${region}`,
        `order from ${brand} ${region}`,
        `${brand} phone number ${region}`,
        `${brand} address ${region}`,
        `how to find ${brand} ${region}`,
        `${brand} contact ${region}`
      );
    }
    
    // Generic templates with region
    templates.push(
      `best ${vertical} ${region}`,
      `${vertical} delivery ${region}`,
      `${vertical} near ${region}`,
      `${vertical} ${region}`,
      `top ${vertical} ${region}`,
      `${vertical} services ${region}`,
      `find ${vertical} ${region}`,
      `${vertical} options ${region}`,
      `${vertical} information ${region}`,
      `about ${vertical} ${region}`
    );

    // Add variations with "in [region]"
    const regionVariations = templates.map(t => t.replace(region, `in ${region}`));
    templates.push(...regionVariations);
  } else {
    // Generic content mode - no region-specific seeds
    if (brand) {
      templates.push(
        `${brand} ${vertical}`,
        `${brand} near me`,
        `${brand} hours`,
        `${brand} menu`,
        `${brand} location`,
        `where to find ${brand}`,
        `${brand} reviews`,
        `order from ${brand}`,
        `${brand} phone number`,
        `${brand} address`,
        `how to find ${brand}`,
        `${brand} contact`
      );
    }
    
    templates.push(
      `best ${vertical}`,
      `${vertical} delivery`,
      `${vertical} near me`,
      `${vertical}`,
      `top ${vertical}`,
      `${vertical} services`,
      `find ${vertical}`,
      `${vertical} options`,
      `${vertical} information`,
      `about ${vertical}`,
      `what is ${vertical}`,
      `${vertical} guide`,
      `${vertical} tips`,
      `${vertical} help`
    );
  }
  
  // Combine and deduplicate
  const allSeeds = Array.from(new Set(templates));
  
  console.log(`[expandSeeds] Generated ${allSeeds.length} seed queries${brand ? ` for ${brand}` : 'generic'}${region ? ` in ${region}` : ' (generic mode)'}`);
  
  return { seeds: allSeeds };
}

/**
 * Tool 2: Fetch People Also Ask questions
 */
export async function fetchPAA(input: FetchPAAInput): Promise<{ rows: PAARow[] }> {
  const { seeds, location, hl, testMode } = input;
  
  console.log(`[fetchPAA] Fetching PAA for ${seeds.length} seeds${testMode ? ' (TEST MODE - using mock data)' : ''}`);
  
  // Use mock data if testMode is enabled
  if (testMode) {
    const mockRows = getMockPAAData(seeds);
    console.log(`[fetchPAA] Returning ${mockRows.length} mock PAA rows`);
    return { rows: mockRows };
  }
  
  const allRows: PAARow[] = [];
  
  // Fetch PAA for each seed (limit to first 5 to avoid rate limits in POC)
  for (const seed of seeds.slice(0, 5)) {
    try {
      const response = await getJson({
        engine: 'google',
        q: seed,
        api_key: process.env.SERPAPI_KEY,
        location: location,
        hl: hl || 'en',
      });
      
      const peopleAlsoAsk = response.related_questions || [];
      
      for (const item of peopleAlsoAsk) {
        allRows.push({
          question: item.question || '',
          snippet: item.snippet || '',
          title: item.title || '',
          link: item.link,
        });
      }
      
      console.log(`[fetchPAA] Fetched ${peopleAlsoAsk.length} questions for "${seed}"`);
      
      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`[fetchPAA] Error fetching PAA for "${seed}":`, error);
    }
  }
  
  console.log(`[fetchPAA] Total PAA rows collected: ${allRows.length}`);
  
  return { rows: allRows };
}

/**
 * Tool 3: Rank and score questions
 */
export async function rankQuestions(input: RankQuestionsInput): Promise<{ top: RankedQuestion[] }> {
  const { brand, rows } = input;
  
  console.log(`[rankQuestions] Ranking ${rows.length} questions`);
  
  // Deduplicate by question
  const uniqueQuestions = new Map<string, PAARow>();
  for (const row of rows) {
    if (!uniqueQuestions.has(row.question.toLowerCase())) {
      uniqueQuestions.set(row.question.toLowerCase(), row);
    }
  }
  
  // Score each question
  const ranked: RankedQuestion[] = [];
  
  for (const row of Array.from(uniqueQuestions.values())) {
    let score = 0;
    const reasoning: string[] = [];
    
    // Score criteria:
    // - Non-brand questions are better (avoid duplication) - only if brand is provided
    if (brand) {
      const isBranded = row.question.toLowerCase().includes(brand.toLowerCase());
      if (!isBranded) {
        score += 20;
        reasoning.push('Non-branded question');
      }
    } else {
      // Without brand, all questions are equally valid
      score += 10;
      reasoning.push('Generic question');
    }
    
    // - Local intent ("near me", "in [region]")
    const hasLocalIntent = /\b(near|in|local|find|where|location)\b/i.test(row.question);
    if (hasLocalIntent) {
      score += 15;
      reasoning.push('Local intent');
    }
    
    // - Commercial intent ("best", "order", "buy", "hours", "delivery")
    const hasCommercialIntent = /\b(best|order|buy|hours|delivery|delicious|menu|price)\b/i.test(row.question);
    if (hasCommercialIntent) {
      score += 10;
      reasoning.push('Commercial intent');
    }
    
    // - Question quality (has snippet)
    if (row.snippet && row.snippet.length > 50) {
      score += 5;
      reasoning.push('Quality snippet');
    }
    
    ranked.push({
      ...row,
      score,
      reasoning: reasoning.join(', '),
    });
  }
  
  // Sort by score descending
  ranked.sort((a, b) => b.score - a.score);
  
  // Return top 10
  const top = ranked.slice(0, 10);
  
  console.log(`[rankQuestions] Top 10 questions selected`);
  
  return { top };
}

/**
 * Tool 4: Recommend content type based on PAA data
 */
export async function recommendContentType(input: RecommendContentTypeInput): Promise<ContentRecommendation> {
  const { brand, vertical, region, paaRows } = input;
  
  console.log(`[recommendContentType] Analyzing ${paaRows.length} PAA questions`);
  
  // Analyze question patterns to determine content type
  const questions = paaRows.map(row => row.question.toLowerCase());
  
  // Keywords for each content type
  const faqKeywords = ['what', 'when', 'where', 'how', 'why', 'who', 'can i', 'do they', 'does', 'is there'];
  const comparisonKeywords = ['vs', 'versus', 'or', 'better', 'which', 'difference', 'compare', 'verses'];
  const blogKeywords = ['how to', 'guide', 'tips', 'tutorial', 'steps', 'ways to', 'how do'];
  
  let faqScore = 0;
  let comparisonScore = 0;
  let blogScore = 0;
  
  for (const question of questions) {
    // Check for FAQ patterns
    if (faqKeywords.some(k => question.includes(k))) {
      faqScore += 2;
    }
    
    // Check for comparison patterns
    if (comparisonKeywords.some(k => question.includes(k))) {
      comparisonScore += 3; // Higher weight for comparisons
    }
    
    // Check for blog patterns
    if (blogKeywords.some(k => question.includes(k))) {
      blogScore += 2;
    }
  }
  
  // Determine recommended type(s)
  const scores = [
    { type: 'FAQ' as ContentType, score: faqScore },
    { type: 'COMPARISON' as ContentType, score: comparisonScore },
    { type: 'BLOG' as ContentType, score: blogScore },
  ];
  
  // Sort by score
  scores.sort((a, b) => b.score - a.score);
  
  const primaryType = scores[0].type;
  const primaryScore = scores[0].score;
  const secondaryScore = scores[1].score;
  
  // Calculate confidence
  const confidence = Math.min(0.95, primaryScore / (questions.length * 2));
  
  // Determine if we should generate multiple content types
  // If secondary score is within 30% of primary, generate both
  const shouldGenerateSecondary = primaryScore > 0 && secondaryScore >= primaryScore * 0.7;
  
  let reasoning = '';
  const secondaryTypes: ContentType[] = [];
  
  if (primaryType === 'COMPARISON') {
    reasoning = 'Questions show strong comparison intent with keywords like "vs", "better", "which"';
    if (shouldGenerateSecondary && scores[1].score > 0) {
      secondaryTypes.push(scores[1].type);
      reasoning += `. Also detected ${scores[1].type.toLowerCase()} patterns for supplementary content.`;
    }
  } else if (primaryType === 'BLOG') {
    reasoning = 'Questions show tutorial/how-to intent with actionable keywords';
    if (shouldGenerateSecondary && scores[1].score > 0) {
      secondaryTypes.push(scores[1].type);
      reasoning += `. Also detected ${scores[1].type.toLowerCase()} patterns for supplementary content.`;
    }
  } else {
    reasoning = 'Questions are primarily informational and best suited for FAQ format';
    if (shouldGenerateSecondary && scores[1].score > 0) {
      secondaryTypes.push(scores[1].type);
      reasoning += `. Also detected ${scores[1].type.toLowerCase()} patterns for supplementary content.`;
    }
  }
  
  const keyInsights = [
    `Discovered ${questions.length} distinct questions`,
    `Primary: ${primaryType} (${Math.round((primaryScore / (questions.length * 2)) * 100)}% relevance)`,
    secondaryTypes.length > 0 
      ? `Secondary: ${secondaryTypes.join(', ')} (${Math.round((secondaryScore / (questions.length * 2)) * 100)}% relevance)`
      : `Single content type recommended`,
  ];
  
  console.log(`[recommendContentType] Recommended: ${primaryType}${secondaryTypes.length > 0 ? ` + ${secondaryTypes.join(', ')}` : ''}`);
  
  return {
    primaryType,
    secondaryTypes: secondaryTypes.length > 0 ? secondaryTypes : undefined,
    confidence,
    reasoning,
    keyInsights,
  };
}

/**
 * Tool 5: Generate FAQ JSON using OpenAI
 */
export async function generateFAQJSON(input: GenerateFAQInput): Promise<{ faqComponent: FAQComponentProps }> {
  const { brand, region, questions, customInstructions, genericContent, useTemplate, entityData } = input;
  
  const mode = useTemplate ? 'template' : genericContent ? 'generic' : 'specific';
  console.log(`[generateFAQJSON] Generating FAQ (${mode} mode) for ${questions.length} questions${brand ? ` for ${brand}` : 'generic'}${entityData ? ' with entity context' : ''}`);
  
  const questionList = questions.length > 0 
    ? questions.map((q, i) => `${i + 1}. ${q.question}`).join('\n')
    : 'Common questions about this business type';
  
  const brandContext = brand ? `for ${brand} ` : '';
  const brandSpecificity = brand ? `specific to ${brand} ` : '';
  
  // Get available placeholders from entity data
  const availablePlaceholders = getAvailablePlaceholders(entityData);
  const placeholderList = availablePlaceholders.map(p => `{{${p}}}`).join(', ');
  
  // Build entity context string if entityData is provided
  let entityContext = '';
  if (entityData) {
    const placeholders = getEntityPlaceholders(entityData);
    const contextParts: string[] = [];
    
    if (placeholders.hours) {
      contextParts.push(`Hours: ${placeholders.hours}`);
    }
    if (placeholders.amenities) {
      contextParts.push(`Amenities: ${placeholders.amenities}`);
    }
    if (placeholders.services) {
      contextParts.push(`Services: ${placeholders.services}`);
    }
    if (placeholders.description) {
      contextParts.push(`Description: ${placeholders.description.substring(0, 200)}`);
    }
    
    if (contextParts.length > 0) {
      entityContext = `\n\nEntity Context:\n${contextParts.join('\n')}\n\nUse this information to make the FAQs more relevant and specific.`;
    }
  }
  
  let prompt = '';
  
  if (useTemplate || genericContent) {
    // Template/Generic mode - use placeholders
    prompt = `You are a content writer ${brandContext}creating FAQ content that will be customized for multiple locations.

Generate a concise, factual FAQ template based on these questions:
${questionList}${entityContext}

Requirements:
- Answer 5-8 of the best questions (prioritize commercial intent and general relevance)
- Each answer should be 2-3 sentences maximum
- Use placeholders for location-specific information: ${placeholderList}
- Be factual, helpful, and ${brandSpecificity}applicable to any location
- Tone should be friendly and professional
- Answers should work across different cities and regions
${entityData ? `- Available placeholders: ${placeholderList} (use these when relevant)` : ''}

Example placeholders:
- "Visit {{entityName}} at {{address}} in {{city}}"
- "We're located in {{city}}, {{state}}"
- "Contact {{entityName}} in {{city}} for more information"${entityData && availablePlaceholders.includes('hours') ? '\n- "Our hours are {{hours}}"' : ''}${entityData && availablePlaceholders.includes('amenities') ? '\n- "We offer {{amenities}}"' : ''}`;
  } else {
    // Specific mode - region-specific content
    prompt = `You are a content writer ${brandContext}in ${region}. 

Generate a concise, factual FAQ based on these questions:
${questionList}${entityContext}

Requirements:
- Answer 5-8 of the best questions (prioritize commercial notices and local relevance)
- Each answer should be 2-3 sentences maximum
- Be factual, helpful, and ${brandSpecificity}relevant to ${region}
- Tone should be friendly and professional${entityData ? `\n- Use entity context information when relevant to make answers more specific` : ''}`;
  }

  if (customInstructions) {
    prompt += `\n\nAdditional instructions:\n${customInstructions}`;
  }

  prompt += `\n\nReturn ONLY a JSON object with this exact structure:
{
  "items": [
    {
      "question": "The question text",
      "answer": "The answer text (may include placeholders like {{city}} or {{entityName}})"
    }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });
    
    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }
    
    const generated = JSON.parse(responseContent);
    const items: FAQItem[] = generated.items || [];
    
    // Generate Schema.org JSON-LD
    const schemaOrg: SchemaOrgFAQ = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: items.map(item => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    };
    
    const faqComponent: FAQComponentProps = {
      brand,
      region: region || 'Generic',
      items,
      schemaOrg,
    };
    
    // Mark as template if using template mode
    if (useTemplate || genericContent) {
      (faqComponent as any).isTemplate = true;
    }
    
    console.log(`[generateFAQJSON] Generated FAQ with ${items.length} items (${mode} mode)`);
    
    return { faqComponent };
  } catch (error) {
    console.error('[generateFAQJSON] Error:', error);
    throw error;
  }
}

/**
 * Tool 6: Generate Comparison JSON
 */
export async function generateComparisonJSON(input: GenerateComparisonInput): Promise<{ comparisonComponent: ComparisonComponentProps }> {
  const { brand, vertical, region, questions, customInstructions, genericContent, useTemplate, entityData } = input;
  
  const mode = useTemplate ? 'template' : genericContent ? 'generic' : 'specific';
  console.log(`[generateComparisonJSON] Generating comparison (${mode} mode) for ${questions.length} questions${entityData ? ' with entity context' : ''}`);
  
  const questionList = questions.slice(0, 5).map((q, i) => `${i + 1}. ${q.question}`).join('\n');
  const brandContext = brand ? `for ${brand} ` : '';
  
  // Get available placeholders from entity data
  const availablePlaceholders = getAvailablePlaceholders(entityData);
  const placeholderList = availablePlaceholders.map(p => `{{${p}}}`).join(', ');
  
  // Build entity context string if entityData is provided
  let entityContext = '';
  if (entityData) {
    const placeholders = getEntityPlaceholders(entityData);
    const contextParts: string[] = [];
    
    if (placeholders.hours) {
      contextParts.push(`Hours: ${placeholders.hours}`);
    }
    if (placeholders.amenities) {
      contextParts.push(`Amenities: ${placeholders.amenities}`);
    }
    if (placeholders.services) {
      contextParts.push(`Services: ${placeholders.services}`);
    }
    if (placeholders.description) {
      contextParts.push(`Description: ${placeholders.description.substring(0, 200)}`);
    }
    
    if (contextParts.length > 0) {
      entityContext = `\n\nEntity Context:\n${contextParts.join('\n')}\n\nUse this information to make the comparison more relevant and specific.`;
    }
  }
  
  let prompt = '';
  
  if (useTemplate || genericContent) {
    // Template/Generic mode - use placeholders
    prompt = `You are a content writer ${brandContext}creating a product/service comparison that will be customized for multiple locations.

Analyze these questions and generate a comparison template:
${questionList}${entityContext}

Requirements:
- Create a comparison table format
- Identify the main competitor or alternative
- Compare 5-7 key factors (price, features, quality, convenience, etc.)
- Each comparison should have: Feature name, Your brand's value, Competitor's value
- Use placeholders for location-specific information: ${placeholderList}
- Be factual and ${brandContext}applicable to any location
- Values should work across different cities and regions
${entityData ? `- Available placeholders: ${placeholderList} (use these when relevant)` : ''}

Example placeholders:
- "Visit {{entityName}} at {{address}} in {{city}}"
- "We're located in {{city}}, {{state}}"
- "Contact {{entityName}} in {{city}} for more information"${entityData && availablePlaceholders.includes('hours') ? '\n- "Our hours are {{hours}}"' : ''}${entityData && availablePlaceholders.includes('amenities') ? '\n- "We offer {{amenities}}"' : ''}`;
  } else {
    // Specific mode - region-specific content
    prompt = `You are a content writer ${brandContext}in ${region}. 

Analyze these questions and generate a product/service comparison:
${questionList}${entityContext}

Requirements:
- Create a comparison table format
- Identify the main competitor or alternative
- Compare 5-7 key factors (price, features, quality, convenience, etc.)
- Each comparison should have: Feature name, Your brand's value, Competitor's value
- Be factual and specific
- Relevant to ${region}${entityData ? `\n- Use entity context information when relevant to make comparisons more specific` : ''}`;
  }

  if (customInstructions) {
    prompt += `\n\nAdditional instructions:\n${customInstructions}`;
  }
  
  prompt += `\n\nReturn ONLY a JSON object with this exact structure:
{
  "competitor": "Competitor name or alternative",
  "items": [
    {
      "feature": "Feature name (may include placeholders like {{city}} or {{entityName}})",
      "brandValue": "Value for your brand (may include placeholders)",
      "competitorValue": "Value for competitor"
    }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });
    
    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }
    
    const generated = JSON.parse(responseContent);
    const items = generated.items || [];
    
    const schemaOrg = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: `${brand} vs ${generated.competitor || 'Competitor'}`,
      category: vertical,
    };
    
    const comparisonComponent: ComparisonComponentProps = {
      brand,
      competitor: generated.competitor,
      category: vertical,
      region: region || 'Generic',
      items,
      schemaOrg,
    };
    
    // Mark as template if using template mode
    if (useTemplate || genericContent) {
      (comparisonComponent as any).isTemplate = true;
    }
    
    console.log(`[generateComparisonJSON] Generated comparison with ${items.length} features (${mode} mode)`);
    
    return { comparisonComponent };
  } catch (error) {
    console.error('[generateComparisonJSON] Error:', error);
    throw error;
  }
}

/**
 * Tool 7: Generate Blog JSON
 */
export async function generateBlogJSON(input: GenerateBlogInput): Promise<{ blogComponent: BlogComponentProps }> {
  const { brand, vertical, region, questions, customInstructions, genericContent, useTemplate, entityData } = input;
  
  const mode = useTemplate ? 'template' : genericContent ? 'generic' : 'specific';
  console.log(`[generateBlogJSON] Generating blog (${mode} mode) for ${questions.length} questions${entityData ? ' with entity context' : ''}`);
  
  const brandContext = brand ? `for ${brand} ` : '';
  
  // Get available placeholders from entity data
  const availablePlaceholders = getAvailablePlaceholders(entityData);
  const placeholderList = availablePlaceholders.map(p => `{{${p}}}`).join(', ');
  
  // Build entity context string if entityData is provided
  let entityContext = '';
  if (entityData) {
    const placeholders = getEntityPlaceholders(entityData);
    const contextParts: string[] = [];
    
    if (placeholders.hours) {
      contextParts.push(`Hours: ${placeholders.hours}`);
    }
    if (placeholders.amenities) {
      contextParts.push(`Amenities: ${placeholders.amenities}`);
    }
    if (placeholders.services) {
      contextParts.push(`Services: ${placeholders.services}`);
    }
    if (placeholders.description) {
      contextParts.push(`Description: ${placeholders.description.substring(0, 200)}`);
    }
    
    if (contextParts.length > 0) {
      entityContext = `\n\nEntity Context:\n${contextParts.join('\n')}\n\nUse this information to make the blog more relevant and specific.`;
    }
  }
  
  // Generate article title from questions
  const titlePrompt = `Generate a compelling blog post title based on these questions ${brandContext}in ${vertical}${region ? ` (${region})` : ''}:
${questions.slice(0, 5).map(q => q.question).join('\n')}`;
  
  try {
    const titleCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: titlePrompt }],
      temperature: 0.8,
    });
    
    const defaultTitle = brand 
      ? `${brand} in ${vertical}: Everything You Need to Know`
      : `${vertical}: Everything You Need to Know`;
    const title = titleCompletion.choices[0].message.content || defaultTitle;
    
    // Generate article structure
    let blogPrompt = '';
    
    if (useTemplate || genericContent) {
      // Template/Generic mode - use placeholders
      blogPrompt = `You are a content writer ${brandContext}creating a blog article that will be customized for multiple locations.

Title: ${title}

Questions to address:
${questions.slice(0, 8).map((q, i) => `${i + 1}. ${q.question}`).join('\n')}${entityContext}

Requirements:
- Create 4-6 sections with headings and content
- Each section should have a heading (H2) and 2-3 paragraphs
- Use placeholders for location-specific information: ${placeholderList}
- Write in a friendly, informative tone
- Include meta description (150 characters)
- Content should be ${brandContext}applicable to any location
- Sections should work across different cities and regions
${entityData ? `- Available placeholders: ${placeholderList} (use these when relevant)` : ''}

Example placeholders:
- "Visit {{entityName}} at {{address}} in {{city}}"
- "We're located in {{city}}, {{state}}"
- "Contact {{entityName}} in {{city}} for more information"${entityData && availablePlaceholders.includes('hours') ? '\n- "Our hours are {{hours}}"' : ''}${entityData && availablePlaceholders.includes('amenities') ? '\n- "We offer {{amenities}}"' : ''}`;
    } else {
      // Specific mode - region-specific content
      blogPrompt = `You are a content writer ${brandContext}in ${region}. 

Title: ${title}

Questions to address:
${questions.slice(0, 8).map((q, i) => `${i + 1}. ${q.question}`).join('\n')}${entityContext}

Requirements:
- Create 4-6 sections with headings and content
- Each section should have a heading (H2) and 2-3 paragraphs
- Write in a friendly, informative tone
- Include meta description (150 characters)
- Relevant to ${region}${entityData ? `\n- Use entity context information when relevant to make content more specific` : ''}`;
    }

    if (customInstructions) {
      blogPrompt += `\n\nAdditional instructions:\n${customInstructions}`;
    }
    
    blogPrompt += `\n\nReturn ONLY a JSON object with this structure:
{
  "metaDescription": "SEO meta description (may include placeholders like {{city}} or {{entityName}})",
  "sections": [
    {
      "heading": "Section heading (may include placeholders)",
      "content": "Section content (2-3 paragraphs, may include placeholders like {{city}} or {{entityName}})",
      "order": 1
    }
  ]
}`;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: blogPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });
    
    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }
    
    const generated = JSON.parse(responseContent);
    const sections = (generated.sections || []).map((s: any, i: number) => ({
      ...s,
      order: s.order || i + 1,
    }));
    
    const schemaOrg = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: title,
      author: {
        '@type': 'Organization',
        name: brand,
      },
    };
    
    const blogComponent: BlogComponentProps = {
      title,
      brand,
      vertical,
      region: region || 'Generic',
      metaDescription: generated.metaDescription || title,
      sections,
      schemaOrg,
    };
    
    // Mark as template if using template mode
    if (useTemplate || genericContent) {
      (blogComponent as any).isTemplate = true;
    }
    
    console.log(`[generateBlogJSON] Generated blog with ${sections.length} sections (${mode} mode)`);
    
    return { blogComponent };
  } catch (error) {
    console.error('[generateBlogJSON] Error:', error);
    throw error;
  }
}

/**
 * Helper function to get list of available placeholders from entity data
 * Used to inform prompts about which placeholders can be used
 */
function getAvailablePlaceholders(entityData?: any): string[] {
  if (!entityData) {
    return ['entityName', 'city', 'region', 'state', 'address', 'phone'];
  }
  
  const placeholders: string[] = ['entityName', 'city', 'region', 'state', 'address', 'phone'];
  
  if (entityData.hours || entityData.c_hours) {
    placeholders.push('hours');
  }
  if (entityData.amenities || entityData.c_amenities) {
    placeholders.push('amenities');
  }
  if (entityData.services || entityData.c_services) {
    placeholders.push('services');
  }
  if (entityData.description || entityData.c_description) {
    placeholders.push('description');
  }
  if (entityData.website || entityData.c_website) {
    placeholders.push('website');
  }
  if (entityData.emails || entityData.c_email) {
    placeholders.push('email');
  }
  
  return placeholders;
}

/**
 * Helper function to extract entity information for placeholder replacement
 * Enhanced to extract more fields: hours, amenities, services, description, etc.
 */
function getEntityPlaceholders(entity: any) {
  const entityName = entity.name || 'our location';
  const city = entity.address?.city || entity.geomodifier || 'your area';
  const region = entity.address?.region || '';
  const state = entity.address?.region || '';
  const address = entity.address 
    ? `${entity.address.line1 || ''}${entity.address.line2 ? `, ${entity.address.line2}` : ''}, ${city}${region ? `, ${region}` : ''}${entity.address.postalCode ? ` ${entity.address.postalCode}` : ''}`.trim()
    : city;
  const phone = entity.localPhone || entity.mainPhone || '';
  
  // Extract hours (can be object or string)
  let hours = '';
  if (entity.hours) {
    if (typeof entity.hours === 'string') {
      hours = entity.hours;
    } else if (typeof entity.hours === 'object') {
      // Format hours object (e.g., { monday: { open: "9:00", close: "17:00" } })
      const hoursParts: string[] = [];
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      for (const day of days) {
        if (entity.hours[day]) {
          const dayHours = entity.hours[day];
          if (dayHours.open && dayHours.close) {
            hoursParts.push(`${day}: ${dayHours.open} - ${dayHours.close}`);
          } else if (dayHours.isClosed) {
            hoursParts.push(`${day}: Closed`);
          }
        }
      }
      hours = hoursParts.join(', ') || 'Hours vary';
    }
  }
  
  // Extract amenities (can be array or string)
  let amenities = '';
  if (entity.amenities) {
    if (Array.isArray(entity.amenities)) {
      amenities = entity.amenities.join(', ');
    } else if (typeof entity.amenities === 'string') {
      amenities = entity.amenities;
    }
  } else if (entity.c_amenities) {
    // Check for custom field
    if (Array.isArray(entity.c_amenities)) {
      amenities = entity.c_amenities.join(', ');
    } else if (typeof entity.c_amenities === 'string') {
      amenities = entity.c_amenities;
    }
  }
  
  // Extract services (can be array or string)
  let services = '';
  if (entity.services) {
    if (Array.isArray(entity.services)) {
      services = entity.services.join(', ');
    } else if (typeof entity.services === 'string') {
      services = entity.services;
    }
  } else if (entity.c_services) {
    // Check for custom field
    if (Array.isArray(entity.c_services)) {
      services = entity.c_services.join(', ');
    } else if (typeof entity.c_services === 'string') {
      services = entity.c_services;
    }
  }
  
  // Extract description
  const description = entity.description || entity.c_description || '';
  
  // Extract website/URL
  const website = entity.website || entity.c_website || '';
  
  // Extract email
  const email = entity.emails?.[0] || entity.c_email || '';
  
  return { 
    entityName, 
    city, 
    region, 
    state, 
    address, 
    phone,
    hours,
    amenities,
    services,
    description,
    website,
    email,
  };
}

/**
 * Replace placeholders in a string
 */
function replacePlaceholders(text: string, placeholders: ReturnType<typeof getEntityPlaceholders>): string {
  return text
    .replace(/\{\{entityName\}\}/g, placeholders.entityName)
    .replace(/\{\{city\}\}/g, placeholders.city)
    .replace(/\{\{region\}\}/g, placeholders.region)
    .replace(/\{\{state\}\}/g, placeholders.state)
    .replace(/\{\{address\}\}/g, placeholders.address)
    .replace(/\{\{phone\}\}/g, placeholders.phone)
    .replace(/\{\{hours\}\}/g, placeholders.hours)
    .replace(/\{\{amenities\}\}/g, placeholders.amenities)
    .replace(/\{\{services\}\}/g, placeholders.services)
    .replace(/\{\{description\}\}/g, placeholders.description)
    .replace(/\{\{website\}\}/g, placeholders.website)
    .replace(/\{\{email\}\}/g, placeholders.email);
}

/**
 * Customize FAQ content for a specific entity by replacing placeholders
 */
export function customizeFAQForEntity(
  faqContent: FAQComponentProps,
  entity: any
): FAQComponentProps {
  const placeholders = getEntityPlaceholders(entity);

  // Replace placeholders in FAQ items
  const customizedItems = faqContent.items.map(item => ({
    question: replacePlaceholders(item.question, placeholders),
    answer: replacePlaceholders(item.answer, placeholders),
  }));

  // Update schema.org
  const schemaOrg: SchemaOrgFAQ = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: customizedItems.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return {
    brand: faqContent.brand,
    region: placeholders.city,
    items: customizedItems,
    schemaOrg,
  };
}

/**
 * Customize Comparison content for a specific entity by replacing placeholders
 */
export function customizeComparisonForEntity(
  comparisonContent: ComparisonComponentProps,
  entity: any
): ComparisonComponentProps {
  const placeholders = getEntityPlaceholders(entity);

  // Replace placeholders in comparison items
  const customizedItems = comparisonContent.items.map(item => ({
    feature: replacePlaceholders(item.feature, placeholders),
    brandValue: replacePlaceholders(item.brandValue, placeholders),
    competitorValue: item.competitorValue ? replacePlaceholders(item.competitorValue, placeholders) : undefined,
  }));

  return {
    brand: comparisonContent.brand,
    competitor: comparisonContent.competitor,
    category: comparisonContent.category,
    region: placeholders.city,
    items: customizedItems,
    schemaOrg: comparisonContent.schemaOrg,
  };
}

/**
 * Customize Blog content for a specific entity by replacing placeholders
 */
export function customizeBlogForEntity(
  blogContent: BlogComponentProps,
  entity: any
): BlogComponentProps {
  const placeholders = getEntityPlaceholders(entity);

  // Replace placeholders in blog sections
  const customizedSections = blogContent.sections.map(section => ({
    heading: replacePlaceholders(section.heading, placeholders),
    content: replacePlaceholders(section.content, placeholders),
    order: section.order,
  }));

  return {
    title: replacePlaceholders(blogContent.title, placeholders),
    brand: blogContent.brand,
    vertical: blogContent.vertical,
    region: placeholders.city,
    metaDescription: replacePlaceholders(blogContent.metaDescription, placeholders),
    sections: customizedSections,
    schemaOrg: blogContent.schemaOrg,
  };
}

/**
 * Tool 8: Draft store - Put
 */
export async function draftStorePut(input: DraftStorePutInput): Promise<{ draftId: string }> {
  const { brand, vertical, region, contentType, content, entityId } = input;
  
  const draftId = `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const draft: Draft = {
    id: draftId,
    brand,
    vertical,
    region,
    contentType,
    content,
    createdAt: new Date().toISOString(),
    entityId, // Store entityId if provided
  };
  
  const drafts = getDraftsMap();
  drafts.set(draftId, draft);
  
  console.log(`[draftStorePut] Stored draft ${draftId} (type: ${contentType})${entityId ? ` with entityId: ${entityId}` : ''}`);
  console.log(`[draftStorePut] Total drafts in storage: ${drafts.size}`);
  
  return { draftId };
}

/**
 * Tool 5: Draft store - Get
 */
export async function draftStoreGet(input: DraftStoreGetInput): Promise<{ draft: Draft }> {
  const { draftId } = input;
  const drafts = getDraftsMap();
  
  console.log(`[draftStoreGet] Looking for draft ${draftId}`);
  console.log(`[draftStoreGet] Total drafts in storage: ${drafts.size}`);
  console.log(`[draftStoreGet] All draft IDs: ${Array.from(drafts.keys()).join(', ')}`);
  
  const draft = drafts.get(draftId);
  
  if (!draft) {
    throw new Error(`Draft ${draftId} not found`);
  }
  
  console.log(`[draftStoreGet] Retrieved draft ${draftId}`);
  
  return { draft };
}

/**
 * Yext MCP Tool 1: List entities from Yext
 */
export async function yextListEntities(input: YextListEntitiesInput): Promise<YextListEntitiesOutput> {
  const { entityType, limit = 50, yextApiKey, yextAccountId } = input;
  
  console.log(`[yextListEntities] Listing entities${entityType ? ` of type ${entityType}` : ''}...`);
  
  try {
    const entities = await listEntities(entityType, limit, yextApiKey, yextAccountId);
    
    // Transform to minimal format for selection
    const minimalEntities = entities.map((entity: any) => ({
      id: entity.id || entity.meta?.id,
      name: entity.name || 'Unnamed Entity',
      entityType: entity.meta?.entityType || entity.entityType || 'unknown',
      address: entity.address ? {
        city: entity.address.city,
        region: entity.address.region,
        line1: entity.address.line1,
      } : undefined,
    }));
    
    return {
      entities: minimalEntities,
      total: minimalEntities.length,
    };
  } catch (error) {
    console.error('[yextListEntities] Error:', error);
    throw error;
  }
}

/**
 * Yext MCP Tool 2: Get entity with available fields
 */
export async function yextGetEntity(input: YextGetEntityInput): Promise<YextGetEntityOutput> {
  const { entityId, yextApiKey, yextAccountId } = input;
  
  console.log(`[yextGetEntity] Fetching entity ${entityId}...`);
  
  try {
    const entity = await getFAQEntity(entityId, yextApiKey, yextAccountId);
    
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }
    
    // Extract available field IDs from entity
    const availableFields: string[] = [];
    for (const key in entity) {
      if (key !== 'meta' && typeof entity[key] !== 'function') {
        availableFields.push(key);
      }
    }
    
    return {
      entity,
      availableFields,
    };
  } catch (error) {
    console.error('[yextGetEntity] Error:', error);
    throw error;
  }
}

/**
 * Yext MCP Tool 3: Update entity (unified for all content types)
 */
export async function yextUpdateEntity(input: YextUpdateEntityInput): Promise<YextUpdateEntityOutput> {
  const { entityId, contentType, content, fieldId, yextApiKey, yextAccountId } = input;
  
  console.log(`[yextUpdateEntity] Updating ${contentType} entity ${entityId}...`);
  
  try {
    let result;
    let defaultFieldId: string;
    
    if (contentType === 'FAQ') {
      defaultFieldId = 'c_minigolfMadness_locations_faqSection';
      const targetFieldId = fieldId || defaultFieldId;
      result = await updateFAQEntity(
        entityId,
        content as FAQComponentProps,
        targetFieldId,
        yextApiKey,
        yextAccountId
      );
    } else if (contentType === 'COMPARISON') {
      defaultFieldId = 'c_minigolfMadnessProductComparison';
      const targetFieldId = fieldId || defaultFieldId;
      result = await updateComparisonEntity(
        entityId,
        content as ComparisonComponentProps,
        targetFieldId,
        yextApiKey,
        yextAccountId
      );
    } else if (contentType === 'BLOG') {
      defaultFieldId = 'c_minigolfMandnessBlogs';
      const targetFieldId = fieldId || defaultFieldId;
      result = await updateBlogEntity(
        entityId,
        content as BlogComponentProps,
        targetFieldId,
        yextApiKey,
        yextAccountId
      );
    } else {
      throw new Error(`Unsupported content type: ${contentType}`);
    }
    
    const targetFieldId = fieldId || defaultFieldId!;
    
    return {
      success: true,
      entityId,
      fieldId: targetFieldId,
      uuid: result.meta.uuid,
      message: `Successfully updated ${contentType} entity ${entityId}`,
    };
  } catch (error) {
    console.error('[yextUpdateEntity] Error:', error);
    throw error;
  }
}

/**
 * Yext MCP Tool 4: Check if field exists on entity
 */
export async function yextCheckField(input: YextCheckFieldInput): Promise<YextCheckFieldOutput> {
  const { entityId, fieldId, yextApiKey, yextAccountId } = input;
  
  console.log(`[yextCheckField] Checking if field ${fieldId} exists on entity ${entityId}...`);
  
  try {
    const exists = await checkFieldExists(entityId, fieldId, yextApiKey, yextAccountId);
    
    return {
      exists,
      fieldId,
      entityId,
    };
  } catch (error) {
    console.error('[yextCheckField] Error:', error);
    throw error;
  }
}

/**
 * Yext MCP Tool 5: Get field schema for entity type
 * Note: Yext API may not have a direct schema endpoint, so we infer from entity structure
 */
export async function yextGetFieldSchema(input: YextGetFieldSchemaInput): Promise<YextGetFieldSchemaOutput> {
  const { entityType, fieldId, yextApiKey, yextAccountId } = input;
  
  console.log(`[yextGetFieldSchema] Getting field schema for entity type ${entityType}${fieldId ? `, field ${fieldId}` : ''}...`);
  
  try {
    // Fetch a sample entity of this type to infer schema
    const entities = await listEntities(entityType, 1, yextApiKey, yextAccountId);
    
    if (entities.length === 0) {
      throw new Error(`No entities found for type ${entityType}`);
    }
    
    const sampleEntity = entities[0];
    const fields: Array<{
      fieldId: string;
      type: string;
      displayName?: string;
      description?: string;
      required?: boolean;
    }> = [];
    
    // Infer field types from sample entity
    for (const key in sampleEntity) {
      if (key === 'meta' || typeof sampleEntity[key] === 'function') {
        continue;
      }
      
      // If fieldId is specified, only return that field
      if (fieldId && key !== fieldId) {
        continue;
      }
      
      const value = sampleEntity[key];
      let type = 'string';
      
      if (Array.isArray(value)) {
        type = 'list';
      } else if (typeof value === 'object' && value !== null) {
        // Check if it's Lexical JSON (has root property)
        if (value.root) {
          type = 'richText';
        } else {
          type = 'object';
        }
      } else if (typeof value === 'number') {
        type = 'number';
      } else if (typeof value === 'boolean') {
        type = 'boolean';
      }
      
      fields.push({
        fieldId: key,
        type,
        displayName: key.replace(/_/g, ' ').replace(/c_/g, '').replace(/\b\w/g, (l) => l.toUpperCase()),
      });
    }
    
    return {
      entityType,
      fields,
    };
  } catch (error) {
    console.error('[yextGetFieldSchema] Error:', error);
    throw error;
  }
}

