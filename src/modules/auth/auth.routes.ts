import { Router } from 'express';
import {
  register,
  login,
  getCurrentUser,
  logout,
} from './auth.controller';
import { registerValidation, loginValidation } from './auth.validator';
import { authenticate } from '../../middlewares/auth.middleware';
import { handleValidationErrors } from '../../middlewares/validation.middleware';
import { authRateLimit } from '../../middlewares/rateLimit.middleware';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authRateLimit, registerValidation, handleValidationErrors, register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authRateLimit, loginValidation, handleValidationErrors, login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get('/me', authenticate, getCurrentUser);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, logout);

export default router;