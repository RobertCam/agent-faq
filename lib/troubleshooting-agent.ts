import {
  expandTroubleshootingSeeds,
  fetchPAA,
  rankTroubleshootingIssues,
  generateTroubleshootingJSON,
  validateTroubleshootingFactual,
  draftStorePut,
} from './mcp-tools';

interface TroubleshootingWorkflowData {
  seeds: string[];
  paaRows: any[];
  rankedIssues: any[];
  troubleshootingComponent: any;
  validationResults?: any;
}

/**
 * Run the Troubleshooting article generation workflow
 * Orchestrates the MCP tools in sequence for troubleshooting content
 */
export async function runTroubleshootingAgent(params: {
  brand: string;
  vertical: string;
  region: string;
  customInstructions?: string;
}): Promise<{ draftId: string; logs: string[]; workflowData: TroubleshootingWorkflowData }> {
  const logs: string[] = [];
  const workflowData: TroubleshootingWorkflowData = {
    seeds: [],
    paaRows: [],
    rankedIssues: [],
    troubleshootingComponent: null,
  };
  
  try {
    logs.push('🚀 Starting Troubleshooting article generation workflow...');
    
    // Step 1: Expand troubleshooting seeds
    logs.push('📝 Step 1: Expanding troubleshooting seed keywords...');
    const seedsResult = await expandTroubleshootingSeeds({
      brand: params.brand,
      vertical: params.vertical,
      region: params.region,
    });
    logs.push(`✅ Generated ${seedsResult.seeds.length} troubleshooting seed queries`);
    workflowData.seeds = seedsResult.seeds;
    
    // Step 2: Fetch PAA with troubleshooting mode
    logs.push('🔍 Step 2: Fetching People Also Ask questions (troubleshooting mode)...');
    const paaResult = await fetchPAA({
      seeds: seedsResult.seeds,
      location: params.region,
      hl: 'en',
      troubleshootingMode: true,
    });
    logs.push(`✅ Fetched ${paaResult.rows.length} PAA questions`);
    workflowData.paaRows = paaResult.rows;
    
    // Step 3: Rank issues
    logs.push('📊 Step 3: Ranking issues by relevance and search volume...');
    const rankedResult = await rankTroubleshootingIssues({
      brand: params.brand,
      rows: paaResult.rows,
    });
    logs.push(`✅ Ranked ${rankedResult.top.length} top issues`);
    workflowData.rankedIssues = rankedResult.top;
    
    // Step 4: Generate Troubleshooting article
    logs.push('🤖 Step 4: Generating Troubleshooting article with AI...');
    const troubleshootingResult = await generateTroubleshootingJSON({
      brand: params.brand,
      vertical: params.vertical,
      region: params.region,
      issues: rankedResult.top,
      customInstructions: params.customInstructions,
    });
    logs.push(`✅ Generated troubleshooting article with ${troubleshootingResult.troubleshootingComponent.items.length} items`);
    workflowData.troubleshootingComponent = troubleshootingResult.troubleshootingComponent;
    
    // Step 5: Validate factual accuracy
    logs.push('✔️ Step 5: Validating factual accuracy...');
    const validationResult = await validateTroubleshootingFactual(
      troubleshootingResult.troubleshootingComponent.items
    );
    logs.push(`✅ Validation complete. ${validationResult.validatedItems.filter(item => item.factualConfidence === 'missing').length} items need manual review`);
    workflowData.validationResults = validationResult;
    
    // Update component with validated items
    workflowData.troubleshootingComponent.items = validationResult.validatedItems;
    
    // Step 6: Store draft
    logs.push('💾 Step 6: Storing draft...');
    const draftResult = await draftStorePut({
      brand: params.brand,
      vertical: params.vertical,
      region: params.region,
      contentType: 'TROUBLESHOOTING',
      content: workflowData.troubleshootingComponent,
    });
    logs.push(`✅ Draft stored with ID: ${draftResult.draftId}`);
    
    logs.push('🎉 Troubleshooting workflow complete!');
    
    return { draftId: draftResult.draftId, logs, workflowData };
  } catch (error) {
    logs.push(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

