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

    return await sendEmail(email, subject, message, html);
  } catch (err) {
    console.error('❌ Error in sendNotification:', err.message || err);
    throw err;
  }
};

// General function to send email with support for HTML and attachments via Resend
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
      const errMsg = error.message || (typeof error === 'string' ? error : JSON.stringify(error));
      // Handle Resend free tier restriction ("You can only send testing emails to your own email address")
      if (
        errMsg.includes('only send testing emails') || 
        errMsg.includes('only send to your own email address') || 
        error.name === 'validation_error'
      ) {
        const ownerEmail = process.env.ADMIN_EMAIL || process.env.GOOGLEUSER || 'shivasiddamshetty26@gmail.com';
        console.warn(`⚠️ Resend Onboarding Notice: Cannot send directly to (${recipientList.join(', ')}) on onboarding domain. Rerouting email to verified account owner (${ownerEmail}).`);

        const fallbackPayload = {
          ...payload,
          to: [ownerEmail],
          subject: `[FOR TENANT: ${recipientList.join(', ')}] ${subject}`
        };

        const fallbackResult = await resend.emails.send(fallbackPayload);
        if (fallbackResult.error) {
          console.error('❌ Resend Fallback Error:', fallbackResult.error);
          throw new Error(fallbackResult.error.message || 'Resend API Error');
        }
        console.log('✅ Message sent via Resend (Rerouted to Owner Inbox):', fallbackResult.data.id);
        return fallbackResult.data;
      }

      console.error('❌ Resend API Error:', error);
      throw new Error(errMsg);
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