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
} from './types';
import { getFAQEntity } from './yext-client';

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
  const { seeds, location, hl } = input;
  
  console.log(`[fetchPAA] Fetching PAA for ${seeds.length} seeds`);
  
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
  const { brand, region, questions, customInstructions, genericContent, useTemplate } = input;
  
  const mode = useTemplate ? 'template' : genericContent ? 'generic' : 'specific';
  console.log(`[generateFAQJSON] Generating FAQ (${mode} mode) for ${questions.length} questions${brand ? ` for ${brand}` : 'generic'}`);
  
  const questionList = questions.length > 0 
    ? questions.map((q, i) => `${i + 1}. ${q.question}`).join('\n')
    : 'Common questions about this business type';
  
  const brandContext = brand ? `for ${brand} ` : '';
  const brandSpecificity = brand ? `specific to ${brand} ` : '';
  
  let prompt = '';
  
  if (useTemplate || genericContent) {
    // Template/Generic mode - use placeholders
    prompt = `You are a content writer ${brandContext}creating FAQ content that will be customized for multiple locations.

Generate a concise, factual FAQ template based on these questions:
${questionList}

Requirements:
- Answer 5-8 of the best questions (prioritize commercial intent and general relevance)
- Each answer should be 2-3 sentences maximum
- Use placeholders for location-specific information: {{entityName}}, {{city}}, {{region}}, {{state}}, {{address}}
- Be factual, helpful, and ${brandSpecificity}applicable to any location
- Tone should be friendly and professional
- Answers should work across different cities and regions

Example placeholders:
- "Visit {{entityName}} at {{address}} in {{city}}"
- "We're located in {{city}}, {{state}}"
- "Contact {{entityName}} in {{city}} for more information"`;
  } else {
    // Specific mode - region-specific content
    prompt = `You are a content writer ${brandContext}in ${region}. 

Generate a concise, factual FAQ based on these questions:
${questionList}

Requirements:
- Answer 5-8 of the best questions (prioritize commercial notices and local relevance)
- Each answer should be 2-3 sentences maximum
- Be factual, helpful, and ${brandSpecificity}relevant to ${region}
- Tone should be friendly and professional`;
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
  const { brand, vertical, region, questions, customInstructions, genericContent, useTemplate } = input;
  
  const mode = useTemplate ? 'template' : genericContent ? 'generic' : 'specific';
  console.log(`[generateComparisonJSON] Generating comparison (${mode} mode) for ${questions.length} questions`);
  
  const questionList = questions.slice(0, 5).map((q, i) => `${i + 1}. ${q.question}`).join('\n');
  const brandContext = brand ? `for ${brand} ` : '';
  
  let prompt = '';
  
  if (useTemplate || genericContent) {
    // Template/Generic mode - use placeholders
    prompt = `You are a content writer ${brandContext}creating a product/service comparison that will be customized for multiple locations.

Analyze these questions and generate a comparison template:
${questionList}

Requirements:
- Create a comparison table format
- Identify the main competitor or alternative
- Compare 5-7 key factors (price, features, quality, convenience, etc.)
- Each comparison should have: Feature name, Your brand's value, Competitor's value
- Use placeholders for location-specific information: {{entityName}}, {{city}}, {{region}}, {{state}}, {{address}}
- Be factual and ${brandContext}applicable to any location
- Values should work across different cities and regions

Example placeholders:
- "Visit {{entityName}} at {{address}} in {{city}}"
- "We're located in {{city}}, {{state}}"
- "Contact {{entityName}} in {{city}} for more information"`;
  } else {
    // Specific mode - region-specific content
    prompt = `You are a content writer ${brandContext}in ${region}. 

Analyze these questions and generate a product/service comparison:
${questionList}

Requirements:
- Create a comparison table format
- Identify the main competitor or alternative
- Compare 5-7 key factors (price, features, quality, convenience, etc.)
- Each comparison should have: Feature name, Your brand's value, Competitor's value
- Be factual and specific
- Relevant to ${region}`;
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
  const { brand, vertical, region, questions, customInstructions, genericContent, useTemplate } = input;
  
  const mode = useTemplate ? 'template' : genericContent ? 'generic' : 'specific';
  console.log(`[generateBlogJSON] Generating blog (${mode} mode) for ${questions.length} questions`);
  
  const brandContext = brand ? `for ${brand} ` : '';
  
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
${questions.slice(0, 8).map((q, i) => `${i + 1}. ${q.question}`).join('\n')}

Requirements:
- Create 4-6 sections with headings and content
- Each section should have a heading (H2) and 2-3 paragraphs
- Use placeholders for location-specific information: {{entityName}}, {{city}}, {{region}}, {{state}}, {{address}}
- Write in a friendly, informative tone
- Include meta description (150 characters)
- Content should be ${brandContext}applicable to any location
- Sections should work across different cities and regions

Example placeholders:
- "Visit {{entityName}} at {{address}} in {{city}}"
- "We're located in {{city}}, {{state}}"
- "Contact {{entityName}} in {{city}} for more information"`;
    } else {
      // Specific mode - region-specific content
      blogPrompt = `You are a content writer ${brandContext}in ${region}. 

Title: ${title}

Questions to address:
${questions.slice(0, 8).map((q, i) => `${i + 1}. ${q.question}`).join('\n')}

Requirements:
- Create 4-6 sections with headings and content
- Each section should have a heading (H2) and 2-3 paragraphs
- Write in a friendly, informative tone
- Include meta description (150 characters)
- Relevant to ${region}`;
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
 * Helper function to extract entity information for placeholder replacement
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
  
  return { entityName, city, region, state, address, phone };
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
    .replace(/\{\{phone\}\}/g, placeholders.phone);
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

