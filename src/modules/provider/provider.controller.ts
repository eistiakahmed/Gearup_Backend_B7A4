import { Response } from 'express';
import { OrderStatus } from '../../../generated/prisma/enums';
import { RequestWithUser } from '../../middlewares/auth.middleware';
import * as providerService from './provider.service';
import { sendError, sendPaginatedResponse, sendSuccess } from '../../utils/apiResponse.util';

/**
 * @swagger
 * /api/provider/orders:
 *   get:
 *     summary: Get provider's incoming rental orders
 *     description: Retrieve a paginated list of rental orders for gear items owned by the provider. Only accessible by providers.
 *     tags:
 *       - Provider
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PLACED, CONFIRMED, PAID, PICKED_UP, RETURNED, CANCELLED]
 *         description: Filter by order status
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
 *           enum: [createdAt, startDate, endDate, totalAmount]
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
 *         description: Orders retrieved successfully
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
 *         description: Provider access required
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
export const getProviderOrders = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Authentication required', 'User not authenticated');
      return;
    }

    if (req.user.role !== 'PROVIDER') {
      sendError(res, 403, 'Access denied', 'Provider access required');
      return;
    }

    const filters = {
      status: req.query.status as OrderStatus | undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as string,
    };

    const result = await providerService.getProviderOrdersService(req.user.userId, filters);

    sendPaginatedResponse(
      res,
      result.orders,
      result.pagination.page,
      result.pagination.limit,
      result.pagination.total,
      'Provider orders retrieved successfully'
    );
  } catch (error) {
    console.error('Get provider orders error:', error);
    if (error instanceof Error) {
      sendError(res, 500, 'Failed to retrieve orders', error.message);
    } else {
      sendError(res, 500, 'Failed to retrieve orders', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/provider/orders/{id}:
 *   get:
 *     summary: Get provider's specific order details
 *     description: Retrieve detailed information about a specific rental order. Providers can only view orders for their own gear items.
 *     tags:
 *       - Provider
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Rental'
 *       400:
 *         description: Invalid order ID
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
 *         description: Access denied (not your gear)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Order not found
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
export const getProviderOrderById = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Authentication required', 'User not authenticated');
      return;
    }

    if (req.user.role !== 'PROVIDER') {
      sendError(res, 403, 'Access denied', 'Provider access required');
      return;
    }

    const id = req.params['id'] as string;
    if (!id) { sendError(res, 400, 'Order ID is required'); return; }
    const order = await providerService.getProviderOrderByIdService(id, req.user.userId);

    sendSuccess(res, 200, 'Order retrieved successfully', order);
  } catch (error) {
    console.error('Get provider order by ID error:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('permission')) {
        sendError(res, 404, error.message);
        return;
      }
      sendError(res, 500, 'Failed to retrieve order', error.message);
    } else {
      sendError(res, 500, 'Failed to retrieve order', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/provider/gear:
 *   get:
 *     summary: Get provider's gear inventory
 *     description: Retrieve a paginated list of all gear items owned by the provider.
 *     tags:
 *       - Provider
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
 *         name: isAvailable
 *         schema:
 *           type: boolean
 *         description: Filter by availability status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name and description
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
 *           enum: [name, createdAt, dailyRate, currentStock]
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
 *         description: Provider access required
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
export const getProviderGear = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Authentication required', 'User not authenticated');
      return;
    }

    if (req.user.role !== 'PROVIDER') {
      sendError(res, 403, 'Access denied', 'Provider access required');
      return;
    }

    const filters = {
      category: req.query.category as string,
      isAvailable: req.query.isAvailable === 'true' ? true : req.query.isAvailable === 'false' ? false : undefined,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as string,
    };

    const result = await providerService.getProviderGearService(req.user.userId, filters);

    sendPaginatedResponse(
      res,
      result.gearItems,
      result.pagination.page,
      result.pagination.limit,
      result.pagination.total,
      'Provider gear retrieved successfully'
    );
  } catch (error) {
    console.error('Get provider gear error:', error);
    if (error instanceof Error) {
      sendError(res, 500, 'Failed to retrieve gear items', error.message);
    } else {
      sendError(res, 500, 'Failed to retrieve gear items', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/provider/gear/{id}/status:
 *   patch:
 *     summary: Update gear availability status
 *     description: Update the availability status of a gear item. Only accessible by the gear owner.
 *     tags:
 *       - Provider
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Gear item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isAvailable
 *             properties:
 *               isAvailable:
 *                 type: boolean
 *                 description: Availability status
 *                 example: false
 *               currentStock:
 *                 type: integer
 *                 minimum: 0
 *                 description: Current stock quantity (optional)
 *                 example: 0
 *     responses:
 *       200:
 *         description: Gear status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Gear'
 *       400:
 *         description: Invalid input
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
 *         description: Not the gear owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Gear not found
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
export const updateProviderGearStatus = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Authentication required', 'User not authenticated');
      return;
    }

    if (req.user.role !== 'PROVIDER') {
      sendError(res, 403, 'Access denied', 'Provider access required');
      return;
    }

    const id = req.params['id'] as string;
    if (!id) { sendError(res, 400, 'Gear ID is required'); return; }

    const updateData = {
      isAvailable: req.body.isAvailable,
      currentStock: req.body.currentStock,
    };

    const gear = await providerService.updateProviderGearStatusService(id, req.user.userId, updateData);

    sendSuccess(res, 200, 'Gear status updated successfully', gear);
  } catch (error) {
    console.error('Update gear status error:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('permission')) {
        sendError(res, 404, error.message);
        return;
      }
      sendError(res, 500, 'Failed to update gear status', error.message);
    } else {
      sendError(res, 500, 'Failed to update gear status', 'An unexpected error occurred');
    }
  }
};
