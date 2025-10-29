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
  brand: string;
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
  brand: string;
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
  brand: string;
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
  brand: string;
  vertical: string;
  region: string;
  contentType: ContentType;
  content: any; // Can be FAQComponentProps, ComparisonComponentProps, or BlogComponentProps
  createdAt: string;
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
  brand: string;
  vertical: string;
  region: string;
}

export interface FetchPAAInput {
  seeds: string[];
  location?: string;
  hl?: string;
}

export interface RankQuestionsInput {
  brand: string;
  rows: PAARow[];
}

export interface GenerateFAQInput {
  brand: string;
  region: string;
  questions: RankedQuestion[];
  customInstructions?: string;
}

export interface DraftStorePutInput {
  brand: string;
  vertical: string;
  region: string;
  contentType: ContentType;
  content: any; // FAQComponentProps | ComparisonComponentProps | BlogComponentProps
}

export interface DraftStoreGetInput {
  draftId: string;
}

// New MCP Tool Types
export interface RecommendContentTypeInput {
  brand: string;
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
  brand: string;
  vertical: string;
  region: string;
  questions: RankedQuestion[];
  customInstructions?: string;
}

export interface GenerateBlogInput {
  brand: string;
  vertical: string;
  region: string;
  questions: RankedQuestion[];
  customInstructions?: string;
}

