import {
  expandSeeds,
  fetchPAA,
  rankQuestions,
  generateFAQJSON,
  draftStorePut,
} from './mcp-tools';

interface WorkflowData {
  seeds: string[];
  paaRows: any[];
  rankedQuestions: any[];
  faqComponent: any;
}

/**
 * Run the FAQ generation workflow
 * Orchestrates the MCP tools in sequence
 */
export async function runFAQAgent(params: {
  brand: string;
  vertical: string;
  region: string;
}): Promise<{ draftId: string; logs: string[]; workflowData: WorkflowData }> {
  const logs: string[] = [];
  const workflowData: WorkflowData = {
    seeds: [],
    paaRows: [],
    rankedQuestions: [],
    faqComponent: null,
  };
  
  try {
    logs.push('🚀 Starting FAQ generation workflow...');
    
    // Step 1: Expand seeds
    logs.push('📝 Step 1: Expanding seed keywords...');
    const seedsResult = await expandSeeds({
      brand: params.brand,
      vertical: params.vertical,
      region: params.region,
    });
    logs.push(`✅ Generated ${seedsResult.seeds.length} seed queries`);
    workflowData.seeds = seedsResult.seeds;
    
    // Step 2: Fetch PAA
    logs.push('🔍 Step 2: Fetching People Also Ask questions...');
    const paaResult = await fetchPAA({
      seeds: seedsResult.seeds,
      location: params.region,
      hl: 'en',
    });
    logs.push(`✅ Fetched ${paaResult.rows.length} PAA questions`);
    workflowData.paaRows = paaResult.rows;
    
    // Step 3: Rank questions
    logs.push('📊 Step 3: Ranking questions by opportunity...');
    const rankedResult = await rankQuestions({
      brand: params.brand,
      rows: paaResult.rows,
    });
    logs.push(`✅ Ranked ${rankedResult.top.length} top questions`);
    workflowData.rankedQuestions = rankedResult.top;
    
    // Step 4: Generate FAQ JSON
    logs.push('🤖 Step 4: Generating FAQ with AI...');
    const faqResult = await generateFAQJSON({
      brand: params.brand,
      region: params.region,
      questions: rankedResult.top,
    });
    logs.push(`✅ Generated FAQ with ${faqResult.faqComponent.items.length} items`);
    workflowData.faqComponent = faqResult.faqComponent;
    
    // Step 5: Store draft
    logs.push('💾 Step 5: Storing draft...');
    const draftResult = await draftStorePut({
      brand: params.brand,
      vertical: params.vertical,
      region: params.region,
      contentType: 'FAQ',
      content: faqResult.faqComponent,
    });
    logs.push(`✅ Draft stored with ID: ${draftResult.draftId}`);
    
    logs.push('🎉 Workflow complete!');
    
    return { draftId: draftResult.draftId, logs, workflowData };
  } catch (error) {
    logs.push(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}
