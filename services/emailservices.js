const { Resend } = require('resend');

// Initialize Resend API client
const resend = new Resend(process.env.RESEND_API_KEY);

// Utility wrapper to send simple notification email via Resend
const sendNotification = async (email, subject, message) => {
  try {
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

    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: subject,
      html: html,
      text: message,
    });

    if (error) {
      console.error('❌ Resend API Error:', error);
      throw new Error(error.message || 'Failed to send email via Resend');
    }

    console.log('✅ Email sent successfully via Resend:', data.id);
    return data;
  } catch (err) {
    console.error('❌ Error in sendNotification:', err.message || err);
    console.log('----------------------------------------------------');
    console.log(`📬 [TERMINAL FALLBACK LOG] Email to: ${email}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content: ${message}`);
    console.log('----------------------------------------------------');
    throw err;
  }
};

// General function to send email with support for HTML and attachments via Resend
const sendEmail = async (to, subject, text, html, attachments = []) => {
  try {
    const payload = {
      from: 'onboarding@resend.dev',
      to: Array.isArray(to) ? to : [to],
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

    console.log('✅ Message sent via Resend:', data.id);
    return data;
  } catch (error) {
    console.error('❌ Error sending email via Resend:', error.message || error);
    console.log('----------------------------------------------------');
    console.log(`📬 [TERMINAL FALLBACK LOG] Email to: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content: ${text}`);
    console.log('----------------------------------------------------');
    throw error;
  }
};

module.exports = { resend, sendEmail, sendNotification };