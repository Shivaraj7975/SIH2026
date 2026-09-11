import { verifySessionToken } from '../services/auth.service.js';
import { UsersRepository } from '../repositories/users.repository.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const tokenCookie = req.cookies?.geofit_token;

    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (tokenCookie) {
      token = tokenCookie;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please login.',
      });
    }

    const session = verifySessionToken(token);
    if (!session || !session.userId) {
      return res.status(401).json({
        success: false,
        error: 'Session expired or invalid token.',
      });
    }

    const user = await UsersRepository.getEnrichedUserProfile(session.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account not found.',
      });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (err) {
    console.error('Auth Middleware Error:', err);
    res.status(500).json({ success: false, error: 'Authentication internal failure' });
  }
}

export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const tokenCookie = req.cookies?.geofit_token;

    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (tokenCookie) {
      token = tokenCookie;
    }

    if (token) {
      const session = verifySessionToken(token);
      if (session && session.userId) {
        const user = await UsersRepository.getEnrichedUserProfile(session.userId);
        if (user) {
          req.user = user;
          req.userId = user.id;
        }
      }
    }
  } catch (e) {
    // optional, continue
  }
  next();
}
