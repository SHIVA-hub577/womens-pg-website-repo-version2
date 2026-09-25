const setUserLocals = (req, res, next) => {
  res.locals.user = req.session ? req.session.user : undefined;
  next();
};

const isAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  res.redirect('/admin/login');
};

const isTenant = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'tenant') {
    return next();
  }
  res.redirect('/login');
};

const isWorker = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'worker') {
    return next();
  }
  res.redirect('/worker/login');
};

module.exports = {
  setUserLocals,
  isAdmin,
  isTenant,
  isWorker,
};
