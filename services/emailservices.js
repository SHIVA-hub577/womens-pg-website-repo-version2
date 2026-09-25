const nodemailer = require('nodemailer');
const dns = require('dns');
const http = require('http');
const https = require('https');
const { Resend } = require('resend');

// Force Node.js process to prefer IPv4 over IPv6 globally (fixes Render IPv6 ENETUNREACH)
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
if (http.globalAgent) http.globalAgent.options.family = 4;
if (https.globalAgent) https.globalAgent.options.family = 4;

// Initialize Resend instance if key is present
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Helper to resolve smtp.gmail.com explicitly to an IPv4 IP address string
const resolveIPv4Host = (hostname) => {
  return new Promise((resolve) => {
    dns.lookup(hostname, { family: 4 }, (err, address) => {
      if (!err && address) {
        return resolve(address);
      }
      // Hardcoded fallback Gmail SMTP IPv4 address if DNS lookup fails
      resolve('142.250.107.108');
    });
  });
};

// Create direct IPv4 Nodemailer Transporter (delivers to ANY real tenant email address without domain setup)
const createNodemailerTransporter = async () => {
  const user = process.env.GOOGLEUSER || 'shivasiddamshetty26@gmail.com';
  const pass = (process.env.GMAIL_APP_PASSWORD || process.env.GOOGLEPASS || process.env.EMAIL_PASS || '').replace(/\s+/g, '');
  const targetIp = await resolveIPv4Host('smtp.gmail.com');

  return nodemailer.createTransport({
    host: targetIp, // Direct IPv4 IP string completely eliminates IPv6 ENETUNREACH on Render
    port: 465,
    secure: true, // Direct SSL
    tls: {
      servername: 'smtp.gmail.com', // Required for SSL certificate validation
    },
    auth: {
      user,
      pass,
    },
    connectionTimeout: 25000,
    greetingTimeout: 20000,
    socketTimeout: 25000,
  });
};

// Function to send email with automatic fallback between Resend and Gmail App Password Nodemailer
const sendEmail = async (to, subject, text, html, attachments = []) => {
  const recipientList = Array.isArray(to) ? to : [to];
  const userEmail = process.env.GOOGLEUSER || 'shivasiddamshetty26@gmail.com';

  // Strategy 1: Try Gmail App Password Nodemailer directly (Delivers to ANY tenant email address without domain verification)
  try {
    const transporter = await createNodemailerTransporter();
    const mailOptions = {
      from: `"Pujyasritha's Living" <${userEmail}>`,
      to: recipientList.join(', '),
      subject,
      text,
      html,
    };

    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      mailOptions.attachments = attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType
      }));
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email delivered directly to tenant inbox (%s) via Gmail SMTP: %s', recipientList.join(', '), info.messageId);
    return info;
  } catch (gmailErr) {
    console.warn(`⚠️ Gmail Direct SMTP Notice (${gmailErr.message}). Attempting Resend API fallback...`);
  }

  // Strategy 2: Fallback to Resend API if available
  if (resend) {
    try {
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
        if (
          errMsg.includes('only send testing emails') ||
          errMsg.includes('only send to your own email address') ||
          error.name === 'validation_error'
        ) {
          const ownerEmail = process.env.ADMIN_EMAIL || userEmail;
          console.warn(`⚠️ Resend Sandbox Notice: Cannot send directly to (${recipientList.join(', ')}) on onboarding domain. Rerouting to owner (${ownerEmail}).`);

          const fallbackPayload = {
            ...payload,
            to: [ownerEmail],
            subject: `[FOR TENANT: ${recipientList.join(', ')}] ${subject}`
          };

          const fallbackResult = await resend.emails.send(fallbackPayload);
          if (fallbackResult.error) {
            throw new Error(fallbackResult.error.message);
          }
          console.log('✅ Email sent via Resend (Rerouted to Owner Inbox):', fallbackResult.data.id);
          return fallbackResult.data;
        }
        throw new Error(errMsg);
      }

      console.log('✅ Message sent via Resend:', data.id);
      return data;
    } catch (resendErr) {
      console.error('❌ Resend Fallback Error:', resendErr.message || resendErr);
    }
  }

  // Terminal Fallback Log if both fail
  console.log('----------------------------------------------------');
  console.log(`📬 [TERMINAL FALLBACK LOG] Email to: ${recipientList.join(', ')}`);
  console.log(`Subject: ${subject}`);
  console.log(`Content: ${text}`);
  console.log('----------------------------------------------------');
  throw new Error(`Failed to send email to ${recipientList.join(', ')}`);
};

// Utility wrapper to send simple notification email
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