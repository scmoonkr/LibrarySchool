import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function requireAuth(req, res, next) {
  const authorization = req.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      ok: false,
      message: 'Authentication is required.',
    });
  }

  try {
    const payload = jwt.verify(token, env.jwtAccessSecret);
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      message: 'Invalid or expired token.',
    });
  }
}
