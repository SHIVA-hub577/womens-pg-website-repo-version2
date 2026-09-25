const nodemailer = require('nodemailer');
const dns = require('dns');
const http = require('http');
const https = require('https');

// Force Node.js process to prefer IPv4 over IPv6 globally (fixes Render IPv6 ENETUNREACH)
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

// Force HTTP and HTTPS agents to use IPv4 family
if (http.globalAgent) http.globalAgent.options.family = 4;
if (https.globalAgent) https.globalAgent.options.family = 4;

// Explicitly resolve smtp.gmail.com to an IPv4 IP address to prevent Node C++ getaddrinfo from returning IPv6
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

const createTransporter = async () => {
  const user = process.env.GOOGLEUSER;
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.GOOGLEPASS || process.env.EMAIL_PASS;
  const targetIp = await resolveIPv4Host('smtp.gmail.com');

  // Primary: Standard App Password authentication (Direct IPv4 / Port 465 / SSL)
  if (pass) {
    return nodemailer.createTransport({
      host: targetIp,
      port: 465,
      secure: true, // Direct SSL
      tls: {
        servername: 'smtp.gmail.com', // Required for SSL certificate validation
      },
      auth: {
        user,
        pass: pass.replace(/\s+/g, ''), // Clean any accidental whitespace
      },
      connectionTimeout: 25000,
      greetingTimeout: 20000,
      socketTimeout: 25000,
    });
  }

  // Fallback: Google OAuth2 authentication (Direct IPv4 / Port 465 / SSL)
  return nodemailer.createTransport({
    host: targetIp,
    port: 465,
    secure: true,
    tls: {
      servername: 'smtp.gmail.com',
    },
    auth: {
      type: 'OAuth2',
      user: process.env.GOOGLEUSER,
      clientId: process.env.GOOGLECLIENTID,
      clientSecret: process.env.GOOGLECLIENTSECRET,
      refreshToken: process.env.GOOGLEREFRESHTOKEN || process.env.GOGOLEREFRESHTOKEN,
    },
    connectionTimeout: 25000,
    greetingTimeout: 20000,
    socketTimeout: 25000,
  });
};

// Default static transporter initialized asynchronously
let activeTransporterPromise = createTransporter();

// Verify connection configuration on boot
activeTransporterPromise.then((transporter) => {
  transporter.verify((error, success) => {
    if (error) {
      console.warn('⚠️ Warning: Email server connection failed:', error.message);
      console.warn('💡 Tip: Make sure GMAIL_APP_PASSWORD is added in your environment variables (.env / Render settings).');
    } else {
      console.log('✅ Email server is ready to send messages (Direct IPv4 TLS)');
    }
  });
}).catch((err) => {
  console.warn('⚠️ Warning: Transporter setup error:', err.message);
});

// Function to send email
const sendEmail = async (to, subject, text, html, attachments = []) => {
  try {
    const transporter = await createTransporter();
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

module.exports = { transporter: activeTransporterPromise, sendEmail, sendNotification };