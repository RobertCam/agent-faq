# Plan: Convert Yext Operations to MCP Tools

## Overview
Convert Yext API operations from direct function calls to MCP tools, enabling the agent to make intelligent decisions about entity data, field discovery, and content generation based on actual Yext entity context.

## Current State

### Yext Functions (Direct Calls)
Located in `lib/yext-client.ts`:
- `listEntities()` - List/filter entities
- `getFAQEntity()` - Fetch single entity (works for all content types)
- `updateFAQEntity()` - Update FAQ content
- `updateComparisonEntity()` - Update comparison content
- `updateBlogEntity()` - Update blog content
- `checkFieldExists()` - Check if field exists (internal helper)
- `mapFAQToYextEntity()` - Transform FAQ to Yext format (internal helper)
- `mapComparisonToYextEntity()` - Transform comparison to Yext format (internal helper)
- `mapBlogToYextEntity()` - Transform blog to Yext format (internal helper)

### Current Usage
- **Direct calls** from `/api/approve` and `/api/bulk-approve` routes
- **Entity fetching** happens in `/api/run-demo-stream` but not exposed as MCP tool
- **No agent visibility** into entity data during content generation

## Target State

### New MCP Tools
1. **`yext_list_entities`** - List/filter entities (with optional entityType filter)
2. **`yext_get_entity`** - Fetch single entity with all fields
3. **`yext_update_entity`** - Update entity (unified for all content types)
4. **`yext_check_field`** - Check if a field exists on an entity
5. **`yext_get_field_schema`** - Get field schema/metadata for an entity type

### Benefits
- **Context-aware generation**: Agent can fetch entity data before generating content
- **Smarter placeholders**: Agent checks which fields exist before using placeholders
- **Dynamic prompts**: Agent can use entity-specific data (hours, amenities, services) in prompts
- **Multi-step reasoning**: Agent can fetch → analyze → generate → update in one workflow
- **Field discovery**: Agent can discover available fields and adapt content structure

## Implementation Plan

### Phase 1: Create MCP Tool Wrappers

#### 1.1 Add TypeScript Interfaces (`lib/types.ts`)
```typescript
// Yext MCP Tool Input Types
export interface YextListEntitiesInput {
  entityType?: string; // Optional filter by entity type
  limit?: number; // Default 50
  yextApiKey: string;
  yextAccountId: string;
}

export interface YextGetEntityInput {
  entityId: string;
  yextApiKey: string;
  yextAccountId: string;
}

export interface YextUpdateEntityInput {
  entityId: string;
  contentType: 'FAQ' | 'COMPARISON' | 'BLOG';
  content: FAQComponentProps | ComparisonComponentProps | BlogComponentProps;
  fieldId?: string; // Optional, will use default if not provided
  yextApiKey: string;
  yextAccountId: string;
}

export interface YextCheckFieldInput {
  entityId: string;
  fieldId: string;
  yextApiKey: string;
  yextAccountId: string;
}

export interface YextGetFieldSchemaInput {
  entityType: string; // e.g., "location", "organization"
  fieldId?: string; // Optional: specific field, or all fields if omitted
  yextApiKey: string;
  yextAccountId: string;
}

// Yext MCP Tool Output Types
export interface YextListEntitiesOutput {
  entities: Array<{
    id: string;
    name: string;
    entityType: string;
    address?: {
      city?: string;
      region?: string;
      line1?: string;
    };
    // Minimal fields for selection
  }>;
  total: number;
}

export interface YextGetEntityOutput {
  entity: any; // Full entity object
  availableFields: string[]; // List of field IDs that exist
}

export interface YextUpdateEntityOutput {
  success: boolean;
  entityId: string;
  fieldId: string;
  uuid: string;
  message: string;
}

export interface YextCheckFieldOutput {
  exists: boolean;
  fieldId: string;
  entityId: string;
}

export interface YextGetFieldSchemaOutput {
  entityType: string;
  fields: Array<{
    fieldId: string;
    type: string; // e.g., "string", "list", "richText"
    displayName?: string;
    description?: string;
    required?: boolean;
  }>;
}
```

#### 1.2 Create MCP Tool Functions (`lib/mcp-tools.ts`)
Add wrapper functions that:
- Accept MCP input types
- Call existing `yext-client.ts` functions
- Return MCP output types
- Handle errors gracefully

Functions to add:
- `yextListEntities(input: YextListEntitiesInput): Promise<YextListEntitiesOutput>`
- `yextGetEntity(input: YextGetEntityInput): Promise<YextGetEntityOutput>`
- `yextUpdateEntity(input: YextUpdateEntityInput): Promise<YextUpdateEntityOutput>`
- `yextCheckField(input: YextCheckFieldInput): Promise<YextCheckFieldOutput>`
- `yextGetFieldSchema(input: YextGetFieldSchemaInput): Promise<YextGetFieldSchemaOutput>`

#### 1.3 Expose Tools in MCP Route (`app/api/mcp/route.ts`)
Add cases for:
- `yext_list_entities`
- `yext_get_entity`
- `yext_update_entity`
- `yext_check_field`
- `yext_get_field_schema`

### Phase 2: Enhance Agent Workflow

#### 2.1 Update Content Generation to Use Entity Context
Modify `generateFAQJSON`, `generateComparisonJSON`, `generateBlogJSON` to:
- Accept optional `entityData` parameter
- Use entity fields to inform prompts (e.g., "This location has hours: {{hours}}, amenities: {{amenities}}")
- Dynamically select placeholders based on available fields

#### 2.2 Update Workflow in `app/api/run-demo-stream/route.ts`
Current Step 0: Fetch entities (direct call)
New Step 0: Agent uses `yext_list_entities` MCP tool

Current Step 5: Customize content (direct call to `getFAQEntity`)
New Step 5: Agent uses `yext_get_entity` MCP tool for each entity

New Step 6: Agent uses `yext_update_entity` MCP tool to publish (optional, can still use approval flow)

### Phase 3: Enhance Placeholder System

#### 3.1 Smart Placeholder Discovery
Create helper function `getAvailablePlaceholders(entity: any): string[]` that:
- Scans entity for common fields (name, address, city, hours, phone, amenities, etc.)
- Returns list of available placeholder keys
- Used by agent to decide which placeholders to use in prompts

#### 3.2 Enhanced Placeholder Replacement
Update `getEntityPlaceholders()` to:
- Extract more fields from entity (hours, amenities, services, description, etc.)
- Return comprehensive placeholder map
- Support nested fields (e.g., `{{hours.monday}}`)

### Phase 4: Update Approval Flow (Optional)

#### 4.1 Keep Direct Calls for Manual Approval
The `/api/approve` and `/api/bulk-approve` routes can continue using direct calls for:
- Manual review/approval workflow
- User-initiated publishing
- Bulk operations outside agent workflow

#### 4.2 Add Agent-Driven Publishing Option
Allow agent to optionally publish directly using `yext_update_entity` MCP tool:
- Agent can decide when to publish vs. store draft
- Useful for automated workflows
- Still respects draft storage for review

## Migration Strategy

### Step 1: Add MCP Tools (Non-Breaking)
- Add new MCP tool functions
- Expose in `/api/mcp/route.ts`
- Keep existing direct calls working
- Test MCP tools independently

### Step 2: Update Workflow to Use MCP Tools
- Modify `run-demo-stream` to use MCP tools instead of direct calls
- Update entity fetching to use `yext_list_entities`
- Update entity customization to use `yext_get_entity`
- Test end-to-end workflow

### Step 3: Enhance Content Generation
- Add entity context to generation functions
- Update prompts to use entity data
- Test with real entities

### Step 4: Optional Agent Publishing
- Add `yext_update_entity` to agent workflow
- Make it optional (can still use approval flow)
- Test automated publishing

## Files to Modify

1. **`lib/types.ts`**
   - Add Yext MCP input/output interfaces

2. **`lib/mcp-tools.ts`**
   - Add `yextListEntities()` function
   - Add `yextGetEntity()` function
   - Add `yextUpdateEntity()` function
   - Add `yextCheckField()` function
   - Add `yextGetFieldSchema()` function
   - Enhance `getEntityPlaceholders()` to extract more fields
   - Update generation functions to accept optional entity context
   - Add test mode support for `fetchPAA()` (use mock data when testMode=true)

3. **`app/api/mcp/route.ts`**
   - Add cases for new Yext MCP tools
   - Import new input types

4. **`app/api/run-demo-stream/route.ts`**
   - Update Step 0 to use `yext_list_entities` MCP tool (via agent)
   - Update Step 5 to use `yext_get_entity` MCP tool (via agent)
   - Optionally add Step 6 for agent-driven publishing
   - Add `testMode` parameter support

5. **`lib/mock-data.ts`** (New file)
   - Store sample PAA responses
   - Store sample entity data
   - Helper functions to return mock data when testMode is enabled

6. **`lib/yext-client.ts`** (No changes needed)
   - Keep existing functions as-is
   - MCP tools will wrap these functions
   - May need to add `getFieldSchema()` function if Yext API supports it

## Cost-Saving Testing Mode

Add a testing/demo mode that reduces API costs during development:

### Implementation
- Add `testMode` or `demoMode` flag to request body in `/api/run-demo-stream`
- When enabled:
  - **SerpAPI**: Use cached/mock PAA data instead of real API calls
  - **OpenAI**: Use cheaper model (e.g., `gpt-4o-mini` instead of `gpt-4o`) or mock responses
  - **Yext**: Use mock entity data instead of real API calls (optional)

### Benefits
- Test workflow without consuming SerpAPI monthly quota
- Faster iteration during development
- Lower OpenAI costs during testing
- Can still test with real APIs when needed by disabling test mode

### Mock Data Strategy
- Store sample PAA responses in `lib/mock-data.ts`
- Store sample entity data for common entity types
- Allow override: if real API key provided, use real APIs even in test mode

## Success Criteria

- [ ] All Yext operations available as MCP tools
- [ ] Agent can fetch entities before content generation
- [ ] Agent can use entity data to inform prompts
- [ ] Placeholder system uses available entity fields
- [ ] Content generation is more context-aware
- [ ] Existing approval flow still works
- [ ] Agent can optionally publish directly to Yext
- [ ] No breaking changes to existing functionality

## Future Enhancements

1. **Multi-Entity Analysis**: Agent can compare multiple entities to find common patterns
2. **Content Optimization**: Agent can analyze existing content and suggest improvements
3. **Batch Operations**: Agent can update multiple entities efficiently
4. **Content Validation**: Agent can validate content against Yext field requirements

