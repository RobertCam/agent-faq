'use client';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            AI-Driven FAQ Generator Documentation
          </h1>
          <p className="text-gray-600 mb-8">
            A proof-of-concept demonstrating scalable content automation using AI agent orchestration with Model Context Protocol (MCP) tools.
          </p>

          {/* Table of Contents */}
          <div className="border-l-4 border-blue-500 pl-4 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Contents</h2>
            <ul className="space-y-1 text-gray-700">
              <li><a href="#overview" className="text-blue-600 hover:underline">Overview</a></li>
              <li><a href="#architecture" className="text-blue-600 hover:underline">Architecture</a></li>
              <li><a href="#mcp-tools" className="text-blue-600 hover:underline">MCP Tools</a></li>
              <li><a href="#agent-workflow" className="text-blue-600 hover:underline">Agent Workflow</a></li>
              <li><a href="#data-flow" className="text-blue-600 hover:underline">Data Flow</a></li>
              <li><a href="#usage" className="text-blue-600 hover:underline">Usage & Integration</a></li>
            </ul>
          </div>

          {/* Overview */}
          <section id="overview" className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Overview</h2>
            <p className="text-gray-700 mb-4">
              This system automates the generation of FAQ content by:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
              <li>Accepting brand, vertical, and region as input parameters</li>
              <li>Generating seed search queries using AI</li>
              <li>Fetching "People Also Ask" (PAA) questions from search results</li>
              <li>Ranking questions by commercial opportunity and relevance</li>
              <li>Generating concise, factual FAQ answers using OpenAI</li>
              <li>Storing as drafts for review in a visual editor (PUCK)</li>
            </ol>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <strong>Tech Stack:</strong> Next.js 14, TypeScript, OpenAI API, SerpAPI, PUCK Editor, TailwindCSS
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

            {/* Tool 5 & 6: draft_store */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">5. draft_store (put/get)</h3>
              <p className="text-gray-700 mb-4">Manages draft storage and retrieval.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">put - Input:</p>
                  <pre className="text-xs text-gray-700 overflow-x-auto">
{`{
  brand: string;
  vertical: string;
  region: string;
  faqComponent: FAQComponentProps;
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
              <p className="text-sm text-gray-600 mt-4"><strong>Usage:</strong> In-memory storage for draft management (POC)</p>
            </div>
          </section>

          {/* Agent Workflow */}
          <section id="agent-workflow" className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Agent Workflow</h2>
            <p className="text-gray-700 mb-4">
              The agent orchestrates MCP tools in a sequential workflow with real-time updates:
            </p>
            <div className="space-y-4">
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
                <h3 className="font-semibold text-gray-900">Step 4: Generate FAQ</h3>
                <p className="text-sm text-gray-700">Create concise, factual answers with AI</p>
                <span className="text-xs text-yellow-600 mt-1 inline-block">Tool: generate_faq_json</span>
              </div>
              <div className="border-l-4 border-gray-500 pl-4 py-2 bg-gray-50">
                <h3 className="font-semibold text-gray-900">Step 5: Store Draft</h3>
                <p className="text-sm text-gray-700">Save for review and editing</p>
                <span className="text-xs text-gray-600 mt-1 inline-block">Tool: draft_store.put</span>
              </div>
            </div>
          </section>

          {/* Data Flow */}
          <section id="data-flow" className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Flow</h2>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <div className="font-mono text-sm space-y-2">
                <div>Input: {"{brand, vertical, region}"}</div>
                <div className="pl-4">↓</div>
                <div>Seeds: string[]</div>
                <div className="pl-4">↓</div>
                <div>PAA Questions: {"{question, snippet, title}[]"}</div>
                <div className="pl-4">↓</div>
                <div>Ranked Questions: {"{question, score, reasoning}[]"}</div>
                <div className="pl-4">↓</div>
                <div>FAQ Component: {"{items: {question, answer}[]}"}</div>
                <div className="pl-4">↓</div>
                <div>Draft ID: string</div>
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
  brand: string;
  vertical: string;
  region: string;
  customInstructions?: string;
}

Response: Server-Sent Events (SSE) stream
Events: step, data, complete, error`}
              </pre>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">Integrating into Larger Platform</h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> This is a POC with in-memory storage. For production:
              </p>
              <ul className="list-disc list-inside text-sm text-yellow-800 mt-2 space-y-1">
                <li>Replace in-memory Map with database (PostgreSQL, MongoDB, etc.)</li>
                <li>Add authentication and authorization</li>
                <li>Implement rate limiting</li>
                <li>Add error handling and retry logic</li>
                <li>Set up monitoring and logging</li>
                <li>Cache frequently used data</li>
                <li>Add webhook support for async processing</li>
              </ul>
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
                AI-Driven FAQ Generator POC
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

