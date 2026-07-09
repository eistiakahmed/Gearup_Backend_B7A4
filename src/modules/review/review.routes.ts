import { Router } from 'express';
import {
  createReview,
  getGearReviews,
  getReviewById,
  updateReview,
  deleteReview,
  getUserReviews,
} from './review.controller';
import { createReviewValidation } from './review.validator';
import { authenticate } from '../../middlewares/auth.middleware';
import { customerOnly } from '../../middlewares/role.middleware';
import { handleValidationErrors } from '../../middlewares/validation.middleware';

const router = Router();

/**
 * @route   GET /api/reviews/gear/:gearId
 * @desc    Get reviews for a gear item
 * @access  Public
 */
router.get('/gear/:gearId', getGearReviews);

/**
 * @route   GET /api/reviews/:id
 * @desc    Get review by ID
 * @access  Public
 */
router.get('/:id', getReviewById);

// Authenticated routes
router.use(authenticate);

/**
 * @route   POST /api/reviews
 * @desc    Create new review
 * @access  Customer
 */
router.post('/', customerOnly, createReviewValidation, handleValidationErrors, createReview);

/**
 * @route   GET /api/reviews/user/me
 * @desc    Get user's reviews
 * @access  Customer
 */
router.get('/user/me', customerOnly, getUserReviews);

/**
 * @route   PATCH /api/reviews/:id
 * @desc    Update review
 * @access  Customer (owner only)
 */
router.patch('/:id', customerOnly, updateReview);

/**
 * @route   DELETE /api/reviews/:id
 * @desc    Delete review
 * @access  Customer (owner only) / Admin
 */
router.delete('/:id', customerOnly, deleteReview);

export default router;