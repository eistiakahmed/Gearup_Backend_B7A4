import { Response } from 'express';
import httpStatus from 'http-status';

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error response formatter
 */
export const errorResponse = (
  res: Response,
  statusCode: number = httpStatus.INTERNAL_SERVER_ERROR,
  message: string,
  error?: string
): void => {
  const response: any = {
    success: false,
    message,
  };

  if (error) {
    response.error = error;
  }

  res.status(statusCode).json(response);
};

/**
 * Common error handler for consistent error responses
 */
export const handleError = (res: Response, error: unknown): void => {
  console.error('Error occurred:', error);

  if (error instanceof ApiError) {
    errorResponse(res, error.statusCode, error.message);
    return;
  }

  if (error instanceof Error) {
    errorResponse(res, httpStatus.INTERNAL_SERVER_ERROR, 'An unexpected error occurred', error.message);
    return;
  }

  errorResponse(res, httpStatus.INTERNAL_SERVER_ERROR, 'An unexpected error occurred');
};