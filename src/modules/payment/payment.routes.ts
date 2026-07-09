import { Router } from 'express';
import {
  createPayment,
  confirmPayment,
  getUserPayments,
  getPaymentById,
} from './payment.controller';
import { createPaymentValidation, confirmPaymentValidation } from './payment.validator';
import { authenticate } from '../../middlewares/auth.middleware';
import { customerOnly } from '../../middlewares/role.middleware';
import { handleValidationErrors } from '../../middlewares/validation.middleware';

const router = Router();

// Authenticated routes
router.use(authenticate);

/**
 * @route   POST /api/payments/create
 * @desc    Create payment intent/session
 * @access  Customer
 */
router.post('/create', customerOnly, createPaymentValidation, handleValidationErrors, createPayment);

/**
 * @route   POST /api/payments/confirm
 * @desc    Confirm payment
 * @access  Customer
 */
router.post('/confirm', customerOnly, confirmPaymentValidation, handleValidationErrors, confirmPayment);

/**
 * @route   GET /api/payments
 * @desc    Get user's payment history
 * @access  Customer
 */
router.get('/', customerOnly, getUserPayments);

/**
 * @route   GET /api/payments/:id
 * @desc    Get payment by ID
 * @access  Customer
 */
router.get('/:id', customerOnly, getPaymentById);

export default router;