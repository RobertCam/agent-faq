'use client';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            AI-Driven Content Generator Documentation
          </h1>
          <p className="text-gray-600 mb-8">
            A proof-of-concept demonstrating scalable content automation using AI agent orchestration with Model Context Protocol (MCP) tools. Supports FAQ, Product Comparison, and Blog Article generation with full Yext Knowledge Graph integration.
          </p>

          {/* Table of Contents */}
          <div className="border-l-4 border-blue-500 pl-4 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Contents</h2>
            <ul className="space-y-1 text-gray-700">
              <li><a href="#overview" className="text-blue-600 hover:underline">Overview</a></li>
              <li><a href="#architecture" className="text-blue-600 hover:underline">Architecture</a></li>
              <li><a href="#mcp-tools" className="text-blue-600 hover:underline">MCP Tools</a></li>
              <li><a href="#yext-integration" className="text-blue-600 hover:underline">Yext Integration</a></li>
              <li><a href="#agent-workflow" className="text-blue-600 hover:underline">Agent Workflow</a></li>
              <li><a href="#data-flow" className="text-blue-600 hover:underline">Data Flow</a></li>
              <li><a href="#usage" className="text-blue-600 hover:underline">Usage & Integration</a></li>
            </ul>
          </div>

          {/* Overview */}
          <section id="overview" className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Overview</h2>
            <p className="text-gray-700 mb-4">
              This system automates the generation of multiple content types by:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
              <li>Accepting brand, vertical, region, and content type as input parameters</li>
              <li>Generating seed search queries using AI</li>
              <li>Fetching "People Also Ask" (PAA) questions from search results</li>
              <li>Ranking questions by commercial opportunity and relevance</li>
              <li>Generating content (FAQ, Comparison, or Blog) using OpenAI based on selected type</li>
              <li>Storing as drafts for review in a visual editor (PUCK)</li>
            </ol>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
              <p className="text-green-800 text-sm">
                <strong>Supported Content Types:</strong>
              </p>
              <ul className="list-disc list-inside text-sm text-green-800 mt-2 space-y-1">
                <li><strong>FAQ:</strong> Frequently Asked Questions with schema.org JSON-LD</li>
                <li><strong>Comparison:</strong> Product/service comparison tables</li>
                <li><strong>Blog:</strong> Informative articles with multiple sections</li>
              </ul>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <strong>Tech Stack:</strong> Next.js 14, TypeScript, OpenAI API, SerpAPI, Yext Knowledge Graph API, PUCK Editor, TailwindCSS
              </p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
              <p className="text-purple-800 text-sm">
                <strong>Yext Integration:</strong> Direct publishing to Yext Knowledge Graph with multi-entity support, template customization, and bulk operations
              </p>
            </div>
          </section>

          {/* Architecture */}
          <section id="architecture" className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Architecture</h2>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-4">
              <div className="flex flex-col space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Frontend (React/Next.js)</h3>
                    <p className="text-sm text-gray-600">User interface with real-time streaming updates</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <h3 className="font-semibold text-gray-900">API Routes</h3>
                    <p className="text-sm text-gray-600">Server-Sent Events (SSE) streaming endpoint for real-time workflow updates</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Agent Orchestration Layer</h3>
                    <p className="text-sm text-gray-600">Coordinates MCP tools in sequence</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <h3 className="font-semibold text-gray-900">MCP Tools</h3>
                    <p className="text-sm text-gray-600">Individual tools for specific operations</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <h3 className="font-semibold text-gray-900">External APIs</h3>
                    <p className="text-sm text-gray-600">OpenAI (content generation), SerpAPI (search data)</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* MCP Tools */}
          <section id="mcp-tools" className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">MCP Tools</h2>
            <p className="text-gray-700 mb-6">
              Model Context Protocol (MCP) tools are modular functions that encapsulate specific operations. Each tool has defined inputs and outputs.
            </p>

            {/* Tool 1: expand_seeds */}
            <div className="border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">1. expand_seeds</h3>
              <p className="text-gray-700 mb-4">Generates seed search queries based on brand, vertical, and region.</p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">Input:</p>
                <pre className="text-xs text-gray-700 overflow-x-auto">
{`{
  brand: string;
  vertical: string;
  region: string;
}`}
                </pre>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">Output:</p>
                <pre className="text-xs text-gray-700 overflow-x-auto">
{`{
  seeds: string[]  // Array of search queries
}`}
                </pre>
              </div>
              <p className="text-sm text-gray-600 mt-4"><strong>Usage:</strong> Creates diverse search queries for PAA discovery</p>
            </div>

            {/* Tool 2: fetch_paa */}
            <div className="border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">2. fetch_paa</h3>
              <p className="text-gray-700 mb-4">Fetches "People Also Ask" questions from Google Search via SerpAPI.</p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">Input:</p>
                <pre className="text-xs text-gray-700 overflow-x-auto">
{`{
  seeds: string[];
  location?: string;
  hl?: string;
}`}
                </pre>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">Output:</p>
                <pre className="text-xs text-gray-700 overflow-x-auto">
{`{
  rows: Array<{
    question: string;
    snippet: string;
    title: string;
    link?: string;
  }>
}`}
                </pre>
              </div>
              <p className="text-sm text-gray-600 mt-4"><strong>Usage:</strong> Discovers trending questions from search results</p>
            </div>

            {/* Tool 3: rank_questions */}
            <div className="border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">3. rank_questions</h3>
              <p className="text-gray-700 mb-4">Ranks questions by opportunity score using AI.</p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">Input:</p>
                <pre className="text-xs text-gray-700 overflow-x-auto">
{`{
  brand: string;
  rows: PAARow[];
}`}
                </pre>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">Output:</p>
                <pre className="text-xs text-gray-700 overflow-x-auto">
{`{
  top: Array<{
    question: string;
    score: number;
    reasoning: string;
  }>
}`}
                </pre>
              </div>
              <p className="text-sm text-gray-600 mt-4"><strong>Usage:</strong> Prioritizes high-value questions for FAQ inclusion</p>
            </div>

            {/* Tool 4: generate_faq_json */}
            <div className="border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">4. generate_faq_json</h3>
              <p className="text-gray-700 mb-4">Generates FAQ content using OpenAI with JSON mode.</p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">Input:</p>
                <pre className="text-xs text-gray-700 overflow-x-auto">
{`{
  brand: string;
  region: string;
  questions: RankedQuestion[];
  customInstructions?: string;
}`}
                </pre>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">Output:</p>
                <pre className="text-xs text-gray-700 overflow-x-auto">
{`{
  faqComponent: {
    brand: string;
    region: string;
    items: Array<{
      question: string;
      answer: string;
    }>;
    schemaOrg: SchemaOrgFAQ;  // JSON-LD for SEO
  }
}`}
                </pre>
              </div>
              <p className="text-sm text-gray-600 mt-4"><strong>Usage:</strong> Creates structured FAQ content with schema.org markup</p>
            </div>

            {/* Tool 5: generate_comparison_json */}
            <div className="border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">5. generate_comparison_json</h3>
              <p className="text-gray-700 mb-4">Generates product/service comparison content using OpenAI with JSON mode.</p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">Input:</p>
                <pre className="text-xs text-gray-700 overflow-x-auto">
{`{
  brand: string;
  vertical: string;
  region: string;
  questions: RankedQuestion[];
  customInstructions?: string;
}`}
                </pre>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">Output:</p>
                <pre className="text-xs text-gray-700 overflow-x-auto">
{`{
  comparisonComponent: {
    brand: string;
    competitor?: string;
    category: string;
    region?: string;
    items: Array<{
      feature: string;
      brandValue: string;
      competitorValue?: string;
    }>;
    schemaOrg: any;  // JSON-LD for SEO
  }
}`}
                </pre>
              </div>
              <p className="text-sm text-gray-600 mt-4"><strong>Usage:</strong> Creates structured comparison tables with feature comparisons</p>
            </div>

            {/* Tool 6: generate_blog_json */}
            <div className="border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">6. generate_blog_json</h3>
              <p className="text-gray-700 mb-4">Generates blog article content using OpenAI with JSON mode.</p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">Input:</p>
                <pre className="text-xs text-gray-700 overflow-x-auto">
{`{
  brand: string;
  vertical: string;
  region: string;
  questions: RankedQuestion[];
  customInstructions?: string;
}`}
                </pre>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">Output:</p>
                <pre className="text-xs text-gray-700 overflow-x-auto">
{`{
  blogComponent: {
    title: string;
    brand: string;
    vertical: string;
    region?: string;
    metaDescription: string;
    sections: Array<{
      heading: string;
      content: string;
      order: number;
    }>;
    schemaOrg: any;  // JSON-LD for SEO
  }
}`}
                </pre>
              </div>
              <p className="text-sm text-gray-600 mt-4"><strong>Usage:</strong> Creates structured blog articles with multiple sections</p>
            </div>

            {/* Tool 7: draft_store */}
            <div className="border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">7. draft_store (put/get)</h3>
              <p className="text-gray-700 mb-4">Manages draft storage and retrieval with support for multiple content types and multi-entity mode.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">put - Input:</p>
                  <pre className="text-xs text-gray-700 overflow-x-auto">
{`{
  brand: string;
  vertical: string;
  region: string;
  contentType: 'FAQ' | 
    'COMPARISON' | 
    'BLOG';
  content: FAQComponentProps |
    ComparisonComponentProps |
    BlogComponentProps;
}`}
                  </pre>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">get - Input:</p>
                  <pre className="text-xs text-gray-700 overflow-x-auto">
{`{
  draftId: string;
}`}
                  </pre>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">get - Output:</p>
                <pre className="text-xs text-gray-700 overflow-x-auto">
{`{
  draft: {
    id: string;
    brand: string;
    vertical: string;
    region: string;
    contentType: 'FAQ' | 'COMPARISON' | 'BLOG';
    content: any;  // Content component
    createdAt: string;
  }
}`}
                </pre>
              </div>
              <p className="text-sm text-gray-600 mt-4"><strong>Usage:</strong> In-memory storage for draft management (POC) using globalThis for persistence. Supports entityId metadata for Yext integration.</p>
            </div>

            {/* Tool 8: yext_list_entities */}
            <div className="border border-gray-200 rounded-lg p-6 mb-6 bg-purple-50">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">8. yext_list_entities</h3>
              <p className="text-gray-700 mb-4">Lists and filters entities from Yext Knowledge Graph.</p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">Input:</p>
                <pre className="text-xs text-gray-700 overflow-x-auto">
{`{
  entityType?: string;  // Optional filter (e.g., "location")
  limit?: number;        // Default 50
  yextApiKey: string;
  yextAccountId: string;
}`}
                </pre>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">Output:</p>
                <pre className="text-xs text-gray-700 overflow-x-auto">
{`{
  entities: Array<{
    id: string;
    name: string;
    entityType: string;
    address?: { city, region, line1 };
  }>;
  total: number;
}`}
                </pre>
              </div>
              <p className="text-sm text-gray-600 mt-4"><strong>Usage:</strong> Fetch entities for multi-entity content generation</p>
            </div>

            {/* Tool 9: yext_get_entity */}
            <div className="border border-gray-200 rounded-lg p-6 mb-6 bg-purple-50">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">9. yext_get_entity</h3>
              <p className="text-gray-700 mb-4">Fetches a single entity with all fields for customization.</p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">Input:</p>
                <pre className="text-xs text-gray-700 overflow-x-auto">
{`{
  entityId: string;
  yextApiKey: string;
  yextAccountId: string;
}`}
                </pre>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">Output:</p>
                <pre className="text-xs text-gray-700 overflow-x-auto">
{`{
  entity: any;              // Full entity object
  availableFields: string[]; // List of field IDs that exist
}`}
                </pre>
              </div>
              <p className="text-sm text-gray-600 mt-4"><strong>Usage:</strong> Get entity data for template customization and placeholder replacement</p>
            </div>

            {/* Tool 10: yext_update_entity */}
            <div className="border border-gray-200 rounded-lg p-6 mb-6 bg-purple-50">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">10. yext_update_entity</h3>
              <p className="text-gray-700 mb-4">Updates an entity in Yext Knowledge Graph (unified for FAQ/Comparison/Blog).</p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">Input:</p>
                <pre className="text-xs text-gray-700 overflow-x-auto">
{`{
  entityId: string;
  contentType: 'FAQ' | 'COMPARISON' | 'BLOG';
  content: FAQComponentProps | 
    ComparisonComponentProps | 
    BlogComponentProps;
  fieldId?: string;  // Optional, uses default if not provided
  yextApiKey: string;
  yextAccountId: string;
}`}
                </pre>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">Output:</p>
                <pre className="text-xs text-gray-700 overflow-x-auto">
{`{
  success: boolean;
  entityId: string;
  fieldId: string;
  uuid: string;
  message: string;
}`}
                </pre>
              </div>
              <p className="text-sm text-gray-600 mt-4"><strong>Usage:</strong> Publish content to Yext entities. Automatically maps content to Yext format (Lexical JSON for rich text).</p>
            </div>

            {/* Tool 11: yext_check_field */}
            <div className="border border-gray-200 rounded-lg p-6 mb-6 bg-purple-50">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">11. yext_check_field</h3>
              <p className="text-gray-700 mb-4">Checks if a field exists on an entity.</p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">Input:</p>
                <pre className="text-xs text-gray-700 overflow-x-auto">
{`{
  entityId: string;
  fieldId: string;
  yextApiKey: string;
  yextAccountId: string;
}`}
                </pre>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">Output:</p>
                <pre className="text-xs text-gray-700 overflow-x-auto">
{`{
  exists: boolean;
  fieldId: string;
  entityId: string;
}`}
                </pre>
              </div>
              <p className="text-sm text-gray-600 mt-4"><strong>Usage:</strong> Validate field existence before publishing</p>
            </div>

            {/* Tool 12: yext_get_field_schema */}
            <div className="border border-gray-200 rounded-lg p-6 bg-purple-50">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">12. yext_get_field_schema</h3>
              <p className="text-gray-700 mb-4">Gets field schema/metadata for an entity type.</p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">Input:</p>
                <pre className="text-xs text-gray-700 overflow-x-auto">
{`{
  entityType: string;  // e.g., "location", "organization"
  fieldId?: string;    // Optional: specific field, or all fields
  yextApiKey: string;
  yextAccountId: string;
}`}
                </pre>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">Output:</p>
                <pre className="text-xs text-gray-700 overflow-x-auto">
{`{
  entityType: string;
  fields: Array<{
    fieldId: string;
    type: string;        // "string", "list", "richText"
    displayName?: string;
    description?: string;
    required?: boolean;
  }>;
}`}
                </pre>
              </div>
              <p className="text-sm text-gray-600 mt-4"><strong>Usage:</strong> Discover available fields and their types for an entity type</p>
            </div>
          </section>

          {/* Yext Integration */}
          <section id="yext-integration" className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Yext Integration</h2>
            <p className="text-gray-700 mb-6">
              The system integrates with Yext Knowledge Graph to enable direct publishing of generated content to Yext entities.
            </p>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Features</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="text-purple-500 mr-2">•</span>
                  <span><strong>Multi-Entity Support:</strong> Generate and customize content for multiple entities simultaneously</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-500 mr-2">•</span>
                  <span><strong>Template Mode:</strong> Create templates with placeholders (e.g., <code className="bg-white px-1 rounded">{"{{name}}"}</code>, <code className="bg-white px-1 rounded">{"{{address}}"}</code>) that auto-customize per entity</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-500 mr-2">•</span>
                  <span><strong>Content Types:</strong> Supports FAQ, Product Comparison, and Blog Articles</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-500 mr-2">•</span>
                  <span><strong>Bulk Publishing:</strong> Publish multiple entity drafts at once via bulk-approve endpoint</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-500 mr-2">•</span>
                  <span><strong>Field Mapping:</strong> Automatic conversion to Yext format (Lexical JSON for rich text fields)</span>
                </li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Default Field IDs</h3>
              <p className="text-gray-700 mb-4">Each content type uses a default custom field ID in Yext:</p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div><strong>FAQ:</strong> <code className="bg-white px-2 py-1 rounded text-sm">c_minigolfMadness_locations_faqSection</code></div>
                <div><strong>Comparison:</strong> <code className="bg-white px-2 py-1 rounded text-sm">c_minigolfMadnessProductComparison</code></div>
                <div><strong>Blog:</strong> <code className="bg-white px-2 py-1 rounded text-sm">c_minigolfMandnessBlogs</code></div>
              </div>
              <p className="text-sm text-gray-600 mt-4">Custom field IDs can be specified per content type in the UI or API requests.</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Workflow with Yext</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-semibold">1</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Provide Yext Credentials</h4>
                    <p className="text-sm text-gray-600">Enter Yext API Key and Account ID in the UI (or via environment variables)</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-semibold">2</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Fetch Entities</h4>
                    <p className="text-sm text-gray-600">System automatically fetches entities from Yext (Step 0) using <code className="bg-gray-100 px-1 rounded">yext_list_entities</code> MCP tool</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-semibold">3</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Select Entities</h4>
                    <p className="text-sm text-gray-600">Choose which entities to generate content for (or use all fetched entities)</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-semibold">4</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Generate Content</h4>
                    <p className="text-sm text-gray-600">Content is generated in template mode with placeholders. For each selected entity, the system:</p>
                    <ul className="text-sm text-gray-600 mt-2 ml-4 list-disc">
                      <li>Fetches entity details using <code className="bg-gray-100 px-1 rounded">yext_get_entity</code></li>
                      <li>Replaces placeholders with entity-specific data</li>
                      <li>Creates a separate draft for each entity</li>
                    </ul>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-semibold">5</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Review & Publish</h4>
                    <p className="text-sm text-gray-600">Review drafts in PUCK editor, then publish to Yext using approve or bulk-approve endpoints</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">API Endpoints</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">POST /api/approve</h4>
                  <p className="text-sm text-gray-600 mb-2">Publish a single draft to Yext</p>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <pre className="text-green-400 text-xs overflow-x-auto">
{`{
  draftId: string;
  entityId?: string;      // Optional if stored in draft
  fieldId?: string;       // Optional, uses default
  yextApiKey: string;
  yextAccountId: string;
}`}
                    </pre>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">POST /api/bulk-approve</h4>
                  <p className="text-sm text-gray-600 mb-2">Publish multiple drafts to Yext</p>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <pre className="text-green-400 text-xs overflow-x-auto">
{`{
  draftIds: string[];
  yextApiKey: string;
  yextAccountId: string;
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Agent Workflow */}
          <section id="agent-workflow" className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Agent Workflow</h2>
            <p className="text-gray-700 mb-4">
              The agent orchestrates MCP tools in a sequential workflow with real-time updates:
            </p>
            <div className="space-y-4">
              <div className="border-l-4 border-purple-500 pl-4 py-2 bg-purple-50">
                <h3 className="font-semibold text-gray-900">Step 0: Fetch Yext Entities (Optional)</h3>
                <p className="text-sm text-gray-700">If Yext credentials provided, fetch entities for multi-entity content generation</p>
                <span className="text-xs text-purple-600 mt-1 inline-block">Tool: yext_list_entities</span>
              </div>
              <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50">
                <h3 className="font-semibold text-gray-900">Step 1: Expand Seeds</h3>
                <p className="text-sm text-gray-700">Generate diverse search queries from brand/vertical/region</p>
                <span className="text-xs text-blue-600 mt-1 inline-block">Tool: expand_seeds</span>
              </div>
              <div className="border-l-4 border-green-500 pl-4 py-2 bg-green-50">
                <h3 className="font-semibold text-gray-900">Step 2: Fetch People Also Ask</h3>
                <p className="text-sm text-gray-700">Retrieve trending questions from search results</p>
                <span className="text-xs text-green-600 mt-1 inline-block">Tool: fetch_paa</span>
              </div>
              <div className="border-l-4 border-purple-500 pl-4 py-2 bg-purple-50">
                <h3 className="font-semibold text-gray-900">Step 3: Rank Questions</h3>
                <p className="text-sm text-gray-700">Score and prioritize by commercial opportunity</p>
                <span className="text-xs text-purple-600 mt-1 inline-block">Tool: rank_questions</span>
              </div>
              <div className="border-l-4 border-yellow-500 pl-4 py-2 bg-yellow-50">
                <h3 className="font-semibold text-gray-900">Step 4: Generate Content</h3>
                <p className="text-sm text-gray-700">Create content (FAQ/Comparison/Blog) with AI based on user selection</p>
                <span className="text-xs text-yellow-600 mt-1 inline-block">Tool: generate_faq_json | generate_comparison_json | generate_blog_json</span>
              </div>
              <div className="border-l-4 border-purple-500 pl-4 py-2 bg-purple-50">
                <h3 className="font-semibold text-gray-900">Step 5: Customize & Store Drafts</h3>
                <p className="text-sm text-gray-700">If entities selected: fetch each entity, customize content with entity data, store separate drafts. Otherwise: store single draft.</p>
                <span className="text-xs text-purple-600 mt-1 inline-block">Tools: yext_get_entity, draft_store.put</span>
              </div>
            </div>
          </section>

          {/* Data Flow */}
          <section id="data-flow" className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Flow</h2>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <div className="font-mono text-sm space-y-2">
                <div>Input: {"{brand, vertical, region, contentType}"}</div>
                <div className="pl-4">↓</div>
                <div>Seeds: string[]</div>
                <div className="pl-4">↓</div>
                <div>PAA Questions: {"{question, snippet, title}[]"}</div>
                <div className="pl-4">↓</div>
                <div>Ranked Questions: {"{question, score, reasoning}[]"}</div>
                <div className="pl-4">↓</div>
                <div>Content Component: FAQ | Comparison | Blog</div>
                <div className="pl-8 text-xs text-gray-600">FAQ: {"{items: {question, answer}[]}"}</div>
                <div className="pl-8 text-xs text-gray-600">Comparison: {"{items: {feature, brandValue, competitorValue}[]}"}</div>
                <div className="pl-8 text-xs text-gray-600">Blog: {"{sections: {heading, content, order}[]}"}</div>
                <div className="pl-4">↓</div>
                <div>Draft ID: string (with contentType metadata)</div>
              </div>
            </div>
          </section>

          {/* Usage & Integration */}
          <section id="usage" className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Usage & Integration</h2>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-3">API Endpoint</h3>
            <div className="bg-gray-900 rounded-lg p-4 mb-4">
              <pre className="text-green-400 text-sm overflow-x-auto">
{`POST /api/run-demo-stream

Body:
{
  brand?: string;              // Optional
  vertical: string;            // Required
  region?: string;             // Optional (required unless genericContent)
  contentType: 'FAQ' | 'COMPARISON' | 'BLOG';
  customInstructions?: string;
  genericContent?: boolean;    // Generate generic content without placeholders
  yextApiKey?: string;        // Optional, for Yext integration
  yextAccountId?: string;     // Optional, for Yext integration
  selectedEntityIds?: string[]; // Optional, pre-selected entities
  yextFieldId?: string;       // Optional, custom field ID
  testMode?: boolean;         // Use mock data instead of APIs
}

Response: Server-Sent Events (SSE) stream
Events: step, data, complete, error

Data events include:
- yextEntities: Entity[] (if Yext credentials provided)
- seeds: string[]
- paaRows: PAARow[]
- rankedQuestions: RankedQuestion[]
- faqComponent (if FAQ)
- comparisonComponent (if COMPARISON)
- blogComponent (if BLOG)
- draftId: string (single draft)
- draftIds: string[] (multi-entity mode)
- entityDrafts: Array<{entityId, entityName, draftId}> (multi-entity mode)`}
              </pre>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">Customization Points</h3>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-start space-x-2">
                <span className="text-blue-500 mt-1">•</span>
                <span><strong>Custom Instructions:</strong> Users can provide additional guidance for AI generation</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-500 mt-1">•</span>
                <span><strong>Prompt Engineering:</strong> Modify prompts in lib/mcp-tools.ts for different output styles</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-500 mt-1">•</span>
                <span><strong>Scoring Logic:</strong> Adjust ranking criteria in rank_questions tool</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-500 mt-1">•</span>
                <span><strong>MCP Tools:</strong> Add new tools following the existing pattern</span>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-6 mt-8">
            <div className="flex items-center justify-between">
              <a
                href="/"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Back to Generator
              </a>
              <p className="text-sm text-gray-600">
                AI-Driven Content Generator POC
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

