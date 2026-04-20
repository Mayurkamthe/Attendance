const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.getLogin = (req, res) => {
  if (req.session.token) return res.redirect('/dashboard');
  res.render('auth/login', {
    title: 'Login',
    error: req.flash('error'),
    success: req.flash('success')
  });
};

exports.postLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    req.flash('error', 'Email and password are required');
    return res.redirect('/auth/login');
  }
  try {
    const user = await User.findOne({ email: email.trim().toLowerCase(), isActive: true });
    if (!user) {
      req.flash('error', 'No active account found with that email');
      return res.redirect('/auth/login');
    }
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      req.flash('error', 'Incorrect password');
      return res.redirect('/auth/login');
    }
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not set in environment');
      req.flash('error', 'Server configuration error. Contact admin.');
      return res.redirect('/auth/login');
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    req.session.token = token;
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        req.flash('error', 'Session error. Please try again.');
        return res.redirect('/auth/login');
      }
      res.redirect('/dashboard');
    });
  } catch (err) {
    console.error('Login error:', err);
    req.flash('error', 'Login failed: ' + err.message);
    res.redirect('/auth/login');
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => res.redirect('/auth/login'));
};

exports.getResetPassword = (req, res) => {
  res.render('auth/reset-password', {
    title: 'Forgot Password'
  });
};
