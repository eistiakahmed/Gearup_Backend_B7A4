import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

/**
 * Send a success response
 * @param res - Express response object
 * @param statusCode - HTTP status code
 * @param message - Success message
 * @param data - Response data
 */
export const sendSuccess = <T>(
  res: Response,
  statusCode: number = 200,
  message: string = 'Success',
  data?: T
): void => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    ...(data !== undefined && { data }),
  };

  res.status(statusCode).json(response);
};

/**
 * Send an error response
 * @param res - Express response object
 * @param statusCode - HTTP status code
 * @param message - Error message
 * @param error - Detailed error information
 */
export const sendError = (
  res: Response,
  statusCode: number = 500,
  message: string = 'Internal server error',
  error?: string
): void => {
  const response: ApiResponse = {
    success: false,
    message,
    ...(error && { error }),
  };

  res.status(statusCode).json(response);
};

/**
 * Send a paginated response
 * @param res - Express response object
 * @param data - Array of data items
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 * @param message - Success message
 */
export const sendPaginatedResponse = <T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number,
  message: string = 'Success'
): void => {
  const totalPages = Math.ceil(total / limit);

  const response: ApiResponse<T[]> = {
    success: true,
    message,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };

  res.status(200).json(response);
};