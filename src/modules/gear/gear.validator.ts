import { body, ValidationChain } from 'express-validator';

/**
 * Validation rules for creating gear item
 */
export const createGearValidation: ValidationChain[] = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Gear name must be between 2 and 200 characters'),

  body('description')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),

  body('brand')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Brand name must be between 2 and 100 characters'),

  body('model')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Model name must not exceed 100 characters'),

  body('serialNumber')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Serial number must not exceed 100 characters'),

  body('categoryId')
    .trim()
    .isUUID()
    .withMessage('Invalid category ID'),

  body('dailyRate')
    .isFloat({ min: 0 })
    .withMessage('Daily rate must be a positive number'),

  body('weeklyRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weekly rate must be a positive number'),

  body('monthlyRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Monthly rate must be a positive number'),

  body('depositAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Deposit amount must be a positive number'),

  body('specifications')
    .optional()
    .isObject()
    .withMessage('Specifications must be a valid JSON object'),

  body('images')
    .optional()
    .isArray({ min: 1, max: 10 })
    .withMessage('Images must be an array with 1 to 10 URLs'),

  body('images.*')
    .optional()
    .isURL()
    .withMessage('Each image must be a valid URL'),

  body('isAvailable')
    .optional()
    .isBoolean()
    .withMessage('Availability must be a boolean'),

  body('stockQuantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Stock quantity must be at least 1'),

  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Location must not exceed 200 characters'),
];

/**
 * Validation rules for updating gear item
 */
export const updateGearValidation: ValidationChain[] = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Gear name must be between 2 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),

  body('brand')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Brand name must be between 2 and 100 characters'),

  body('model')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Model name must not exceed 100 characters'),

  body('serialNumber')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Serial number must not exceed 100 characters'),

  body('categoryId')
    .optional()
    .trim()
    .isUUID()
    .withMessage('Invalid category ID'),

  body('dailyRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Daily rate must be a positive number'),

  body('weeklyRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weekly rate must be a positive number'),

  body('monthlyRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Monthly rate must be a positive number'),

  body('depositAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Deposit amount must be a positive number'),

  body('specifications')
    .optional()
    .isObject()
    .withMessage('Specifications must be a valid JSON object'),

  body('images')
    .optional()
    .isArray({ min: 1, max: 10 })
    .withMessage('Images must be an array with 1 to 10 URLs'),

  body('images.*')
    .optional()
    .isURL()
    .withMessage('Each image must be a valid URL'),

  body('isAvailable')
    .optional()
    .isBoolean()
    .withMessage('Availability must be a boolean'),

  body('stockQuantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Stock quantity must be at least 1'),

  body('currentStock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Current stock must be a non-negative number'),

  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Location must not exceed 200 characters'),
];

/**
 * Validation rules for creating category
 */
export const createCategoryValidation: ValidationChain[] = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category name must be between 2 and 50 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
];

/**
 * Validation rules for gear query parameters
 */
export const gearQueryValidation: ValidationChain[] = [
  body('category')
    .optional()
    .trim()
    .isUUID()
    .withMessage('Invalid category ID'),

  body('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),

  body('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a positive number'),

  body('brand')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Brand filter must not exceed 100 characters'),

  body('search')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search term must be between 2 and 100 characters'),

  body('isAvailable')
    .optional()
    .isBoolean()
    .withMessage('Availability filter must be a boolean'),

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
    .isIn(['price', 'name', 'createdAt', 'popularity'])
    .withMessage('Sort by must be one of: price, name, createdAt, popularity'),

  body('sortOrder')
    .optional()
    .trim()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be either asc or desc'),
];