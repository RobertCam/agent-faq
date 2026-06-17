# AI-Driven Content Generator (Proof of Concept)

An AI-powered content generation system using OpenAI Agents SDK with MCP (Model Context Protocol) tools. This POC demonstrates automated content creation through agent orchestration with full Yext Knowledge Graph integration.

## Features

- 🤖 AI agent orchestration using OpenAI's Agents SDK
- 🔍 Automated question discovery via SerpAPI (People Also Ask)
- 📝 AI-generated content (FAQ, Product Comparison, Blog Articles) with schema.org JSON-LD
- ✏️ Visual editing interface using PUCK editor
- 🚀 End-to-end workflow from input to approval
- 🔗 **Yext Integration**: Direct publishing to Yext Knowledge Graph
- 🏢 **Multi-Entity Support**: Generate and customize content for multiple entities at once
- 🎯 **Template Mode**: Create templates with placeholders that auto-customize per entity

## Tech Stack

- **Next.js 14** (App Router) - Frontend and API routes
- **OpenAI Agents SDK** - Agent orchestration
- **PUCK** - Visual editor for FAQ components
- **SerpAPI** - Fetching People Also Ask questions
- **TailwindCSS** - Styling
- **TypeScript** - Type safety

## Prerequisites

- Node.js 18+ 
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- SerpAPI key ([Get roaming here](https://serpapi.com/dashboard))
- Yext API key and Account ID (optional, for Yext integration) - [Yext Developer Portal](https://hitchhikers.yext.com/docs/developer-guides/getting-started/)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   
   Create a `.env.local` file in the root directory:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   SERPAPI_KEY=your_serpapi_key_here
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   # Optional: Yext credentials (can also be provided in UI)
   YEXT_API_KEY=your_yext_api_key_here
   YEXT_ACCOUNT_ID=your_yext_account_id_here
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open the application:**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### 1. Generate Content

1. Enter the brand name (optional, e.g., "Starbucks")
2. Enter the vertical (required, e.g., "Coffee / QSR")
3. Enter the region (optional, e.g., "Vancouver")
4. Select content type: **FAQ**, **Comparison**, or **Blog**
5. (Optional) Enter Yext API credentials to enable entity selection and publishing
6. Click "Run 7-day fetch now"

The agent will:
- **Step 0**: Fetch entities from Yext (if credentials provided)
- Generate keyword seed variations
- Fetch People Also Ask questions from Google
- Rank questions by commercial opportunity
- Generate content using AI (FAQ/Comparison/Blog)
- **Multi-Entity Mode**: If entities selected, customize content for each entity
- Store the draft(s) and return draftId(s)

### 2. Review & Edit

Click the "Open draft in PUCK editor →" link to:
- Review the generated content
- Edit questions/answers, comparison features, or blog sections inline
- See the Schema.org JSON-LD markup

### 3. Approve & Publish

**Single Draft:**
- Click the "Approve FAQ/Comparison/Blog" button to publish to Yext

**Multi-Entity Drafts:**
- Use "Publish All to Yext" to bulk publish all entity-specific drafts
- Or approve individual drafts from the entity list

## Architecture

```
User Input (brand, vertical, region, contentType, Yext credentials)
    ↓
Agent Orchestration (OpenAI Agents SDK)
    ↓
MCP Tools (Next.js API Routes):
    ├── yext_list_entities → Fetch entities from Yext (optional)
    ├── yext_get_entity → Get entity details for customization
    ├── expand_seeds → Generate keyword variations
    ├── fetch_paa → Get PAA questions (SerpAPI)
    ├── rank_questions → Score and rank opportunities
    ├── generate_faq_json → Create FAQ with AI
    ├── generate_comparison_json → Create Comparison with AI
    ├── generate_blog_json → Create Blog with AI
    ├── draft_store → Store and retrieve drafts
    └── yext_update_entity → Publish to Yext (via approval)
    ↓
PUCK Editor (Visual Review)
    ↓
Approval & Publishing
    ├── Single: /api/approve → Publish one draft
    └── Bulk: /api/bulk-approve → Publish multiple drafts
    ↓
Yext Knowledge Graph
```

## Project Structure

```
/
├── app/
│   ├── api/
│   │   ├── mcp/route.ts              # MCP tool server
│   │   ├── run-demo-stream/route.ts  # Agent execution (SSE streaming)
│   │   ├── approve/route.ts          # Single draft approval → Yext
│   │   ├── bulk-approve/route.ts      # Bulk draft approval → Yext
│   │   ├── load-draft/route.ts       # Load draft for editor
│   │   ├── list-yext-entities/route.ts # List Yext entities (direct API)
│   │   └── fetch-yext-entity/route.ts  # Fetch Yext entity (direct API)
│   ├── editor/[draftId]/page.tsx     # PUCK editor view
│   ├── docs/page.tsx                  # Documentation page
│   ├── page.tsx                       # Main input form
│   ├── layout.tsx
│   ├── globals.css
│   └── puck-config.tsx                # PUCK component definitions
├── lib/
│   ├── faq-agent.ts                  # Agent orchestration
│   ├── mcp-tools.ts                  # MCP tool implementations
│   ├── yext-client.ts                # Yext API client functions
│   ├── types.ts                       # TypeScript type definitions
│   └── mock-data.ts                   # Mock data for testing
└── [config files]
```

## MCP Tools

The system implements 12 MCP tools:

### Content Generation Tools
1. **expand_seeds** - Generates 30+ keyword variations from brand/vertical/region
2. **fetch_paa** - Retrieves People Also Ask questions via SerpAPI (supports test mode)
3. **rank_questions** - Scores questions by commercial opportunity and local relevance
4. **recommend_content_type** - AI recommends best content type (FAQ/Comparison/Blog)
5. **generate_faq_json** - Uses OpenAI to generate FAQ content with schema.org markup
6. **generate_comparison_json** - Uses OpenAI to generate product comparison content
7. **generate_blog_json** - Uses OpenAI to generate blog article content

### Draft Management
8. **draft_store.put** - Store drafts (supports multi-entity mode)
9. **draft_store.get** - Retrieve drafts

### Yext Integration Tools
10. **yext_list_entities** - List/filter entities from Yext Knowledge Graph
11. **yext_get_entity** - Fetch single entity with all fields
12. **yext_update_entity** - Update entity (unified for FAQ/Comparison/Blog)
13. **yext_check_field** - Check if a field exists on an entity
14. **yext_get_field_schema** - Get field schema/metadata for an entity type

## API Keys

- **OpenAI API Key**: Used for the Agents SDK and content generation
- **SerpAPI Key**: Used to fetch Google's People Also Ask data
- **Yext API Key & Account ID**: Used for Yext Knowledge Graph integration (optional)

**Note**: Keep these keys secure and never commit them to version control. The `.gitignore` file is configured to exclude `.env.local`.

### Getting Yext Credentials

1. Log in to your [Yext account](https://www.yext.com/)
2. Navigate to **Settings** → **API Keys**
3. Create a new API key or use an existing one
4. Find your Account ID in the account settings
5. Enter both in the UI or set as environment variables

## Deployment

This POC can be deployed to Vercel:

```bash
npm run build
vercel
```

Make sure to set environment variables in the Vercel dashboard.

## Yext Integration Features

### Multi-Entity Support
- Generate content templates that automatically customize for multiple entities
- Each entity gets its own draft with entity-specific data (name, address, hours, etc.)
- Bulk publish all entity drafts at once

### Content Types Supported
- **FAQ**: Frequently Asked Questions with schema.org JSON-LD
- **Product Comparison**: Feature-by-feature comparisons with pros/cons
- **Blog Articles**: Multi-section articles with headings and content

### Template Mode
- Generate templates with placeholders (e.g., `{{name}}`, `{{address}}`, `{{hours}}`)
- Automatically replace placeholders with actual entity data
- Supports generic content mode (no placeholders)

### Field Mapping
- Default field IDs:
  - FAQ: `c_minigolfMadness_locations_faqSection`
  - Comparison: `c_minigolfMadnessProductComparison`
  - Blog: `c_minigolfMandnessBlogs`
- Custom field IDs can be specified per content type

## Limitations (POC)

- Drafts are stored in-memory (not persistent across restarts)
- Limited to first 5 seed queries to respect rate limits (SerpAPI)
- No authentication or user management
- Yext field creation: Fields must exist in Yext schema or be auto-created (account-dependent)

## Future Enhancements

- Persistent draft storage (database)
- User authentication
- Full cron-based automation
- Multi-language support
- Analytics and metrics
- Enhanced Yext field discovery and validation
- Content versioning and rollback
- Batch operations for large entity sets

## License

MIT

