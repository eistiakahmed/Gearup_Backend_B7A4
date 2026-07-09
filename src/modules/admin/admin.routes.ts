import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  updateUserStatus,
  getAllGear,
  getAllRentalOrders,
  getDashboardStats,
} from './admin.controller';
import { updateUserStatusValidation } from './admin.validator';
import { authenticate } from '../../middlewares/auth.middleware';
import { adminOnly } from '../../middlewares/role.middleware';
import { handleValidationErrors } from '../../middlewares/validation.middleware';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate, adminOnly);

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get dashboard statistics
 * @access  Admin
 */
router.get('/dashboard', getDashboardStats);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Admin
 */
router.get('/users', getAllUsers);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user by ID
 * @access  Admin
 */
router.get('/users/:id', getUserById);

/**
 * @route   PATCH /api/admin/users/:id/status
 * @desc    Update user status (activate/deactivate)
 * @access  Admin
 */
router.patch('/users/:id/status', updateUserStatusValidation, handleValidationErrors, updateUserStatus);

/**
 * @route   GET /api/admin/gear
 * @desc    Get all gear items
 * @access  Admin
 */
router.get('/gear', getAllGear);

/**
 * @route   GET /api/admin/rentals
 * @desc    Get all rental orders
 * @access  Admin
 */
router.get('/rentals', getAllRentalOrders);

export default router;