import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { email, studentName, univName, hash } = await req.json();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"EduVault Ledger" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Credential Minted: ${studentName}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #fcfcfc;">
          <h2 style="color: #4f46e5;">Academic Credential Issued</h2>
          <p>Hello <strong>${studentName}</strong>,</p>
          <p>Your degree has been successfully minted into the <strong>${univName}</strong> digital ledger.</p>
          <div style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; font-family: monospace; color: #334155;">
            <strong>Blockchain Hash:</strong><br/>
            <span style="word-break: break-all; color: #6366f1;">${hash}</span>
          </div>
          <p style="margin-top: 20px; font-size: 11px; color: #94a3b8;">
            This is an automated institutional message from EduVault.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Email Error" }, { status: 500 });
  }
}
