export interface YextCredentialInput {
  yextApiKey?: string;
  yextAccountId?: string;
}

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined || value === null) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getServerYextEnv(): {
  yextApiKey?: string;
  yextAccountId?: string;
} {
  return {
    yextApiKey: readEnv('YEXT_API_KEY'),
    yextAccountId: readEnv('YEXT_ACCOUNT_ID'),
  };
}

export function isYextConfigured(): {
  configured: boolean;
  hasApiKey: boolean;
  hasAccountId: boolean;
} {
  const { yextApiKey, yextAccountId } = getServerYextEnv();
  return {
    configured: Boolean(yextApiKey && yextAccountId),
    hasApiKey: Boolean(yextApiKey),
    hasAccountId: Boolean(yextAccountId),
  };
}

function normalizeInput(value?: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function resolveYextCredentials(
  apiKey?: string,
  accountId?: string
): { yextApiKey: string; yextAccountId: string } {
  const env = getServerYextEnv();
  const yextApiKey = normalizeInput(apiKey) || env.yextApiKey;
  const yextAccountId = normalizeInput(accountId) || env.yextAccountId;

    if (!yextApiKey) {
    throw new Error(
      'Yext API Key is required. Set YEXT_API_KEY in your environment.'
    );
  }
  if (!yextAccountId) {
    throw new Error(
      'Yext Account ID is required. Set YEXT_ACCOUNT_ID in your environment.'
    );
  }

  return { yextApiKey, yextAccountId };
}

export function resolveYextCredentialsFromSources(
  ...sources: Array<YextCredentialInput | undefined>
): { yextApiKey: string; yextAccountId: string } {
  let apiKey: string | undefined;
  let accountId: string | undefined;

  for (const source of sources) {
    const key = normalizeInput(source?.yextApiKey);
    const id = normalizeInput(source?.yextAccountId);
    if (key) apiKey = key;
    if (id) accountId = id;
  }

  return resolveYextCredentials(apiKey, accountId);
}
