const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use('google-admin', new GoogleStrategy({
  clientID: process.env.GOOGLECLIENTID,
  clientSecret: process.env.GOOGLECLIENTSECRET,
  callbackURL: '/auth/google/admin/callback'
}, (accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));

passport.use('google-tenant', new GoogleStrategy({
  clientID: process.env.GOOGLECLIENTID,
  clientSecret: process.env.GOOGLECLIENTSECRET,
  callbackURL: '/auth/google/tenant/callback'
}, (accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));

module.exports = passport;
