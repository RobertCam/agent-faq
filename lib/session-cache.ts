const SESSION_KEY = 'agent-faq-session';

export interface WorkflowData {
  seeds: string[];
  paaRows: any[];
  rankedQuestions: any[];
  faqComponent?: any;
  comparisonComponent?: any;
  blogComponent?: any;
}

export interface SessionCache {
  brand: string;
  category: string;
  contentType: string;
  fieldId: string;
  yextApiKey?: string;
  yextAccountId?: string;
  customInstructions: string;
  testMode: boolean;
  selectedEntityIds: string[];
  steps: any[];
  workflowData: WorkflowData;
  lastDraftId: string | null;
}

export function loadSession(): Partial<SessionCache> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(partial: Partial<SessionCache>) {
  if (typeof window === 'undefined') return;
  const existing = loadSession() || {};
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...existing, ...partial }));
}

export function clearSessionWorkflow() {
  if (typeof window === 'undefined') return;
  const existing = loadSession();
  if (existing) {
    saveSession({
      ...existing,
      steps: [],
      workflowData: { seeds: [], paaRows: [], rankedQuestions: [] },
      lastDraftId: null,
    });
  }
}
