import { body, query, ValidationChain } from 'express-validator';

/**
 * Validation rules for creating a review
 */
export const createReviewValidation: ValidationChain[] = [
  body('gearId')
    .trim()
    .isUUID()
    .withMessage('Invalid gear ID'),

  body('orderId')
    .trim()
    .isUUID()
    .withMessage('Invalid order ID'),

  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),

  body('comment')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Comment must be between 10 and 1000 characters'),
];

/**
 * Validation rules for review query parameters
 */
export const reviewQueryValidation: ValidationChain[] = [
  query('gearId')
    .optional()
    .trim()
    .isUUID()
    .withMessage('Invalid gear ID'),

  query('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating filter must be between 1 and 5'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page number must be at least 1'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sortBy')
    .optional()
    .trim()
    .isIn(['createdAt', 'rating'])
    .withMessage('Sort by must be one of: createdAt, rating'),

  query('sortOrder')
    .optional()
    .trim()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be either asc or desc'),
];