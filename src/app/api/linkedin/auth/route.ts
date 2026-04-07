import { NextResponse } from 'next/server';
import { rateLimit, createSecureResponse } from '@/lib/security';

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export async function GET(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    ? normalizeBaseUrl(process.env.NEXT_PUBLIC_BASE_URL)
    : requestOrigin;
  const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || `${baseUrl}/api/linkedin/callback`;

  console.log('=== LinkedIn Auth Debug ===');
  console.log('Request origin:', requestOrigin);
  console.log('NEXT_PUBLIC_BASE_URL:', process.env.NEXT_PUBLIC_BASE_URL);
  console.log('LINKEDIN_REDIRECT_URI env:', process.env.LINKEDIN_REDIRECT_URI);
  console.log('Computed baseUrl:', baseUrl);
  console.log('Final LINKEDIN_REDIRECT_URI:', LINKEDIN_REDIRECT_URI);
  console.log('LINKEDIN_CLIENT_ID:', LINKEDIN_CLIENT_ID ? LINKEDIN_CLIENT_ID.substring(0, 10) + '...' : 'NOT SET');
  console.log('==========================');

  // Rate limiting for OAuth initiation
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = rateLimit(`linkedin_auth:${clientIP}`, 5, 60000); // 5 requests per minute

  if (rateLimitResult.limited) {
    return createSecureResponse(
      { error: 'Rate limit exceeded for OAuth initiation.' },
      429
    );
  }

  if (!LINKEDIN_CLIENT_ID) {
    return createSecureResponse({ error: 'LinkedIn OAuth not configured' }, 500);
  }

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT_URI)}&scope=openid%20profile%20email`;

  console.log('Final auth URL:', authUrl);

  return NextResponse.redirect(authUrl);
}