//ensure that the user is log in before they proceed to different routes
function isLoggedIn(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/login');
}

//disable the access of admin panels to customers
// not working yet - try to fix it
function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  res.status(403).send('Access denied: Admins only');
}

module.exports = { isLoggedIn, isAdmin };
