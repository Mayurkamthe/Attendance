const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.getLogin = (req, res) => {
  if (req.session.token) return res.redirect('/dashboard');
  res.render('auth/login', { title: 'Login', error: req.flash('error'), success: req.flash('success') });
};

exports.postLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email, isActive: true });
    if (!user || !(await user.matchPassword(password))) {
      req.flash('error', 'Invalid credentials');
      return res.redirect('/auth/login');
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    req.session.token = token;
    res.redirect('/dashboard');
  } catch (err) {
    req.flash('error', 'Login failed');
    res.redirect('/auth/login');
  }
};

exports.logout = (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
};

exports.getResetPassword = (req, res) => {
  res.render('auth/reset-password', { title: 'Reset Password', error: req.flash('error'), success: req.flash('success') });
};

exports.postResetPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      req.flash('error', 'Email not found');
      return res.redirect('/auth/reset-password');
    }
    user.password = newPassword;
    await user.save();
    req.flash('success', 'Password updated. Please login.');
    res.redirect('/auth/login');
  } catch {
    req.flash('error', 'Reset failed');
    res.redirect('/auth/reset-password');
  }
};
