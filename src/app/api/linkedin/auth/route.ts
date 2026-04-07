import { NextResponse } from 'next/server';
import { rateLimit, createSecureResponse } from '@/lib/security';

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export async function GET(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    ? normalizeBaseUrl(process.env.NEXT_PUBLIC_BASE_URL)
    : requestOrigin;
  const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || `${baseUrl}/api/linkedin/callback`;

  console.log('LinkedIn auth redirect URI:', LINKEDIN_REDIRECT_URI);

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

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT_URI)}&scope=r_liteprofile%20r_emailaddress%20w_member_social`;

  return NextResponse.redirect(authUrl);
}