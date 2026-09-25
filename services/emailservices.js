require('dotenv').config();
const nodemailer = require('nodemailer');

const createTransporter = () => {
  const user = process.env.GOOGLEUSER;
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.GOOGLEPASS || process.env.EMAIL_PASS;

  // Use standard Gmail App Password authentication if provided
  if (pass) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });
  }

  // Fallback to Google OAuth2 authentication
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.GOOGLEUSER,
      clientId: process.env.GOOGLECLIENTID,
      clientSecret: process.env.GOOGLECLIENTSECRET,
      refreshToken: process.env.GOOGLEREFRESHTOKEN || process.env.GOGOLEREFRESHTOKEN,
    },
  });
};

const transporter = createTransporter();

// Verify the connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.warn('⚠️ Warning: Email server connection failed:', error.message);
    console.warn('💡 Tip: Your GOOGLEREFRESHTOKEN may be expired (invalid_grant).');
    console.warn('💡 Fix: Add GMAIL_APP_PASSWORD=your_16_char_app_password to .env OR update your GOOGLEREFRESHTOKEN.');
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

// Function to send email
const sendEmail = async (to, subject, text, html, attachments = []) => {
  try {
    const mailOptions = {
      from: `"Pujyasritha's Living" <${process.env.GOOGLEUSER || 'noreply@pujyasrithasliving.com'}>`,
      to,
      subject,
      text,
      html,
    };

    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      mailOptions.attachments = attachments;
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending email:', error.message || error);
    console.log('----------------------------------------------------');
    console.log(`📬 [TERMINAL FALLBACK LOG] Email to: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content: ${text}`);
    console.log('----------------------------------------------------');
    throw error;
  }
};

// Utility wrapper to send simple notification email
const sendNotification = async (email, subject, message) => {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #2F2F2F; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #6C63FF; margin-top: 0;">Pujyasritha's Living</h2>
      <p style="font-size: 16px; line-height: 1.5; color: #333;">${message}</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #888; text-align: center; margin: 0;">
        This is an automated notification from Pujyasritha's Living Management System.
      </p>
    </div>
  `;
  return await sendEmail(email, subject, message, html);
};

module.exports = { transporter, sendEmail, sendNotification };