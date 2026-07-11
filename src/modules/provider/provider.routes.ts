import { Router } from 'express';
import {
  getProviderOrders,
  getProviderOrderById,
  getProviderGear,
  updateProviderGearStatus,
} from './provider.controller';
import { createGear, updateGear, deleteGear } from '../gear/gear.controller';
import { createGearValidation, updateGearValidation } from '../gear/gear.validator';
import { updateOrderStatus } from '../rental/rental.controller';
import { updateOrderStatusValidation } from '../rental/rental.validator';
import { authenticate } from '../../middlewares/auth.middleware';
import { providerOnly } from '../../middlewares/role.middleware';
import { handleValidationErrors } from '../../middlewares/validation.middleware';

const router = Router();

// All provider routes require authentication and provider role
router.use(authenticate, providerOnly);

/**
 * @route   GET /api/provider/orders
 * @desc    Get provider's incoming rental orders
 * @access  Provider
 */
router.get('/orders', getProviderOrders);

/**
 * @route   GET /api/provider/orders/:id
 * @desc    Get provider's specific order details
 * @access  Provider
 */
router.get('/orders/:id', getProviderOrderById);

/**
 * @route   PATCH /api/provider/orders/:id
 * @desc    Update rental order status
 * @access  Provider
 */
router.patch('/orders/:id', updateOrderStatusValidation, handleValidationErrors, updateOrderStatus);

/**
 * @route   GET /api/provider/gear
 * @desc    Get provider's gear inventory
 * @access  Provider
 */
router.get('/gear', getProviderGear);

/**
 * @route   POST /api/provider/gear
 * @desc    Add gear to inventory
 * @access  Provider
 */
router.post('/gear', createGearValidation, handleValidationErrors, createGear);

/**
 * @route   PUT /api/provider/gear/:id
 * @desc    Update gear listing
 * @access  Provider
 */
router.put('/gear/:id', updateGearValidation, handleValidationErrors, updateGear);

/**
 * @route   DELETE /api/provider/gear/:id
 * @desc    Remove gear from inventory
 * @access  Provider
 */
router.delete('/gear/:id', deleteGear);

/**
 * @route   PATCH /api/provider/gear/:id/status
 * @desc    Update gear availability status
 * @access  Provider
 */
router.patch('/gear/:id/status', updateProviderGearStatus);

export default router;
