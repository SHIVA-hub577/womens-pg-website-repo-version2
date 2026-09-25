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

// Utility wrapper to send simple notification email strictly using Resend API
const sendNotification = async (email, subject, message) => {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #2F2F2F; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px; background: #ffffff;">
      <h2 style="color: #6b2c3e; margin-top: 0;">Pujyasritha's Living</h2>
      <p style="font-size: 16px; line-height: 1.5; color: #333;">${message}</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #888; text-align: center; margin: 0;">
        This is an automated notification from Pujyasritha's Living Management System.
      </p>
    </div>
  `;
  return await sendEmail(email, subject, message, html);
};

module.exports = { resend, sendEmail, sendNotification };