import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const { email, studentName, univName, hash } = await req.json();
  const { data, error } = await resend.emails.send({
    from: 'EduVault <onboarding@resend.dev>', // Must be exactly this for free tier
    to: [email], // Note: In free mode, this must be YOUR email
    subject: `Credential Issued: ${studentName}`,
    html: `<p>Hi ${studentName}, your hash from ${univName} is: <b>${hash}</b></p>`
  });
  return error ? NextResponse.json({ error }, { status: 500 }) : NextResponse.json(data);
}
