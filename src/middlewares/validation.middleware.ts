import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { sendError } from '../utils/apiResponse.util';

/**
 * Validation middleware - checks for validation errors
 * Must be used after express-validator validation chains
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.type === 'field' ? err.path : 'unknown',
      message: err.msg,
    }));

    sendError(
      res,
      400,
      'Validation failed',
      JSON.stringify(formattedErrors)
    );
    return;
  }

  next();
};