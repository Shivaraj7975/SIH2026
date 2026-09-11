import { Router } from 'express';
import { authenticateUser, registerUser, createSessionToken } from '../services/auth.service.js';
import { UsersRepository } from '../repositories/users.repository.js';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const { username, displayName, avatar, password } = req.body;
    const user = await registerUser({ username, displayName, avatar, password });
    const token = createSessionToken(user.id);

    res.cookie('geofit_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      user,
      token,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await authenticateUser(username, password);
    const token = createSessionToken(user.id);

    res.cookie('geofit_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      user,
      token,
    });
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
});

router.get('/me', optionalAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.json({
        success: true,
        user: null,
        isAuthenticated: false,
      });
    }

    res.json({
      success: true,
      user: req.user,
      isAuthenticated: true,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('geofit_token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  res.json({ success: true, message: 'Logged out successfully' });
});

router.get('/users', async (req, res, next) => {
  try {
    const users = await UsersRepository.findAll();
    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
});

export default router;
