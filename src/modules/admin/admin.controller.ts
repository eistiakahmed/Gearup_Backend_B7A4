import { Request, Response } from 'express';
import * as adminService from './admin.service';
import { sendSuccess, sendError, sendPaginatedResponse } from '../../utils/apiResponse.util';
import { RequestWithUser } from '../../middlewares/auth.middleware';

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve a paginated list of all users in the system. Only accessible by admin users.
 *     tags:
 *       - Admin
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by account status
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [USER, PROVIDER, ADMIN]
 *         description: Filter by user role
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name and email
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, email, createdAt, role]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
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
export const getAllUsers = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      sendError(res, 403, 'Access denied', 'Admin access required');
      return;
    }

    const filters = {
      status: req.query.status as string,
      role: req.query.role as string,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as string,
    };

    const result = await adminService.getAllUsersService(filters);

    sendPaginatedResponse(
      res,
      result.users,
      result.pagination.page,
      result.pagination.limit,
      result.pagination.total,
      'Users retrieved successfully'
    );
  } catch (error) {
    console.error('Get all users error:', error);
    if (error instanceof Error) {
      sendError(res, 500, 'Failed to retrieve users', error.message);
    } else {
      sendError(res, 500, 'Failed to retrieve users', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieve detailed information about a specific user. Only accessible by admin users.
 *     tags:
 *       - Admin
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid user ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
export const getUserById = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      sendError(res, 403, 'Access denied', 'Admin access required');
      return;
    }

    const id = req.params['id'] as string;
    if (!id) { sendError(res, 400, 'User ID is required'); return; }
    const user = await adminService.getUserByIdService(id);

    sendSuccess(res, 200, 'User retrieved successfully', user);
  } catch (error) {
    console.error('Get user by ID error:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        sendError(res, 404, error.message);
        return;
      }
      sendError(res, 500, 'Failed to retrieve user', error.message);
    } else {
      sendError(res, 500, 'Failed to retrieve user', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/admin/users/{id}/status:
 *   patch:
 *     summary: Update user status
 *     description: Activate or deactivate a user account. Only accessible by admin users.
 *     tags:
 *       - Admin
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 description: User account active status
 *                 example: false
 *               reason:
 *                 type: string
 *                 description: Reason for status change (optional)
 *                 example: "Violated terms of service"
 *     responses:
 *       200:
 *         description: User status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input or cannot deactivate yourself
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
export const updateUserStatus = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      sendError(res, 403, 'Access denied', 'Admin access required');
      return;
    }

    const id = req.params['id'] as string;
    if (!id) { sendError(res, 400, 'User ID is required'); return; }
    const updateData = {
      isActive: req.body.isActive,
      reason: req.body.reason,
    };

    const user = await adminService.updateUserStatusService(id, updateData);

    sendSuccess(res, 200, 'User status updated successfully', user);
  } catch (error) {
    console.error('Update user status error:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('Cannot deactivate')) {
        sendError(res, 400, error.message);
        return;
      }
      sendError(res, 500, 'Failed to update user status', error.message);
    } else {
      sendError(res, 500, 'Failed to update user status', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/admin/gear:
 *   get:
 *     summary: Get all gear items
 *     description: Retrieve a paginated list of all gear items in the system. Only accessible by admin users.
 *     tags:
 *       - Admin
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by category ID
 *       - in: query
 *         name: provider
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by provider ID
 *       - in: query
 *         name: isAvailable
 *         schema:
 *           type: boolean
 *         description: Filter by availability status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [title, price, createdAt, provider]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Gear items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Gear'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
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
export const getAllGear = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      sendError(res, 403, 'Access denied', 'Admin access required');
      return;
    }

    const filters = {
      category: req.query.category as string,
      provider: req.query.provider as string,
      isAvailable: req.query.isAvailable === 'true' ? true : req.query.isAvailable === 'false' ? false : undefined,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as string,
    };

    const result = await adminService.getAllGearService(filters);

    sendPaginatedResponse(
      res,
      result.gearItems,
      result.pagination.page,
      result.pagination.limit,
      result.pagination.total,
      'Gear items retrieved successfully'
    );
  } catch (error) {
    console.error('Get all gear error:', error);
    if (error instanceof Error) {
      sendError(res, 500, 'Failed to retrieve gear items', error.message);
    } else {
      sendError(res, 500, 'Failed to retrieve gear items', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/admin/rentals:
 *   get:
 *     summary: Get all rental orders
 *     description: Retrieve a paginated list of all rental orders in the system. Only accessible by admin users.
 *     tags:
 *       - Admin
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, ACTIVE, COMPLETED, CANCELLED]
 *         description: Filter by order status
 *       - in: query
 *         name: customer
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by customer ID
 *       - in: query
 *         name: provider
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by provider ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, startDate, endDate, totalCost]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Rental orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Rental'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
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
export const getAllRentalOrders = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      sendError(res, 403, 'Access denied', 'Admin access required');
      return;
    }

    const filters = {
      status: req.query.status as string,
      customer: req.query.customer as string,
      provider: req.query.provider as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as string,
    };

    const result = await adminService.getAllRentalOrdersService(filters);

    sendPaginatedResponse(
      res,
      result.orders,
      result.pagination.page,
      result.pagination.limit,
      result.pagination.total,
      'Rental orders retrieved successfully'
    );
  } catch (error) {
    console.error('Get all rental orders error:', error);
    if (error instanceof Error) {
      sendError(res, 500, 'Failed to retrieve rental orders', error.message);
    } else {
      sendError(res, 500, 'Failed to retrieve rental orders', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/admin/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     description: Retrieve aggregated statistics for the admin dashboard including user counts, gear counts, rental metrics, and revenue data. Only accessible by admin users.
 *     tags:
 *       - Admin
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
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
 *                         users:
 *                           type: object
 *                           properties:
 *                             total:
 *                               type: integer
 *                               description: Total number of users
 *                             active:
 *                               type: integer
 *                               description: Number of active users
 *                             byRole:
 *                               type: object
 *                               properties:
 *                                 USER:
 *                                   type: integer
 *                                 PROVIDER:
 *                                   type: integer
 *                                 ADMIN:
 *                                   type: integer
 *                         gear:
 *                           type: object
 *                           properties:
 *                             total:
 *                               type: integer
 *                               description: Total number of gear items
 *                             available:
 *                               type: integer
 *                               description: Number of available gear items
 *                             byCategory:
 *                               type: object
 *                               additionalProperties:
 *                                 type: integer
 *                               description: Gear count by category
 *                         rentals:
 *                           type: object
 *                           properties:
 *                             total:
 *                               type: integer
 *                               description: Total number of rentals
 *                             active:
 *                               type: integer
 *                               description: Number of active rentals
 *                             byStatus:
 *                               type: object
 *                               properties:
 *                                 PENDING:
 *                                   type: integer
 *                                 ACTIVE:
 *                                   type: integer
 *                                 COMPLETED:
 *                                   type: integer
 *                                 CANCELLED:
 *                                   type: integer
 *                         revenue:
 *                           type: object
 *                           properties:
 *                             total:
 *                               type: number
 *                               format: float
 *                               description: Total revenue
 *                             thisMonth:
 *                               type: number
 *                               format: float
 *                               description: Revenue this month
 *                             thisWeek:
 *                               type: number
 *                               format: float
 *                               description: Revenue this week
 *                         reviews:
 *                           type: object
 *                           properties:
 *                             total:
 *                               type: integer
 *                               description: Total number of reviews
 *                             averageRating:
 *                               type: number
 *                               format: float
 *                               description: Average rating across all reviews
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
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
export const getDashboardStats = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      sendError(res, 403, 'Access denied', 'Admin access required');
      return;
    }

    const stats = await adminService.getDashboardStatsService();

    sendSuccess(res, 200, 'Dashboard statistics retrieved successfully', stats);
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    if (error instanceof Error) {
      sendError(res, 500, 'Failed to retrieve dashboard statistics', error.message);
    } else {
      sendError(res, 500, 'Failed to retrieve dashboard statistics', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/admin/categories:
 *   get:
 *     summary: Get all categories
 *     description: Retrieve a list of all categories with gear item counts. Only accessible by admin users.
 *     tags:
 *       - Admin
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Category'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
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
export const getAllCategories = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      sendError(res, 403, 'Access denied', 'Admin access required');
      return;
    }

    const categories = await adminService.getAllCategoriesService();

    sendSuccess(res, 200, 'Categories retrieved successfully', categories);
  } catch (error) {
    console.error('Get all categories error:', error);
    if (error instanceof Error) {
      sendError(res, 500, 'Failed to retrieve categories', error.message);
    } else {
      sendError(res, 500, 'Failed to retrieve categories', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/admin/categories:
 *   post:
 *     summary: Create new category
 *     description: Create a new gear category. Only accessible by admin users.
 *     tags:
 *       - Admin
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Category name
 *                 example: "Camping Equipment"
 *               description:
 *                 type: string
 *                 description: Category description
 *                 example: "Tents, sleeping bags, and camping accessories"
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Category'
 *       400:
 *         description: Category already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
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
export const createCategory = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      sendError(res, 403, 'Access denied', 'Admin access required');
      return;
    }

    const { name, description } = req.body;
    const category = await adminService.createCategoryService(name, description);

    sendSuccess(res, 201, 'Category created successfully', category);
  } catch (error) {
    console.error('Create category error:', error);
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        sendError(res, 400, error.message);
        return;
      }
      sendError(res, 500, 'Failed to create category', error.message);
    } else {
      sendError(res, 500, 'Failed to create category', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   put:
 *     summary: Update category
 *     description: Update an existing category. Only accessible by admin users.
 *     tags:
 *       - Admin
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Updated category name
 *                 example: "Camping & Outdoor Equipment"
 *               description:
 *                 type: string
 *                 description: Updated category description
 *                 example: "Tents, sleeping bags, camping accessories, and outdoor gear"
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Category'
 *       400:
 *         description: Category name conflict
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Category not found
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
export const updateCategory = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      sendError(res, 403, 'Access denied', 'Admin access required');
      return;
    }

    const id = req.params['id'] as string;
    if (!id) { sendError(res, 400, 'Category ID is required'); return; }

    const { name, description } = req.body;
    const category = await adminService.updateCategoryService(id, name, description);

    sendSuccess(res, 200, 'Category updated successfully', category);
  } catch (error) {
    console.error('Update category error:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        sendError(res, 404, error.message);
        return;
      }
      if (error.message.includes('already exists')) {
        sendError(res, 400, error.message);
        return;
      }
      sendError(res, 500, 'Failed to update category', error.message);
    } else {
      sendError(res, 500, 'Failed to update category', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   delete:
 *     summary: Delete category
 *     description: Delete a category. Only accessible by admin users. Cannot delete categories with existing gear items.
 *     tags:
 *       - Admin
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
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
 *                         message:
 *                           type: string
 *                           example: "Category deleted successfully"
 *       400:
 *         description: Cannot delete category with gear items
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Category not found
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
export const deleteCategory = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      sendError(res, 403, 'Access denied', 'Admin access required');
      return;
    }

    const id = req.params['id'] as string;
    if (!id) { sendError(res, 400, 'Category ID is required'); return; }

    const result = await adminService.deleteCategoryService(id);

    sendSuccess(res, 200, result.message, result);
  } catch (error) {
    console.error('Delete category error:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        sendError(res, 404, error.message);
        return;
      }
      if (error.message.includes('Cannot delete')) {
        sendError(res, 400, error.message);
        return;
      }
      sendError(res, 500, 'Failed to delete category', error.message);
    } else {
      sendError(res, 500, 'Failed to delete category', 'An unexpected error occurred');
    }
  }
};