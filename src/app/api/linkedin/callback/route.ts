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
  console.log('LinkedIn callback redirect URI:', LINKEDIN_REDIRECT_URI);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Rate limiting for OAuth callbacks
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = rateLimit(`linkedin_callback:${clientIP}`, 3, 300000); // 3 requests per 5 minutes

  if (rateLimitResult.limited) {
    return createSecureResponse(
      { error: 'Rate limit exceeded for OAuth callback.' },
      429
    );
  }

  if (error) {
    return NextResponse.redirect(`${baseUrl}/student?error=${error}`);
  }

  if (!code || !LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
    return NextResponse.redirect(`${baseUrl}/student?error=missing_config`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: LINKEDIN_REDIRECT_URI,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('LinkedIn token exchange failed:', tokenData);
      return NextResponse.redirect(`${baseUrl}/student?error=token_exchange_failed`);
    }

    // Get user profile using LinkedIn's OpenID Connect userinfo endpoint
    const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const profileData = await profileResponse.json();

    if (!profileResponse.ok) {
      console.error('LinkedIn profile fetch failed:', profileData);
      return NextResponse.redirect(`${baseUrl}/student?error=profile_fetch_failed`);
    }

    // Create HTML response that stores tokens and closes popup
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>LinkedIn Connected</title>
          <script>
            // Store tokens in parent window's localStorage
            window.opener.localStorage.setItem('linkedin_access_token', ${JSON.stringify(tokenData.access_token)});
            window.opener.localStorage.setItem('linkedin_token_expiry', ${JSON.stringify(Date.now() + (tokenData.expires_in * 1000))});
            window.opener.localStorage.setItem('linkedin_member_id', ${JSON.stringify(profileData.sub)});
            window.opener.localStorage.setItem('linkedin_email', ${JSON.stringify(profileData.email || '')});
            window.opener.localStorage.setItem('linkedin_name', ${JSON.stringify(profileData.name || '')});

            // Close popup and notify parent
            window.close();
          </script>
        </head>
        <body>
          <p>LinkedIn connected successfully! You can close this window.</p>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });

  } catch (error) {
    console.error('LinkedIn OAuth error:', error);
    return NextResponse.redirect(`${baseUrl}/student?error=oauth_error`);
  }
}