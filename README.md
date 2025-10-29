# AI-Driven FAQ Generator (Proof of Concept)

An AI-powered FAQ generation system using OpenAI Agents SDK with MCP (Model Context Protocol) tools. This POC demonstrates automated content creation through agent orchestration.

## Features

- 🤖 AI agent orchestration using OpenAI's Agents SDK
- 🔍 Automated question discovery via SerpAPI (People Also Ask)
- 📝 AI-generated FAQ content with schema.org JSON-LD
- ✏️ Visual editing interface using PUCK editor
- 🚀 End-to-end workflow from input to approval

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
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open the application:**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### 1. Generate FAQ

1. Enter the brand name (e.g., "Starbucks")
2. Enter the vertical (e.g., "Coffee / QSR")
3. Enter the region (e.g., "Vancouver")
4. Click "Run 7-day fetch now"

The agent will:
- Generate keyword seed variations
- Fetch People Also Ask questions from Google
- Rank questions by commercial opportunity
- Generate FAQ content using AI
- Store the draft and return a draftId

### 2. Review & Edit

Click the "Open draft in PUCK editor →" link to:
- Review the generated FAQ
- Edit questions and answers inline
- See the Schema.org JSON-LD markup

### 3. Approve

Click the "Approve FAQ" button to simulate publishing the content.

## Architecture

```
User Input
    ↓
Agent Orchestration (OpenAI Agents SDK)
    ↓
MCP Tools (Next.js API Routes):
    ├── expand_seeds → Generate keyword variations
    ├── fetch_paa → Get PAA questions (SerpAPI)
    ├── rank_questions → Score and rank opportunities
    ├── generate_faq_json → Create FAQ with AI
    └── draft_store → Store and retrieve drafts
    ↓
PUCK Editor (Visual Review)
    ↓
Approval (Simulated Publish)
```

## Project Structure

```
/
├── app/
│   ├── api/
│   │   ├── mcp/route.ts          # MCP tool server
│   │   ├── run-demo/route.ts     # Agent execution trigger
│   │   ├── approve/route.ts      # Approval endpoint
│   │   └── load-draft/route.ts   # Load draft for editor
│   ├── editor/[draftId]/page.tsx # PUCK editor view
│   ├── page.tsx                  # Main input form
│   ├── layout.tsx
│   ├── globals.css
│   └── puck-config.ts            # PUCK component definitions
├── lib/
│   ├── faq-agent.ts              # Agent orchestration
│   ├── mcp-tools.ts              # MCP tool implementations
│   └── types.ts                  # TypeScript type definitions
└── [config files]
```

## MCP Tools

The system implements 5 MCP tools:

1. **expand_seeds** - Generates 30+ keyword variations from brand/vertical/region
2. **fetch_paa** - Retrieves People Also Ask questions via SerpAPI
3. **rank_questions** - Scores questions by commercial opportunity and local relevance
4. **generate_faq_json** - Uses OpenAI to generate FAQ content with schema.org markup
5. **draft_store** - In-memory storage for drafts (put/get operations)

## API Keys

- **OpenAI API Key**: Used for the Agents SDK and FAQ content generation
- **SerpAPI Key**: Used to fetch Google's People Also Ask data

**Note**: Keep these keys secure and never commit them to version control. The `.gitignore` file is configured to exclude `.env.local`.

## Deployment

This POC can be deployed to Vercel:

```bash
npm run build
vercel
```

Make sure to set environment variables in the Vercel dashboard.

## Limitations (POC)

- Drafts are stored in-memory (not persistent across restarts)
- Limited to first 5 seed queries to respect rate limits
- Approval is simulated (logs to console only)
- No authentication or user management

## Future Enhancements

- Persistent draft storage (database)
- Real CMS integration for publishing
- User authentication
- Full cron-based automation
- Multi-language support
- Analytics and metrics

## License

MIT

