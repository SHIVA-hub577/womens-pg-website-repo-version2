const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const authController = require('../controllers/authController');

// Landing Page
router.get('/', authController.renderLandingPage);

// Tenant Login & Register Views
router.get('/login', authController.renderTenantLogin);
router.post('/login', authController.loginTenant);
router.get('/register', authController.renderTenantRegister);
router.post('/register', authController.sendRegistrationOtp);

// Admin Login & Register Views
router.get('/admin/login', authController.renderAdminLogin);
router.post('/admin/login', authController.loginAdmin);
router.get('/admin/register', authController.renderAdminRegister);
router.post('/admin/register', authController.sendRegistrationOtp);

// OTP Verification (Registration Completion)
router.post('/auth/verify-otp', authController.verifyRegistrationOtp);

// Google OAuth - Admin
router.get('/auth/google/admin', passport.authenticate('google-admin', {
  scope: ['profile', 'email'],
  session: false
}));

router.get('/auth/google/admin/callback',
  passport.authenticate('google-admin', { failureRedirect: '/admin/login', session: false }),
  authController.googleAdminCallback
);

// Google OAuth - Tenant
router.get('/auth/google/tenant', passport.authenticate('google-tenant', {
  scope: ['profile', 'email'],
  session: false
}));

router.get('/auth/google/tenant/callback',
  passport.authenticate('google-tenant', { failureRedirect: '/login', session: false }),
  authController.googleTenantCallback
);

// Logout
router.get('/auth/logout', authController.logout);

module.exports = router;
