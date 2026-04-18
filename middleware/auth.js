const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const token = req.session.token;
  if (!token) return res.redirect('/auth/login');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user || !req.user.isActive) return res.redirect('/auth/login');
    res.locals.user = req.user;
    next();
  } catch {
    res.redirect('/auth/login');
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  req.flash('error', 'Admin access required');
  res.redirect('/dashboard');
};

module.exports = { protect, adminOnly };
