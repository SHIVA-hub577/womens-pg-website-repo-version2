require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.GOOGLEUSER,
    clientId: process.env.GOOGLECLIENTID,
    clientSecret: process.env.GOOGLECLIENTSECRET,
    refreshToken: process.env.GOOGLEREFRESHTOKEN || process.env.GOGOLEREFRESHTOKEN,
  },
});

// Verify the connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Error connecting to email server:', error.message);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// Function to send email
const sendEmail = async (to, subject, text, html, attachments = []) => {
  try {
    const mailOptions = {
      from: `"Pujyasritha's Living" <${process.env.GOOGLEUSER}>`,
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
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = { transporter, sendEmail };