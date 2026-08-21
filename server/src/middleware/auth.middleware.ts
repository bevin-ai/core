import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthJwtPayload {
  userId: string;
  githubId: string;
  username: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthJwtPayload;
}

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const token =
      req.cookies?.auth_token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null);

    if (!token) {
      res.status(401).json({
        authenticated: false,
        error: 'No authentication token provided',
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('❌ JWT_SECRET is not configured in server environment');
      res.status(500).json({ error: 'Server authentication configuration error' });
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as AuthJwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        authenticated: false,
        error: 'Authentication token has expired',
      });
      return;
    }
    res.status(401).json({
      authenticated: false,
      error: 'Invalid authentication token',
    });
  }
}
