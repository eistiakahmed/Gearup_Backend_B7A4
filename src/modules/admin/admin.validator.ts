import { body, ValidationChain } from 'express-validator';

/**
 * Validation rules for updating user status
 */
export const updateUserStatusValidation: ValidationChain[] = [
  body('isActive')
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  body('reason')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be between 10 and 500 characters'),
];

/**
 * Validation rules for creating a category
 */
export const createCategoryValidation: ValidationChain[] = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9\s&-]+$/)
    .withMessage('Category name can only contain letters, numbers, spaces, ampersands, and hyphens'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
];

/**
 * Validation rules for updating a category
 */
export const updateCategoryValidation: ValidationChain[] = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9\s&-]+$/)
    .withMessage('Category name can only contain letters, numbers, spaces, ampersands, and hyphens'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
];

/**
 * Validation rules for admin query parameters
 */
export const adminQueryValidation: ValidationChain[] = [
  body('status')
    .optional()
    .trim()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be either active or inactive'),

  body('role')
    .optional()
    .trim()
    .isIn(['CUSTOMER', 'PROVIDER', 'ADMIN'])
    .withMessage('Role must be one of: CUSTOMER, PROVIDER, ADMIN'),

  body('search')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search term must be between 2 and 100 characters'),

  body('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page number must be at least 1'),

  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  body('sortBy')
    .optional()
    .trim()
    .isIn(['name', 'email', 'createdAt', 'role'])
    .withMessage('Sort by must be one of: name, email, createdAt, role'),

  body('sortOrder')
    .optional()
    .trim()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be either asc or desc'),
];