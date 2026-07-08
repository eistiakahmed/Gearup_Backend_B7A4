import { Request, Response } from 'express';
import { registerService, loginService, getCurrentUserService } from './auth.service';
import { sendSuccess, sendError } from '../../utils/apiResponse.util';
import { RequestWithUser } from '../../middlewares/auth.middleware';
import { RegisterRequest, LoginRequest } from './auth.interface';

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account. The user will be registered with the specified role (USER, PROVIDER, or ADMIN).
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: User's password (min 8 characters)
 *                 example: SecurePass123
 *               name:
 *                 type: string
 *                 description: User's full name
 *                 example: John Doe
 *               role:
 *                 type: string
 *                 enum: [USER, PROVIDER, ADMIN]
 *                 description: User role in the system
 *                 example: USER
 *               phoneNumber:
 *                 type: string
 *                 description: User's phone number (optional)
 *                 example: "+1234567890"
 *               address:
 *                 type: string
 *                 description: User's address (optional)
 *                 example: "123 Main St, City, Country"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         headers:
 *           Set-Cookie:
 *             description: HTTP-only cookie with access token
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Validation error"
 *               error: "Email is required"
 *       409:
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "User already exists"
 *       429:
 *         description: Too many requests (rate limit exceeded)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Too many requests, please try again later"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const userData: RegisterRequest = req.body;
    const result = await registerService(userData);

    // Set HTTP-only cookie with access token
    if (result.tokens?.accessToken) {
      res.cookie('accessToken', result.tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }

    sendSuccess(res, 201, 'User registered successfully', {
      user: result.user,
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        sendError(res, 409, error.message);
        return;
      }
      sendError(res, 400, 'Registration failed', error.message);
    } else {
      sendError(res, 500, 'Registration failed', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticate a user with email and password. Returns user data and sets an HTTP-only cookie with the access token.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password
 *                 example: SecurePass123
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             description: HTTP-only cookie with access token
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid credentials or account deactivated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Invalid email or password"
 *       429:
 *         description: Too many requests (rate limit exceeded)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const credentials: LoginRequest = req.body;
    const result = await loginService(credentials);

    // Set HTTP-only cookie with access token
    if (result.tokens?.accessToken) {
      res.cookie('accessToken', result.tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }

    sendSuccess(res, 200, 'Login successful', {
      user: result.user,
    });
  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof Error) {
      if (error.message.includes('Invalid') || error.message.includes('deactivated')) {
        sendError(res, 401, error.message);
        return;
      }
      sendError(res, 400, 'Login failed', error.message);
    } else {
      sendError(res, 500, 'Login failed', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     description: Retrieve the profile information of the currently authenticated user. Requires valid authentication cookie.
 *     tags:
 *       - Authentication
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Authentication required or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Authentication required"
 *               error: "User not authenticated"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const getCurrentUser = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Authentication required', 'User not authenticated');
      return;
    }

    const user = await getCurrentUserService(req.user.userId);
    sendSuccess(res, 200, 'User retrieved successfully', user);
  } catch (error) {
    console.error('Get current user error:', error);
    if (error instanceof Error) {
      sendError(res, 404, error.message);
    } else {
      sendError(res, 500, 'Failed to retrieve user', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Clear the authentication cookie and log out the current user.
 *     tags:
 *       - Authentication
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         headers:
 *           Set-Cookie:
 *             description: Cleared access token cookie
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               success: true
 *               message: "Logout successful"
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // Clear the access token cookie
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    sendSuccess(res, 200, 'Logout successful');
  } catch (error) {
    console.error('Logout error:', error);
    sendError(res, 500, 'Logout failed', 'An unexpected error occurred');
  }
};