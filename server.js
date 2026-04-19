require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const path = require('path');
const connectDB = require('./config/db');
const User = require('./models/User');

const app = express();

// Trust Render's reverse proxy (required for secure cookies + correct IPs)
app.set('trust proxy', 1);

connectDB();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret_change_me',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600
  }),
  cookie: {
    maxAge: 86400000,
    secure: false,   // keep false — Render handles HTTPS termination at proxy level
    httpOnly: true,
    sameSite: 'lax'
  }
}));

app.use(flash());

// Global locals from .env
app.use((req, res, next) => {
  res.locals.collegeName    = process.env.COLLEGE_NAME    || 'College Name';
  res.locals.collegeAddress = process.env.COLLEGE_ADDRESS || '';
  res.locals.collegePhone   = process.env.COLLEGE_PHONE   || '';
  res.locals.collegeEmail   = process.env.COLLEGE_EMAIL   || '';
  res.locals.waEnabled      = process.env.WA_ENABLED === 'true';
  res.locals.attStart       = process.env.ATTENDANCE_START || '08:00';
  res.locals.attEnd         = process.env.ATTENDANCE_END   || '18:00';
  next();
});

// Routes
app.use('/auth',    require('./routes/auth'));
app.use('/admin',   require('./routes/admin'));
app.use('/teacher', require('./routes/teacher'));

app.get('/', (req, res) => res.redirect('/auth/login'));

app.get('/dashboard', (req, res) => {
  if (!req.session.token) return res.redirect('/auth/login');
  const jwt = require('jsonwebtoken');
  try {
    const decoded = jwt.verify(req.session.token, process.env.JWT_SECRET);
    User.findById(decoded.id).then(user => {
      if (!user) return res.redirect('/auth/login');
      res.redirect(user.role === 'admin' ? '/admin/dashboard' : '/teacher/dashboard');
    });
  } catch { res.redirect('/auth/login'); }
});

// Seed admin on first run
const seedAdmin = async () => {
  try {
    const exists = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (!exists) {
      await User.create({
        name: 'Administrator',
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        role: 'admin'
      });
      console.log('Admin seeded:', process.env.ADMIN_EMAIL);
    }
  } catch (e) {
    console.error('Seed error:', e.message);
  }
};
seedAdmin();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
