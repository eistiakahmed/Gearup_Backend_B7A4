import { Router } from 'express';
import {
  getAllGear,
  getGearById,
  getAllCategories,
  getCategoryById,
  createGear,
  updateGear,
  deleteGear,
} from './gear.controller';
import { createGearValidation, updateGearValidation, gearQueryValidation } from './gear.validator';
import { authenticate, optionalAuth } from '../../middlewares/auth.middleware';
import { providerOnly, adminOnly, providerOrAdmin } from '../../middlewares/role.middleware';
import { handleValidationErrors } from '../../middlewares/validation.middleware';

const router = Router();

/**
 * @route   GET /api/gear
 * @desc    Get all gear items with filtering and pagination
 * @access  Public (with optional auth for personalized results)
 */
router.get('/', optionalAuth, gearQueryValidation, handleValidationErrors, getAllGear);

/**
 * @route   GET /api/gear/search
 * @desc    Search gear items
 * @access  Public
 */
router.get('/search', optionalAuth, gearQueryValidation, handleValidationErrors, getAllGear);

/**
 * @route   GET /api/gear/:id
 * @desc    Get single gear item by ID
 * @access  Public
 */
router.get('/:id', optionalAuth, getGearById);

/**
 * @route   GET /api/categories
 * @desc    Get all categories
 * @access  Public
 */
router.get('/categories/all', getAllCategories);

/**
 * @route   GET /api/categories/:id
 * @desc    Get single category by ID with gear items
 * @access  Public
 */
router.get('/categories/:id', getCategoryById);

/**
 * @route   POST /api/gear
 * @desc    Create new gear item
 * @access  Provider/Admin
 */
router.post(
  '/',
  authenticate,
  providerOrAdmin,
  createGearValidation,
  handleValidationErrors,
  createGear
);

/**
 * @route   PUT /api/gear/:id
 * @desc    Update gear item
 * @access  Provider/Admin
 */
router.put(
  '/:id',
  authenticate,
  providerOrAdmin,
  updateGearValidation,
  handleValidationErrors,
  updateGear
);

/**
 * @route   DELETE /api/gear/:id
 * @desc    Delete gear item
 * @access  Provider/Admin
 */
router.delete(
  '/:id',
  authenticate,
  providerOrAdmin,
  deleteGear
);

export default router;