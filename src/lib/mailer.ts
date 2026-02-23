import nodemailer from 'nodemailer';

// Configure the SMTP transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendDegreeHash(to: string, hash: string, studentName: string) {
  try {
    const mailOptions = {
      from: `"EduVault Ledger" <${process.env.GMAIL_USER}>`,
      to,
      subject: "Academic Credential Minted",
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Hello ${studentName},</h2>
          <p>Your degree has been successfully recorded on the EduVault Ledger.</p>
          <div style="background: #f1f5f9; padding: 10px; border-radius: 5px; font-family: monospace;">
            <strong>Hash:</strong> ${hash}
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Nodemailer Error:", error);
    return { success: false, error };
  }
}
