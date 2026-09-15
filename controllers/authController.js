const bcrypt = require('bcrypt');
const Otp = require('../models/Otp');
const Admin = require('../models/Admin');
const Tenant = require('../models/Tenant');
const Room = require('../models/Room');
const { sendEmail } = require('../services/emailservices');

const getAdminAllowlist = () => {
  const envList = process.env.ADMIN_EMAILS || process.env.GOOGLEUSER || '';
  return envList.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
};

// Render Landing Page (GET /)
const renderLandingPage = (req, res) => {
  if (req.session && req.session.user) {
    if (req.session.user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    } else if (req.session.user.role === 'tenant') {
      return res.redirect('/tenant/profile');
    }
  }
  res.render('index', { hideNavLinks: true });
};

// Render Tenant Login View
const renderTenantLogin = (req, res) => {
  res.render('auth/login', {
    error: req.query.error || null,
    success: req.query.success || null
  });
};

// Render Admin Login View
const renderAdminLogin = (req, res) => {
  res.render('auth/admin-login', {
    error: req.query.error || null,
    success: req.query.success || null
  });
};

// Render Tenant Registration View
const renderTenantRegister = (req, res) => {
  res.render('auth/register', { error: null });
};

// Render Admin Registration View
const renderAdminRegister = (req, res) => {
  res.render('auth/admin-register', { error: null });
};

// Initiate Registration OTP
const sendRegistrationOtp = async (req, res) => {
  const { email, username, password, confirmPassword, purpose } = req.body;
  const isAdminReg = purpose === 'admin-register';
  const targetView = isAdminReg ? 'auth/admin-register' : 'auth/register';

  try {
    if (!email || !username || !password || !confirmPassword || !purpose) {
      return res.render(targetView, { error: 'All fields are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    // Password validation
    if (password !== confirmPassword) {
      return res.render(targetView, { error: 'Passwords do not match.' });
    }

    if (password.length < 8) {
      return res.render(targetView, { error: 'Password must be at least 8 characters long.' });
    }

    // Role-specific allowlist check for Admin
    if (isAdminReg) {
      const allowlist = getAdminAllowlist();
      if (!allowlist.includes(cleanEmail)) {
        return res.render(targetView, { error: 'Unauthorized email address for Admin registration.' });
      }

      // Check if Admin email/username exists
      const existingAdmin = await Admin.findOne({ $or: [{ email: cleanEmail }, { username: cleanUsername }] });
      if (existingAdmin) {
        return res.render(targetView, { error: 'An Admin account with this email or username already exists.' });
      }
    } else {
      // Check if Tenant email/username exists
      const existingTenant = await Tenant.findOne({ $or: [{ email: cleanEmail }, { username: cleanUsername }] });
      if (existingTenant) {
        return res.render(targetView, { error: 'A Tenant account with this email or username already exists.' });
      }
    }

    // Cooldown check (60 seconds)
    const existingOtp = await Otp.findOne({ email: cleanEmail, purpose });
    if (existingOtp && (Date.now() - new Date(existingOtp.createdAt).getTime() < 60000)) {
      return res.render(targetView, {
        error: 'Please wait 60 seconds before requesting a new OTP code.'
      });
    }

    // Hash password before storing temporarily in OTP payload
    const passwordHash = await bcrypt.hash(password, 10);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 mins

    await Otp.findOneAndUpdate(
      { email: cleanEmail, purpose },
      {
        $set: {
          code,
          registrationData: {
            username: cleanUsername,
            passwordHash,
            name: cleanUsername
          },
          createdAt: now,
          expiresAt
        }
      },
      { upsert: true, new: true }
    );

    // Send OTP verification email
    const roleTitle = isAdminReg ? 'Admin' : 'Resident';
    const subject = `Verify Your ${roleTitle} Registration Code: ${code}`;
    const text = `Your verification code is ${code}. It is valid for 5 minutes.`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #2F2F2F;">
        <h2 style="color: #6C63FF;">Pujyasritha's Living</h2>
        <p>Your <strong>${roleTitle} Account Registration</strong> code is:</p>
        <h1 style="background: #F5F6FA; padding: 10px 20px; display: inline-block; letter-spacing: 5px; color: #6C63FF; border-radius: 8px;">${code}</h1>
        <p>This code is valid for 5 minutes.</p>
      </div>
    `;

    try {
      await sendEmail(cleanEmail, subject, text, html);
    } catch (emailErr) {
      console.warn(`⚠️ Could not send email via SMTP (Server down/OAuth expired).`);
      console.warn(`🔑 [DEV VERIFICATION CODE] OTP for ${cleanEmail} (${roleTitle}): ${code}`);
    }

    return res.render('auth/verify-otp', { email: cleanEmail, purpose, error: null });
  } catch (error) {
    console.error('Error in sendRegistrationOtp:', error);
    return res.render(targetView, { error: 'Failed to initiate registration. Please try again.' });
  }
};

// Verify Registration OTP & Create Account
const verifyRegistrationOtp = async (req, res) => {
  try {
    const { email, purpose, code } = req.body;
    if (!email || !purpose || !code) {
      return res.render('auth/verify-otp', { email, purpose, error: 'Please enter the 6-digit code.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    // Atomic lookup & delete with explicit expiry filter
    const otpDoc = await Otp.findOneAndDelete({
      email: cleanEmail,
      purpose,
      code: cleanCode,
      expiresAt: { $gt: new Date() }
    });

    if (!otpDoc || !otpDoc.registrationData) {
      return res.render('auth/verify-otp', {
        email: cleanEmail,
        purpose,
        error: 'Invalid or expired code. Please restart registration.'
      });
    }

    const { username, passwordHash, name, phone } = otpDoc.registrationData;

    if (purpose === 'admin-register') {
      const allowlist = getAdminAllowlist();
      if (!allowlist.includes(cleanEmail)) {
        return res.render('auth/admin-register', { error: 'Unauthorized email address.' });
      }

      await Admin.create({
        username,
        passwordHash,
        email: cleanEmail,
        name: name || username
      });

      return res.redirect('/admin/login?success=Admin account registered successfully. Please log in.');
    }

    if (purpose === 'tenant-register') {
      const roomMatch = await Room.findOne({ 'tenants.email': cleanEmail });
      let tenantId = null;
      let roomNumber = null;
      let matchedName = name || username;
      let matchedPhone = phone || '';

      if (roomMatch) {
        const embedded = roomMatch.tenants.find(t => t.email === cleanEmail);
        if (embedded) {
          tenantId = embedded.tenantId;
          matchedName = embedded.name || matchedName;
          matchedPhone = embedded.phone || matchedPhone;
        }
        roomNumber = roomMatch.roomNumber;
      }

      await Tenant.create({
        username,
        passwordHash,
        email: cleanEmail,
        name: matchedName,
        phone: matchedPhone,
        tenantId,
        roomNumber
      });

      return res.redirect('/login?success=Resident account registered successfully. Please log in.');
    }

    return res.redirect('/login');
  } catch (error) {
    console.error('Error in verifyRegistrationOtp:', error);
    return res.render('auth/verify-otp', {
      email: req.body.email,
      purpose: req.body.purpose,
      error: 'Account creation failed. Username or email may already be in use.'
    });
  }
};

// Tenant Login (Username + Password)
const loginTenant = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.render('auth/login', { error: 'Incorrect username or password', success: null });
    }

    const cleanUsername = username.trim().toLowerCase();
    const tenant = await Tenant.findOne({
      $or: [{ username: cleanUsername }, { email: cleanUsername }]
    });

    if (!tenant) {
      return res.render('auth/login', { error: 'Incorrect username or password', success: null });
    }

    const isMatch = await bcrypt.compare(password, tenant.passwordHash);
    if (!isMatch) {
      return res.render('auth/login', { error: 'Incorrect username or password', success: null });
    }

    req.session.user = {
      id: tenant._id,
      email: tenant.email,
      username: tenant.username,
      name: tenant.name || tenant.username,
      role: 'tenant',
      tenantId: tenant.tenantId || null,
      roomNumber: tenant.roomNumber || null
    };

    req.session.save((err) => {
      if (err) console.error('Session save error:', err);
      return res.redirect('/tenant/profile');
    });
  } catch (error) {
    console.error('Error in loginTenant:', error);
    return res.render('auth/login', { error: 'Incorrect username or password', success: null });
  }
};

// Admin Login (Username + Password)
const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.render('auth/admin-login', { error: 'Incorrect username or password', success: null });
    }

    const cleanUsername = username.trim().toLowerCase();
    const admin = await Admin.findOne({
      $or: [{ username: cleanUsername }, { email: cleanUsername }]
    });

    if (!admin) {
      return res.render('auth/admin-login', { error: 'Incorrect username or password', success: null });
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return res.render('auth/admin-login', { error: 'Incorrect username or password', success: null });
    }

    req.session.user = {
      id: admin._id,
      email: admin.email,
      username: admin.username,
      name: admin.name || admin.username,
      role: 'admin'
    };

    req.session.save((err) => {
      if (err) console.error('Session save error:', err);
      return res.redirect('/admin/dashboard');
    });
  } catch (error) {
    console.error('Error in loginAdmin:', error);
    return res.render('auth/admin-login', { error: 'Incorrect username or password', success: null });
  }
};

// Google Admin Callback
const googleAdminCallback = async (req, res) => {
  try {
    if (!req.user || !req.user.emails || !req.user.emails[0]) {
      return res.redirect('/admin/login?error=Google authentication failed.');
    }

    const email = req.user.emails[0].value.toLowerCase().trim();
    const displayName = req.user.displayName || email.split('@')[0];
    const googleId = req.user.id;

    const allowlist = getAdminAllowlist();
    if (!allowlist.includes(email)) {
      return res.redirect('/admin/login?error=Unauthorized admin email account.');
    }

    let admin = await Admin.findOne({ email });
    if (admin) {
      if (!admin.googleId) {
        admin.googleId = googleId;
        await admin.save();
      }
    } else {
      const defaultUsername = email.split('@')[0] + '_' + Math.floor(100 + Math.random() * 900);
      const defaultPasswordHash = await bcrypt.hash(Math.random().toString(36), 10);
      admin = await Admin.create({
        username: defaultUsername,
        passwordHash: defaultPasswordHash,
        email,
        name: displayName,
        googleId
      });
    }

    req.session.user = {
      id: admin._id,
      email: admin.email,
      username: admin.username,
      name: admin.name || displayName,
      role: 'admin'
    };

    return res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Error in googleAdminCallback:', error);
    return res.redirect('/admin/login?error=Authentication error.');
  }
};

// Google Tenant Callback
const googleTenantCallback = async (req, res) => {
  try {
    if (!req.user || !req.user.emails || !req.user.emails[0]) {
      return res.redirect('/login?error=Google authentication failed.');
    }

    const email = req.user.emails[0].value.toLowerCase().trim();
    const displayName = req.user.displayName || email.split('@')[0];
    const googleId = req.user.id;

    let tenant = await Tenant.findOne({ email });
    if (tenant) {
      if (!tenant.googleId) {
        tenant.googleId = googleId;
        await tenant.save();
      }
    } else {
      const defaultUsername = email.split('@')[0] + '_' + Math.floor(100 + Math.random() * 900);
      const defaultPasswordHash = await bcrypt.hash(Math.random().toString(36), 10);
      const roomMatch = await Room.findOne({ 'tenants.email': email });
      
      let tenantId = null;
      let roomNumber = null;
      let matchedName = displayName;

      if (roomMatch) {
        const embedded = roomMatch.tenants.find(t => t.email === email);
        if (embedded) {
          tenantId = embedded.tenantId;
          matchedName = embedded.name || matchedName;
        }
        roomNumber = roomMatch.roomNumber;
      }

      tenant = await Tenant.create({
        username: defaultUsername,
        passwordHash: defaultPasswordHash,
        email,
        name: matchedName,
        googleId,
        tenantId,
        roomNumber
      });
    }

    req.session.user = {
      id: tenant._id,
      email: tenant.email,
      username: tenant.username,
      name: tenant.name || displayName,
      role: 'tenant',
      tenantId: tenant.tenantId || null,
      roomNumber: tenant.roomNumber || null
    };

    return res.redirect('/tenant/profile');
  } catch (error) {
    console.error('Error in googleTenantCallback:', error);
    return res.redirect('/login?error=Authentication error.');
  }
};

// Logout Handler
const logout = (req, res) => {
  if (req.session) {
    req.session.destroy(() => {
      res.redirect('/');
    });
  } else {
    res.redirect('/');
  }
};

module.exports = {
  renderLandingPage,
  renderTenantLogin,
  renderAdminLogin,
  renderTenantRegister,
  renderAdminRegister,
  sendRegistrationOtp,
  verifyRegistrationOtp,
  loginTenant,
  loginAdmin,
  googleAdminCallback,
  googleTenantCallback,
  logout
};
