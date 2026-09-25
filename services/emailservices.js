const { Resend } = require('resend');

// Initialize Resend API client strictly
const resend = new Resend(process.env.RESEND_API_KEY);

// Function to send email strictly using Resend API (No Nodemailer / No Google SMTP)
const sendEmail = async (to, subject, text, html, attachments = []) => {
  try {
    const recipientList = Array.isArray(to) ? to : [to];
    const payload = {
      from: 'onboarding@resend.dev',
      to: recipientList,
      subject,
      text,
      html,
    };

    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      payload.attachments = attachments.map((att) => ({
        filename: att.filename,
        content: Buffer.isBuffer(att.content) ? att.content : Buffer.from(att.content),
      }));
    }

    const { data, error } = await resend.emails.send(payload);

    if (error) {
      console.error('❌ Resend API Error:', error);
      throw new Error(error.message || 'Failed to send email via Resend');
    }

    console.log('✅ Message sent via Resend API:', data.id);
    return data;
  } catch (error) {
    console.error('❌ Error sending email via Resend API:', error.message || error);
    console.log('----------------------------------------------------');
    console.log(`📬 [TERMINAL FALLBACK LOG] Email to: ${Array.isArray(to) ? to.join(', ') : to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content: ${text}`);
    console.log('----------------------------------------------------');
    throw error;
  }
};

// Utility wrapper to send simple notification email with soft luxury anti-gravity HTML styling
const sendNotification = async (email, subject, message) => {
  const html = `
    <div style="background-color: #faf4f5; padding: 40px 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(107, 44, 62, 0.08); border: 1px solid #f3e8eb;">
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #6b2c3e 0%, #4a1d2a 100%); padding: 35px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; font-family: 'Georgia', serif;">Pujyasritha's Living</h1>
          <p style="color: #fce7f3; margin: 6px 0 0 0; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; opacity: 0.9;">Boutique Women's Hostel & PG</p>
        </div>
        <!-- Body Content -->
        <div style="padding: 35px 30px;">
          <h2 style="color: #6b2c3e; margin-top: 0; font-size: 18px; font-weight: 600; font-family: 'Georgia', serif;">${subject}</h2>
          <div style="font-size: 15px; line-height: 1.6; color: #475569; margin: 20px 0;">
            ${message}
          </div>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
            <span style="display: inline-block; background: #fff5f7; color: #6b2c3e; font-size: 12px; font-weight: 600; padding: 6px 16px; border-radius: 20px; border: 1px solid #fce7f3;">Official Notification</span>
          </div>
        </div>
        <!-- Footer -->
        <div style="background-color: #fdf2f4; padding: 20px 30px; text-align: center; border-top: 1px solid #fce7f3;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5;">
            © 2026 Pujyasritha's Living Women's PG. All rights reserved.<br/>
            This is an automated notification. Please do not reply directly to this email.
          </p>
        </div>
      </div>
    </div>
  `;
  return await sendEmail(email, subject, message, html);
};

module.exports = { resend, sendEmail, sendNotification };