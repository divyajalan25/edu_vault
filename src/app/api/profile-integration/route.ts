import { NextResponse } from 'next/server';
import { rateLimit, validateCertificateData, validateLinkedInToken, createSecureResponse, sanitizeInput } from '@/lib/security';

const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
const LINKEDIN_MEMBER_URN = process.env.LINKEDIN_MEMBER_URN;
const HRMS_WEBHOOK_URL = process.env.HRMS_WEBHOOK_URL;

async function sendLinkedInPost(payload: {
  studentName: string;
  universityName: string;
  degreeName: string;
  recordUrl: string;
  linkedinToken?: string;
  linkedinMemberId?: string;
}) {
  if (!payload.linkedinToken) {
    return { status: 'skipped', reason: 'No LinkedIn token provided' };
  }

  // Get member URN - either from payload or fetch it
  let memberUrn = payload.linkedinMemberId;
  if (!memberUrn) {
    // Fallback: fetch from LinkedIn profile API
    try {
      const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${payload.linkedinToken}`,
        },
      });
      const profileData = await profileResponse.json();
      memberUrn = profileData.sub;
    } catch (error) {
      console.error('Failed to fetch LinkedIn member ID:', error);
      return { status: 'error', error: 'Could not get LinkedIn member ID' };
    }
  }

  if (!memberUrn) {
    return { status: 'error', error: 'LinkedIn member ID is missing' };
  }

  const body = {
    author: `urn:li:person:${memberUrn}`,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text: `EduVault has verified my ${payload.degreeName} from ${payload.universityName}. View my credential: ${payload.recordUrl}`,
        },
        shareMediaCategory: 'ARTICLE',
        media: [
          {
            status: 'READY',
            description: {
              text: `EduVault blockchain credential for ${payload.studentName}`,
            },
            originalUrl: payload.recordUrl,
            title: {
              text: 'EduVault Credential',
            },
          },
        ],
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${payload.linkedinToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('LinkedIn UGC Post API error:', response.status, errorText);
    return { status: 'error', error: `LinkedIn API (${response.status}): ${errorText}` };
  }

  const postResult = await response.json();
  console.log('LinkedIn UGC post successful:', postResult);
  return { status: 'success' };
}

async function sendHrmsUpdate(payload: {
  studentName: string;
  universityName: string;
  degreeName: string;
  hash: string;
  recordUrl: string;
}) {
  if (!HRMS_WEBHOOK_URL) {
    return { status: 'skipped', reason: 'HRMS webhook not configured' };
  }

  const response = await fetch(HRMS_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      studentName: payload.studentName,
      universityName: payload.universityName,
      degreeName: payload.degreeName,
      credentialHash: payload.hash,
      credentialUrl: payload.recordUrl,
      timestamp: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { status: 'error', error: errorText };
  }

  return { status: 'success' };
}

export async function POST(req: Request) {
  try {
    // Rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimitResult = rateLimit(`integration:${clientIP}`, 5, 60000); // 5 requests per minute

    if (rateLimitResult.limited) {
      return createSecureResponse(
        { error: 'Rate limit exceeded. Please try again later.' },
        429
      );
    }

    const { hash, studentName, universityName, degreeName, recordUrl, linkedinToken, linkedinMemberId } = await req.json();

    // Validate input data
    const validationErrors = validateCertificateData({
      hash,
      studentName,
      universityName,
      degreeName,
      recordUrl
    });

    if (validationErrors.length > 0) {
      return createSecureResponse(
        { error: 'Invalid input data', details: validationErrors },
        400
      );
    }

    // Validate LinkedIn token if provided
    if (linkedinToken && !validateLinkedInToken(linkedinToken)) {
      return createSecureResponse(
        { error: 'Invalid LinkedIn token format' },
        400
      );
    }

    // Sanitize inputs
    const sanitizedData = {
      hash: sanitizeInput(hash),
      studentName: sanitizeInput(studentName),
      universityName: sanitizeInput(universityName),
      degreeName: sanitizeInput(degreeName),
      recordUrl: sanitizeInput(recordUrl),
      linkedinToken: linkedinToken ? sanitizeInput(linkedinToken) : undefined,
      linkedinMemberId: linkedinMemberId ? sanitizeInput(linkedinMemberId) : undefined,
    };

    const linkedInResult = await sendLinkedInPost(sanitizedData);
    const hrmsResult = await sendHrmsUpdate(sanitizedData);

    return createSecureResponse({
      success: true,
      details: {
        linkedin: linkedInResult.status,
        hrms: hrmsResult.status,
        linkedinReason: linkedInResult.reason,
        hrmsReason: hrmsResult.reason,
        linkedinError: linkedInResult.error,
        hrmsError: hrmsResult.error,
      },
    });
  } catch (error: any) {
    console.error('Integration error:', error);
    return createSecureResponse(
      { error: error?.message || 'Integration route failed.' },
      500
    );
  }
}
