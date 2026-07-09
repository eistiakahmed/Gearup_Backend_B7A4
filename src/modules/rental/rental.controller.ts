import { Response } from 'express';
import { OrderStatus } from '../../../generated/prisma/enums';
import { RequestWithUser } from '../../middlewares/auth.middleware';
import * as rentalService from './rental.service';
import { sendError, sendPaginatedResponse, sendSuccess } from '../../utils/apiResponse.util';

/**
 * @swagger
 * /api/rentals:
 *   post:
 *     summary: Create new rental order
 *     description: Create a new rental order for a gear item. Only accessible by customers.
 *     tags:
 *       - Rentals
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - gearId
 *               - startDate
 *               - endDate
 *             properties:
 *               gearId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the gear to rent
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: Rental start date and time
 *                 example: "2024-01-15T10:00:00Z"
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Rental end date and time
 *                 example: "2024-01-20T10:00:00Z"
 *               deliveryAddress:
 *                 type: string
 *                 description: Delivery address (optional)
 *                 example: "123 Main St, San Francisco, CA"
 *               notes:
 *                 type: string
 *                 description: Additional notes for the provider (optional)
 *                 example: "Please deliver before 5 PM"
 *     responses:
 *       201:
 *         description: Rental order created successfully
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
 *         description: Invalid input or gear not available
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
 *         description: User is not a customer
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
export const createRentalOrder = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Authentication required', 'User not authenticated');
      return;
    }

    if (req.user.role !== 'CUSTOMER') {
      sendError(res, 403, 'Access denied', 'Only customers can create rental orders');
      return;
    }

    const orderData = {
      ...req.body,
      customerId: req.user.userId,
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
    };

    const order = await rentalService.createRentalOrderService(orderData);

    sendSuccess(res, 201, 'Rental order created successfully', order);
  } catch (error) {
    console.error('Create rental order error:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('permission') || error.message.includes('available')) {
        sendError(res, 400, error.message);
        return;
      }
      sendError(res, 500, 'Failed to create rental order', error.message);
    } else {
      sendError(res, 500, 'Failed to create rental order', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/rentals:
 *   get:
 *     summary: Get user's rental orders
 *     description: Retrieve a paginated list of rental orders for the authenticated user. Customers see their rentals, providers see their gear's rentals.
 *     tags:
 *       - Rentals
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
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const getUserRentalOrders = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Authentication required', 'User not authenticated');
      return;
    }

    const filters = {
      status: req.query.status as OrderStatus | undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as string,
    };

    const result = await rentalService.getUserRentalOrdersService(req.user.userId, filters);

    sendPaginatedResponse(
      res,
      result.orders,
      result.pagination.page,
      result.pagination.limit,
      result.pagination.total,
      'Rental orders retrieved successfully'
    );
  } catch (error) {
    console.error('Get user rental orders error:', error);
    if (error instanceof Error) {
      sendError(res, 500, 'Failed to retrieve rental orders', error.message);
    } else {
      sendError(res, 500, 'Failed to retrieve rental orders', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/rentals/{id}:
 *   get:
 *     summary: Get rental order by ID
 *     description: Retrieve detailed information about a specific rental order. Users can only view their own orders.
 *     tags:
 *       - Rentals
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Rental order ID
 *     responses:
 *       200:
 *         description: Rental order retrieved successfully
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
 *         description: Access denied (not your order)
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
export const getRentalOrderById = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Authentication required', 'User not authenticated');
      return;
    }

    const id = req.params['id'] as string;
    if (!id) { sendError(res, 400, 'Order ID is required'); return; }
    const order = await rentalService.getRentalOrderByIdService(id, req.user.userId, req.user.role);

    sendSuccess(res, 200, 'Rental order retrieved successfully', order);
  } catch (error) {
    console.error('Get rental order by ID error:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('permission')) {
        sendError(res, 404, error.message);
        return;
      }
      sendError(res, 500, 'Failed to retrieve rental order', error.message);
    } else {
      sendError(res, 500, 'Failed to retrieve rental order', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/rentals/{id}/status:
 *   patch:
 *     summary: Update rental order status
 *     description: Update the status of a rental order. Only accessible by providers (for their gear) and admins.
 *     tags:
 *       - Rentals
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Rental order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, ACTIVE, COMPLETED, CANCELLED]
 *                 description: New order status
 *                 example: "ACTIVE"
 *               notes:
 *                 type: string
 *                 description: Optional notes about the status change
 *                 example: "Rental started, equipment handed over"
 *     responses:
 *       200:
 *         description: Order status updated successfully
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
 *         description: Invalid status transition
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
 *         description: Access denied (not a provider or admin)
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
export const updateOrderStatus = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Authentication required', 'User not authenticated');
      return;
    }

    if (req.user.role !== 'PROVIDER' && req.user.role !== 'ADMIN') {
      sendError(res, 403, 'Access denied', 'Only providers and admins can update order status');
      return;
    }

    const id = req.params['id'] as string;
    if (!id) { sendError(res, 400, 'Order ID is required'); return; }
    const updateData = {
      status: req.body.status as OrderStatus,
      notes: req.body.notes,
    };

    const order = await rentalService.updateOrderStatusService(
      id,
      req.user.userId,
      req.user.role,
      updateData
    );

    sendSuccess(res, 200, 'Order status updated successfully', order);
  } catch (error) {
    console.error('Update order status error:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('permission') || error.message.includes('cannot change')) {
        sendError(res, 400, error.message);
        return;
      }
      sendError(res, 500, 'Failed to update order status', error.message);
    } else {
      sendError(res, 500, 'Failed to update order status', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/rentals/{id}/cancel:
 *   post:
 *     summary: Cancel rental order
 *     description: Cancel a pending or active rental order. Only accessible by customers for their own orders.
 *     tags:
 *       - Rentals
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Rental order ID
 *     responses:
 *       200:
 *         description: Rental order cancelled successfully
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
 *         description: Order cannot be cancelled (already completed/active for too long)
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
 *         description: Access denied (not a customer)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Order not found or not your order
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
export const cancelRentalOrder = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Authentication required', 'User not authenticated');
      return;
    }

    if (req.user.role !== 'CUSTOMER') {
      sendError(res, 403, 'Access denied', 'Only customers can cancel their orders');
      return;
    }

    const id = req.params['id'] as string;
    if (!id) { sendError(res, 400, 'Order ID is required'); return; }
    const order = await rentalService.cancelRentalOrderService(id, req.user.userId);

    sendSuccess(res, 200, 'Rental order cancelled successfully', order);
  } catch (error) {
    console.error('Cancel rental order error:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('permission') || error.message.includes('can be cancelled')) {
        sendError(res, 400, error.message);
        return;
      }
      sendError(res, 500, 'Failed to cancel rental order', error.message);
    } else {
      sendError(res, 500, 'Failed to cancel rental order', 'An unexpected error occurred');
    }
  }
};