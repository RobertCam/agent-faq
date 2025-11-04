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
  TroubleshootingComponentProps,
  TroubleshootingItem,
  GenerateTroubleshootingInput,
  RankTroubleshootingIssuesInput,
  RankedIssue,
  FactualConfidence,
  TroubleshootingSource,
} from './types';

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
  
  // Generate seed variations using templates
  const templates = [
    `${brand} ${vertical} ${region}`,
    `${brand} near me ${region}`,
    `best ${vertical} ${region}`,
    `${brand} hours ${region}`,
    `${brand} menu ${region}`,
    `${vertical} delivery ${region}`,
    `${brand} location ${region}`,
    `where to find ${brand} ${region}`,
    `${brand} reviews ${region}`,
    `order from ${brand} ${region}`,
    `${brand} phone number ${region}`,
    `${vertical} near ${region}`,
    `${brand} address ${region}`,
    `how to find ${brand} ${region}`,
    `${brand} contact ${region}`,
  ];

  // Add variations with "in [region]"
  const regionVariations = templates.map(t => t.replace(region, `in ${region}`));
  
  // Combine and deduplicate
  const allSeeds = Array.from(new Set([...templates, ...regionVariations]));
  
  console.log(`[expandSeeds] Generated ${allSeeds.length} seed queries`);
  
  return { seeds: allSeeds };
}

/**
 * Tool 2: Fetch People Also Ask questions
 */
export async function fetchPAA(input: FetchPAAInput): Promise<{ rows: PAARow[] }> {
  const { seeds, location, hl, troubleshootingMode } = input;
  
  console.log(`[fetchPAA] Fetching PAA for ${seeds.length} seeds${troubleshootingMode ? ' (troubleshooting mode)' : ''}`);
  
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
        const row: PAARow = {
          question: item.question || '',
          snippet: item.snippet || '',
          title: item.title || '',
          link: item.link,
        };
        
        // In troubleshooting mode, we can extract additional metadata
        // if available in the response
        if (troubleshootingMode && item.link) {
          // Store link for source citation
          row.link = item.link;
        }
        
        allRows.push(row);
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
    // - Non-brand questions are better (avoid duplication)
    const isBranded = row.question.toLowerCase().includes(brand.toLowerCase());
    if (!isBranded) {
      score += 20;
      reasoning.push('Non-branded question');
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
  const { brand, region, questions, customInstructions } = input;
  
  console.log(`[generateFAQJSON] Generating FAQ for ${questions.length} questions`);
  
  const questionList = questions.map((q, i) => `${i + 1}. ${q.question}`).join('\n');
  
  let prompt = `You are a content writer for ${brand} in ${region}. 

Generate a concise, factual FAQ based on these questions:
${questionList}

Requirements:
- Answer 5-8 of the best questions (prioritize commercial notices and local relevance)
- Each answer should be 2-3 sentences maximum
- Be factual, helpful, and specific to ${brand} in ${region}
- Tone should be friendly and professional`;

  if (customInstructions) {
    prompt += `\n\nAdditional instructions:\n${customInstructions}`;
  }

  prompt += `\n\nReturn ONLY a JSON object with this exact structure:
{
  "items": [
    {
      "question": "The question text",
      "answer": "The answer text"
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
      region,
      items,
      schemaOrg,
    };
    
    console.log(`[generateFAQJSON] Generated FAQ with ${items.length} items`);
    
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
  const { brand, vertical, region, questions, customInstructions } = input;
  
  console.log(`[generateComparisonJSON] Generating comparison for ${questions.length} questions`);
  
  const questionList = questions.slice(0, 5).map((q, i) => `${i + 1}. ${q.question}`).join('\n');
  
  let prompt = `You are a content writer for ${brand} in ${vertical}. 

Analyze these questions and generate a product/service comparison:
${questionList}

Requirements:
- Create a comparison table format
- Identify the main competitor or alternative
- Compare 5-7 key factors (price, features, quality, convenience, etc.)
- Each comparison should have: Feature name, Your brand's value, Competitor's value
- Be factual and specific

Return ONLY a JSON object with this exact structure:
{
  "competitor": "Competitor name or alternative",
  "items": [
    {
      "feature": "Feature name",
      "brandValue": "Value for your brand",
      "competitorValue": "Value for competitor"
    }
  ]
}`;

  if (customInstructions) {
    prompt += `\n\nAdditional instructions:\n${customInstructions}`;
  }

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
      region,
      items,
      schemaOrg,
    };
    
    console.log(`[generateComparisonJSON] Generated comparison with ${items.length} features`);
    
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
  const { brand, vertical, region, questions, customInstructions } = input;
  
  console.log(`[generateBlogJSON] Generating blog for ${questions.length} questions`);
  
  // Generate article title from questions
  const titlePrompt = `Generate a compelling blog post title based on these questions about ${brand} in ${vertical}:
${questions.slice(0, 5).map(q => q.question).join('\n')}`;
  
  try {
    const titleCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: titlePrompt }],
      temperature: 0.8,
    });
    
    const title = titleCompletion.choices[0].message.content || `${brand} in ${region}: Everything You Need to Know`;
    
    // Generate article structure
    let blogPrompt = `You are a content writer. Create a detailed blog article about ${brand} in ${vertical} (${region}).

Title: ${title}

Questions to address:
${questions.slice(0, 8).map((q, i) => `${i + 1}. ${q.question}`).join('\n')}

Requirements:
- Create 4-6 sections with headings and content
- Each section should have a heading (H2) and 2-3 paragraphs
- Write in a friendly, informative tone
- Include meta description (150 characters)

Return ONLY a JSON object with this structure:
{
  "metaDescription": "SEO meta description",
  "sections": [
    {
      "heading": "Section heading",
      "content": "Section content (2-3 paragraphs)",
      "order": 1
    }
  ]
}`;

    if (customInstructions) {
      blogPrompt += `\n\nAdditional instructions:\n${customInstructions}`;
    }
    
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
      region,
      metaDescription: generated.metaDescription || title,
      sections,
      schemaOrg,
    };
    
    console.log(`[generateBlogJSON] Generated blog with ${sections.length} sections`);
    
    return { blogComponent };
  } catch (error) {
    console.error('[generateBlogJSON] Error:', error);
    throw error;
  }
}

/**
 * Tool: Expand troubleshooting seeds - Generate troubleshooting-specific keyword variations
 */
export async function expandTroubleshootingSeeds(input: ExpandSeedsInput): Promise<{ seeds: string[] }> {
  const { brand, vertical, region } = input;
  
  // Generate troubleshooting-specific seed variations
  const templates = [
    `${brand} problems`,
    `${brand} issues`,
    `${brand} not working`,
    `${brand} error`,
    `${brand} fix`,
    `how to fix ${brand}`,
    `${brand} troubleshooting`,
    `${brand} support`,
    `${brand} help`,
    `${brand} broken`,
    `${brand} not responding`,
    `${brand} won't work`,
    `${brand} issue ${region}`,
    `${brand} problem ${region}`,
    `${brand} fix ${region}`,
    `how to fix ${brand} ${region}`,
    `${brand} troubleshooting ${region}`,
    `${brand} support ${region}`,
  ];

  // Add variations with "in [region]"
  const regionVariations = templates.map(t => t.replace(region, `in ${region}`));
  
  // Combine and deduplicate
  const allSeeds = Array.from(new Set([...templates, ...regionVariations]));
  
  console.log(`[expandTroubleshootingSeeds] Generated ${allSeeds.length} troubleshooting seed queries`);
  
  return { seeds: allSeeds };
}

/**
 * Tool: Rank troubleshooting issues from SERPs
 */
export async function rankTroubleshootingIssues(input: RankTroubleshootingIssuesInput): Promise<{ top: RankedIssue[] }> {
  const { brand, rows } = input;
  
  console.log(`[rankTroubleshootingIssues] Ranking ${rows.length} issues`);
  
  // Deduplicate by question
  const uniqueQuestions = new Map<string, PAARow>();
  for (const row of rows) {
    if (!uniqueQuestions.has(row.question.toLowerCase())) {
      uniqueQuestions.set(row.question.toLowerCase(), row);
    }
  }
  
  // Score each issue
  const ranked: RankedIssue[] = [];
  
  for (const row of Array.from(uniqueQuestions.values())) {
    let score = 0;
    const reasoning: string[] = [];
    let issueType: string | undefined;
    
    // Score criteria:
    // - Problem/solution intent keywords (high weight)
    const problemKeywords = /\b(problem|issue|error|broken|not working|won't|fix|troubleshoot|support|help)\b/i;
    const hasProblemIntent = problemKeywords.test(row.question);
    if (hasProblemIntent) {
      score += 30;
      reasoning.push('Problem/solution intent');
    }
    
    // - Brand specificity
    const isBranded = row.question.toLowerCase().includes(brand.toLowerCase());
    if (isBranded) {
      score += 20;
      reasoning.push('Brand-specific issue');
    }
    
    // - Technical issue keywords
    if (/\b(error|crash|bug|glitch|defect|malfunction)\b/i.test(row.question)) {
      score += 15;
      reasoning.push('Technical issue');
      issueType = 'technical';
    }
    
    // - Service/billing keywords
    if (/\b(billing|payment|charge|refund|cancel|account)\b/i.test(row.question)) {
      score += 15;
      reasoning.push('Service/billing issue');
      issueType = issueType || 'billing';
    }
    
    // - Solution clarity from snippet
    if (row.snippet && row.snippet.length > 50) {
      score += 10;
      reasoning.push('Clear snippet available');
    }
    
    // - Has solution keywords in snippet
    if (row.snippet && /\b(fix|solution|resolve|repair|troubleshoot|step)\b/i.test(row.snippet)) {
      score += 10;
      reasoning.push('Solution-oriented snippet');
    }
    
    ranked.push({
      ...row,
      score,
      reasoning: reasoning.join(', '),
      issueType: issueType || 'general',
    });
  }
  
  // Sort by score descending
  ranked.sort((a, b) => b.score - a.score);
  
  // Return top 15 for troubleshooting (more issues than FAQs)
  const top = ranked.slice(0, 15);
  
  console.log(`[rankTroubleshootingIssues] Top ${top.length} issues selected`);
  
  return { top };
}

/**
 * Tool: Generate Troubleshooting JSON using OpenAI
 */
export async function generateTroubleshootingJSON(input: GenerateTroubleshootingInput): Promise<{ troubleshootingComponent: TroubleshootingComponentProps }> {
  const { brand, vertical, region, issues, customInstructions } = input;
  
  console.log(`[generateTroubleshootingJSON] Generating troubleshooting article for ${issues.length} issues`);
  
  const issueList = issues.map((q, i) => `${i + 1}. ${q.question}${q.snippet ? ` (Context: ${q.snippet})` : ''}`).join('\n');
  
  let prompt = `You are a technical support writer creating a troubleshooting article for ${brand} in ${vertical}${region ? ` (${region})` : ''}.

Analyze these common issues from search results:
${issueList}

Requirements:
- Generate 8-12 troubleshooting items (problem-solution pairs)
- Each item should have:
  * A clear issue description
  * A concise solution overview
  * Step-by-step instructions (2-4 steps) when applicable
- Be factual and specific - only provide information that can be verified
- If you cannot provide a factual solution, mark confidence as "missing"
- Assign confidence levels: "high" (verifiable from sources), "medium" (likely but uncertain), "low" (speculative), "missing" (cannot verify)
- Include source citations when available (URLs from search results)
- Support category should be relevant to the issues (e.g., "Technical Support", "Account Issues", "Service Problems")
- Generate a clear, descriptive title

Return ONLY a JSON object with this exact structure:
{
  "title": "Troubleshooting article title",
  "supportCategory": "Category name",
  "items": [
    {
      "issue": "Issue description",
      "solution": "Solution overview",
      "steps": ["Step 1", "Step 2"],
      "factualConfidence": "high|medium|low|missing",
      "sources": [
        {
          "url": "Source URL if available",
          "snippet": "Relevant snippet"
        }
      ]
    }
  ]
}`;

  if (customInstructions) {
    prompt += `\n\nAdditional instructions:\n${customInstructions}`;
  }

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
    const items: TroubleshootingItem[] = (generated.items || []).map((item: any) => {
      // Ensure steps is an array of strings (Puck will handle this correctly)
      let steps: string[] = [];
      if (Array.isArray(item.steps)) {
        steps = item.steps.map((step: any) => typeof step === 'string' ? step : step.step || step.toString());
      }
      
      return {
        issue: item.issue || '',
        solution: item.solution || '',
        steps: steps,
        factualConfidence: (item.factualConfidence || 'missing') as FactualConfidence,
        sources: item.sources || [],
      };
    });
    
    // Generate breadcrumbs
    const breadcrumbs = [
      { label: 'Home', url: '/' },
      { label: 'Support', url: '/support' },
      { label: generated.supportCategory || 'Troubleshooting', url: undefined },
      { label: brand, url: undefined },
    ];
    
    // Generate Schema.org structured data
    const schemaOrg = {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: generated.title,
      about: {
        '@type': 'Thing',
        name: `${brand} Troubleshooting`,
      },
      provider: {
        '@type': 'Organization',
        name: brand,
      },
    };
    
    const troubleshootingComponent: TroubleshootingComponentProps = {
      title: generated.title || `Troubleshooting ${brand} Issues`,
      brand,
      vertical,
      region,
      supportCategory: generated.supportCategory || 'Technical Support',
      breadcrumbs,
      sitemapPriority: 0.7, // Default priority for troubleshooting articles
      items,
      schemaOrg,
    };
    
    console.log(`[generateTroubleshootingJSON] Generated troubleshooting article with ${items.length} items`);
    
    return { troubleshootingComponent };
  } catch (error) {
    console.error('[generateTroubleshootingJSON] Error:', error);
    throw error;
  }
}

/**
 * Tool: Validate troubleshooting factual accuracy
 */
export async function validateTroubleshootingFactual(items: TroubleshootingItem[]): Promise<{ validatedItems: TroubleshootingItem[] }> {
  console.log(`[validateTroubleshootingFactual] Validating ${items.length} items`);
  
  const validatedItems: TroubleshootingItem[] = items.map(item => {
    // If item already has sources and high confidence, keep as is
    if (item.factualConfidence === 'high' && item.sources && item.sources.length > 0) {
      return item;
    }
    
    // If item has no sources or low confidence, mark for review
    if (!item.sources || item.sources.length === 0) {
      return {
        ...item,
        factualConfidence: item.factualConfidence || 'missing',
      };
    }
    
    // If sources exist but confidence is not high, keep current confidence
    return item;
  });
  
  console.log(`[validateTroubleshootingFactual] Validation complete`);
  
  return { validatedItems };
}

/**
 * Tool 8: Draft store - Put
 */
export async function draftStorePut(input: DraftStorePutInput): Promise<{ draftId: string }> {
  const { brand, vertical, region, contentType, content } = input;
  
  const draftId = `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const draft: Draft = {
    id: draftId,
    brand,
    vertical,
    region,
    contentType,
    content,
    createdAt: new Date().toISOString(),
  };
  
  const drafts = getDraftsMap();
  drafts.set(draftId, draft);
  
  console.log(`[draftStorePut] Stored draft ${draftId} (type: ${contentType})`);
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

