import { NextFunction, Request, Response } from 'express';
import { UserRole } from '../../generated/prisma/enums';
import { sendError } from '../utils/apiResponse.util';
import { extractTokenFromHeader, verifyToken } from '../utils/token.util';

export interface RequestWithUser extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticate = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from cookie or Authorization header
    const token = req.cookies?.accessToken || extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      sendError(res, 401, 'Authentication required', 'No token provided');
      return;
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      sendError(res, 401, 'Invalid or expired token', 'Authentication failed');
      return;
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    sendError(res, 500, 'Authentication error', 'Failed to authenticate user');
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuth = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies?.accessToken || extractTokenFromHeader(req.headers.authorization);

    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
        };
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
};