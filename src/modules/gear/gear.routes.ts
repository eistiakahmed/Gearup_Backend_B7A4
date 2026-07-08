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
import { createGearValidation, updateGearValidation } from './gear.validator';
import { authenticate, optionalAuth } from '../../middlewares/auth.middleware';
import { providerOnly, adminOnly } from '../../middlewares/role.middleware';
import { handleValidationErrors } from '../../middlewares/validation.middleware';

const router = Router();

/**
 * @route   GET /api/gear
 * @desc    Get all gear items with filtering and pagination
 * @access  Public (with optional auth for personalized results)
 */
router.get('/', optionalAuth, getAllGear);

/**
 * @route   GET /api/gear/search
 * @desc    Search gear items
 * @access  Public
 */
router.get('/search', optionalAuth, getAllGear);

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

export default router;