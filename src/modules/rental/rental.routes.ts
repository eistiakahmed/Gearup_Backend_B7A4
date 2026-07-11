import { Router } from 'express';
import {
  createRentalOrder,
  getUserRentalOrders,
  getRentalOrderById,
  updateOrderStatus,
  cancelRentalOrder,
} from './rental.controller';
import { createRentalValidation, updateOrderStatusValidation, rentalQueryValidation } from './rental.validator';
import { authenticate } from '../../middlewares/auth.middleware';
import { customerOnly, providerOrAdmin } from '../../middlewares/role.middleware';
import { handleValidationErrors } from '../../middlewares/validation.middleware';

const router = Router();

// All rental routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/rentals
 * @desc    Create new rental order
 * @access  Customer
 */
router.post('/', customerOnly, createRentalValidation, handleValidationErrors, createRentalOrder);

/**
 * @route   GET /api/rentals
 * @desc    Get user's rental orders
 * @access  Customer
 */
router.get('/', customerOnly, rentalQueryValidation, handleValidationErrors, getUserRentalOrders);

/**
 * @route   GET /api/rentals/:id
 * @desc    Get rental order by ID
 * @access  Customer/Provider (for their relevant orders)
 */
router.get('/:id', getRentalOrderById);

/**
 * @route   PATCH /api/rentals/:id/status
 * @desc    Update rental order status
 * @access  Provider/Admin
 */
router.patch('/:id/status', providerOrAdmin, updateOrderStatusValidation, handleValidationErrors, updateOrderStatus);

/**
 * @route   POST /api/rentals/:id/cancel
 * @desc    Cancel rental order
 * @access  Customer
 */
router.post('/:id/cancel', customerOnly, cancelRentalOrder);

export default router;