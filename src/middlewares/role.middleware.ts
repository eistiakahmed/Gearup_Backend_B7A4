import { NextFunction, Response } from 'express';
import { UserRole } from '../../generated/prisma/enums';
import { sendError } from '../utils/apiResponse.util';
import { RequestWithUser } from './auth.middleware';

/**
 * Role-based authorization middleware
 * Checks if authenticated user has one of the required roles
 * @param allowedRoles - Array of roles that are allowed to access the route
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: RequestWithUser, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        sendError(res, 401, 'Authentication required', 'User not authenticated');
        return;
      }

      if (!allowedRoles.includes(req.user.role)) {
        sendError(
          res,
          403,
          'Access denied',
          `User role '${req.user.role}' is not authorized to access this resource`
        );
        return;
      }

      next();
    } catch (error) {
      console.error('Authorization middleware error:', error);
      sendError(res, 500, 'Authorization error', 'Failed to authorize user');
    }
  };
};

/**
 * Customer-only middleware
 */
export const customerOnly = authorize(UserRole.CUSTOMER);

/**
 * Provider-only middleware
 */
export const providerOnly = authorize(UserRole.PROVIDER);

/**
 * Admin-only middleware
 */
export const adminOnly = authorize(UserRole.ADMIN);

/**
 * Customer or Provider middleware
 */
export const customerOrProvider = authorize(UserRole.CUSTOMER, UserRole.PROVIDER);

/**
 * Provider or Admin middleware
 */
export const providerOrAdmin = authorize(UserRole.PROVIDER, UserRole.ADMIN);