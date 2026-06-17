import { NextResponse } from 'next/server';
import { isYextConfigured } from '@/lib/yext-credentials';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = isYextConfigured();
  return NextResponse.json({
    success: true,
    ...status,
    requiredEnvVars: ['YEXT_API_KEY', 'YEXT_ACCOUNT_ID'],
  });
}
