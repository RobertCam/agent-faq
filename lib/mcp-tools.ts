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
} from './types';

// In-memory draft storage
const drafts = new Map<string, Draft>();

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
  const allSeeds = [...new Set([...templates, ...regionVariations])];
  
  console.log(`[expandSeeds] Generated ${allSeeds.length} seed queries`);
  
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
  
  for (const [, row] of uniqueQuestions) {
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
 * Tool 4: Generate FAQ JSON using OpenAI
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
 * Tool 5: Draft store - Put
 */
export async function draftStorePut(input: DraftStorePutInput): Promise<{ draftId: string }> {
  const { brand, vertical, region, faqComponent } = input;
  
  const draftId = `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const draft: Draft = {
    id: draftId,
    brand,
    vertical,
    region,
    faqComponent,
    createdAt: new Date().toISOString(),
  };
  
  drafts.set(draftId, draft);
  
  console.log(`[draftStorePut] Stored draft ${draftId}`);
  
  return { draftId };
}

/**
 * Tool 5: Draft store - Get
 */
export async function draftStoreGet(input: DraftStoreGetInput): Promise<{ draft: Draft }> {
  const { draftId } = input;
  
  const draft = drafts.get(draftId);
  
  if (!draft) {
    throw new Error(`Draft ${draftId} not found`);
  }
  
  console.log(`[draftStoreGet] Retrieved draft ${draftId}`);
  
  return { draft };
}

