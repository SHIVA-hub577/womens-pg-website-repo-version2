# Email Service Setup & Working Guide

This document explains how email sending is configured in this project using **Nodemailer** with **Gmail App Passwords** (and OAuth2 fallback), how credentials are generated, and how to replicate this setup in future projects.

---

## 🚀 How It Works

Instead of using complex OAuth2 refresh tokens (which expire every 7 days in Google Cloud testing mode), this application uses standard **Gmail SMTP Authentication** with a 16-character **App Password**.

```
+------------------+         +------------------+         +--------------------+
|  Node.js Express |  ---->  |  smtp.gmail.com  |  ---->  |  Recipient Inbox   |
|   (Nodemailer)   |         |    (Port 465)    |         |  (e.g., Gmail)     |
+------------------+         +------------------+         +--------------------+
```

### Key Advantages:
- **No OAuth Setup Required**: No need for Google Cloud Console, OAuth Client IDs, or OAuth Playgrounds.
- **Never Expires**: Gmail App Passwords do not expire unless manually revoked.
- **Direct & Reliable**: Uses direct SSL connection on port 465.

---

## 🔑 How to Generate Credentials

### Method 1: Gmail App Password (⚡ Quickest & Recommended)

1. Open your **[Google Account Security Settings](https://myaccount.google.com/security)**.
2. Make sure **2-Step Verification** is turned **ON** for your Gmail account.
3. Open **[Google App Passwords](https://myaccount.google.com/apppasswords)**.
4. Under **App name**, type `Nodemailer` (or your project name) and click **Create**.
5. Google will generate a **16-letter App Password** (e.g., `abcd efgh ijkl mnop`).
6. Copy the 16-letter code and save it in your `.env` file:
   ```env
   GOOGLEUSER=your_email@gmail.com
   GMAIL_APP_PASSWORD=abcdefghijklmnop
   ```

---

### Method 2: Google OAuth2 Credentials (Alternative)

If you prefer using OAuth2 tokens instead of an App Password:

#### 1. Google Cloud Console Setup
1. Go to the **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Create a new project (e.g., `My-Email-App`).
3. Navigate to **APIs & Services** > **Enabled APIs & Services** and enable the **Gmail API**.
4. Go to **OAuth consent screen**:
   - Select **External** > Fill in App Name & Support Email.
   - Add your email under **Test Users**.
5. Go to **Credentials** > **Create Credentials** > **OAuth Client ID**:
   - Application type: **Web application**.
   - Add Authorized redirect URI: `https://developers.google.com/oauthplayground`
   - Click **Create** and copy your **Client ID** and **Client Secret**.

#### 2. Obtain Refresh Token via OAuth Playground
1. Open **[OAuth 2.0 Playground](https://developers.google.com/oauthplayground)**.
2. Click the **Gear Icon (⚙️)** in the top-right corner:
   - Check **"Use your own OAuth credentials"**.
   - Paste your **OAuth Client ID** and **OAuth Client Secret**.
3. On the left panel under **Gmail API v1**, select `https://mail.google.com/`.
4. Click **Authorize APIs** and log in with your Gmail account.
5. Click **Exchange authorization code for tokens**.
6. Copy the generated `refresh_token` and save in `.env`:
   ```env
   GOOGLEUSER=your_email@gmail.com
   GOOGLECLIENTID=your_client_id.apps.googleusercontent.com
   GOOGLECLIENTSECRET=your_client_secret
   GOOGLEREFRESHTOKEN=your_refresh_token
   ```

---

## ⚖️ Code Comparison: App Password vs OAuth2

The Nodemailer setup code is **over 90% identical** for both methods. Only the `auth` configuration block changes:

### App Password Setup
```javascript
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GOOGLEUSER,
    pass: process.env.GMAIL_APP_PASSWORD, // Simple user + 16-character pass
  },
});
```

### OAuth2 Setup
```javascript
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.GOOGLEUSER,
    clientId: process.env.GOOGLECLIENTID,
    clientSecret: process.env.GOOGLECLIENTSECRET,
    refreshToken: process.env.GOOGLEREFRESHTOKEN,
  },
});
```

---

## 🛠️ Current Project Implementation

### 1. Environment Configuration (`.env`)
```env
GOOGLEUSER=shivasiddamshetty26@gmail.com
GMAIL_APP_PASSWORD=osvyzcoptntvhvxx
```

### 2. Email Service Module (`services/emailservices.js`)

```javascript
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

// Verify connection configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.warn('⚠️ Warning: Email server connection failed:', error.message);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

// Helper function to send email
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
    console.error('❌ Error sending email:', error.message || error);
    console.log('----------------------------------------------------');
    console.log(`📬 [TERMINAL FALLBACK LOG] Email to: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content: ${text}`);
    console.log('----------------------------------------------------');
    throw error;
  }
};

module.exports = { transporter, sendEmail };
```

---

## 📋 Step-by-Step Setup Guide for Future Projects

### Step 1: Install Packages
```bash
npm install nodemailer dotenv
```

### Step 2: Add Environment Variables (`.env`)
```env
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_letter_app_password
```

### Step 3: Create Service File (`services/emailService.js`)
```javascript
require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email server connection failed:', error.message);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

const sendEmail = async (to, subject, text, html) => {
  try {
    const mailOptions = {
      from: `"My App" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
};

module.exports = { sendEmail };
```

### Step 4: Call `sendEmail` in Controllers
```javascript
const { sendEmail } = require('./services/emailService');

await sendEmail(
  'user@example.com',
  'Welcome to Our App',
  'Thank you for signing up!',
  '<h1>Welcome to Our App!</h1>'
);
```

---

## 📩 Automated Tenant Complaint Notification Feature

When a tenant submits a new maintenance complaint in the portal (`POST /tenant/complaints`), the system automatically sends an email to the admin (`ADMIN_EMAILS` or `GOOGLEUSER`).

### Features:
- **Full Resident Details**: Includes Resident Name, Email, Tenant ID, Room Number, and Timestamp.
- **Complaint Description**: Cleanly formatted description block.
- **Inline Image & Attachment**: If the tenant uploads a photo (`req.file`), the image is attached to the email and rendered directly inside the email HTML using `cid:complaint_photo`.

### Code Implementation (`controllers/complaintController.js`):
```javascript
const attachments = [];
if (req.file) {
  attachments.push({
    filename: req.file.filename,
    path: req.file.path,
    cid: 'complaint_photo' // Inline image content ID
  });
}

const html = `
  <h2>🚨 New Tenant Complaint Raised</h2>
  <p><strong>Resident Name:</strong> ${tenantName}</p>
  <p><strong>Room Number:</strong> Room ${roomNumber}</p>
  <p><strong>Description:</strong> ${description}</p>
  ${req.file ? '<img src="cid:complaint_photo" style="max-width: 100%;" />' : ''}
`;

await sendEmail(adminEmail, subject, text, html, attachments);
```

