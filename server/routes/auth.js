const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { EMAIL_RE } = require('../utils/helpers');

const router = express.Router();

const signToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const publicUser = (user) => ({ _id: user._id, name: user.name, email: user.email });

// POST /api/auth/register
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (name.length < 2) throw new HttpError(400, 'Name must be at least 2 characters');
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Enter a valid email address');
    if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
    if (await User.findOne({ email })) {
      throw new HttpError(409, 'An account with this email already exists');
    }

    const user = await User.create({ name, email, password });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  })
);

// POST /api/auth/login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      throw new HttpError(401, 'Invalid email or password');
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  })
);

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

module.exports = router;
