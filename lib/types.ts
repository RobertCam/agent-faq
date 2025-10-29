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

export interface Draft {
  id: string;
  brand: string;
  vertical: string;
  region: string;
  faqComponent: FAQComponentProps;
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
  faqComponent: FAQComponentProps;
}

export interface DraftStoreGetInput {
  draftId: string;
}

