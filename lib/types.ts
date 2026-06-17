// Content Types
export type ContentType = 'FAQ' | 'COMPARISON' | 'BLOG';

export interface FAQItem {
  question: string;
  answer: string;
}

export interface SchemaOrgFAQ {
  "@context": "https://schema.org";
  "@type": "FAQPage";
  mainEntity: Array<{
    "@type": "Question";
    name: string;
    acceptedAnswer: {
      "@type": "Answer";
      text: string;
    };
  }>;
}

export interface FAQComponentProps {
  brand?: string; // Optional - FAQ can exist without brand
  region: string;
  items: FAQItem[];
  schemaOrg: SchemaOrgFAQ;
}

// Comparison Content Types
export interface ComparisonItem {
  feature: string;
  brandValue: string;
  competitorValue?: string;
}

export interface ComparisonComponentProps {
  brand?: string; // Optional
  competitor?: string;
  category: string;
  region?: string;
  items: ComparisonItem[];
  schemaOrg: any;
}

// Blog Content Types
export interface BlogSection {
  heading: string;
  content: string;
  order: number;
}

export interface BlogComponentProps {
  title: string;
  brand?: string; // Optional
  vertical: string;
  region?: string;
  metaDescription: string;
  sections: BlogSection[];
  schemaOrg: any;
}

// Union type for all content components
export type ContentComponent = 
  | ({ type: 'FAQ'; props: FAQComponentProps })
  | ({ type: 'COMPARISON'; props: ComparisonComponentProps })
  | ({ type: 'BLOG'; props: BlogComponentProps });

export interface Draft {
  id: string;
  brand?: string; // Optional - drafts can exist without brand
  vertical: string;
  region: string;
  contentType: ContentType;
  content: any; // Can be FAQComponentProps, ComparisonComponentProps, or BlogComponentProps
  createdAt: string;
  entityId?: string; // Optional Yext entity ID for FAQ entities
}

export interface PAARow {
  question: string;
  snippet: string;
  title: string;
  link?: string;
}

export interface RankedQuestion extends PAARow {
  score: number;
  reasoning: string;
}

// MCP Tool Input/Output Types
export interface ExpandSeedsInput {
  brand?: string; // Optional - can generate seeds with just vertical and region
  vertical: string;
  region?: string; // Optional - can be undefined for generic content
}

export interface FetchPAAInput {
  seeds: string[];
  location?: string;
  hl?: string;
  testMode?: boolean; // Use mock data instead of SerpAPI
}

export interface RankQuestionsInput {
  brand?: string; // Optional - ranking can work without brand
  rows: PAARow[];
}

export interface GenerateFAQInput {
  brand?: string; // Optional - FAQ can be generated without brand
  region?: string; // Optional - can be generic content
  questions: RankedQuestion[];
  customInstructions?: string;
  genericContent?: boolean; // Generate generic content with placeholders
  useTemplate?: boolean; // Use template mode for multi-entity customization
  entityData?: any; // Optional entity data to inform prompts with context
}

export interface DraftStorePutInput {
  brand?: string; // Optional - drafts can exist without brand
  vertical: string;
  region: string;
  contentType: ContentType;
  content: any; // FAQComponentProps | ComparisonComponentProps | BlogComponentProps
  entityId?: string; // Optional Yext entity ID for FAQ entities
}

export interface DraftStoreGetInput {
  draftId: string;
}

// New MCP Tool Types
export interface RecommendContentTypeInput {
  brand?: string; // Optional
  vertical: string;
  region: string;
  paaRows: PAARow[];
}

export interface ContentRecommendation {
  primaryType: ContentType;
  secondaryTypes?: ContentType[]; // Optional additional content types to generate
  confidence: number;
  reasoning: string;
  keyInsights: string[];
}

export interface GenerateComparisonInput {
  brand?: string; // Optional
  vertical: string;
  region?: string; // Optional - can be generic content
  questions: RankedQuestion[];
  customInstructions?: string;
  genericContent?: boolean; // Generate generic content with placeholders
  useTemplate?: boolean; // Use template mode for multi-entity customization
  entityData?: any; // Optional entity data to inform prompts with context
}

export interface GenerateBlogInput {
  brand?: string; // Optional
  vertical: string;
  region?: string; // Optional - can be generic content
  questions: RankedQuestion[];
  customInstructions?: string;
  genericContent?: boolean; // Generate generic content with placeholders
  useTemplate?: boolean; // Use template mode for multi-entity customization
  entityData?: any; // Optional entity data to inform prompts with context
}

// Yext API Types
export interface YextFAQItem {
  question: string;
  answer: string;
}

export interface YextFAQEntity {
  meta: {
    entityType: string;
  };
  name: string;
  c_faqs?: YextFAQItem[];
  [key: string]: any;
}

export interface YextAPIResponse<T = any> {
  meta: {
    uuid: string;
    errors?: Array<{
      code: string;
      message: string;
      type: string;
    }>;
  };
  response: T;
}

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

