import { Request, Response } from 'express';
import { PaymentMethod } from '../../../generated/prisma/enums';
import { RequestWithUser } from '../../middlewares/auth.middleware';
import * as paymentService from './payment.service';
import { sendError, sendPaginatedResponse, sendSuccess } from '../../utils/apiResponse.util';

/**
 * @swagger
 * /api/payments:
 *   post:
 *     summary: Create payment intent/session
 *     description: Create a new payment session for a rental order. Only accessible by customers. Supports Stripe payments.
 *     tags:
 *       - Payments
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rentalId
 *               - method
 *               - amount
 *             properties:
 *               rentalId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the rental order to pay for
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               method:
 *                 type: string
 *                 enum: [CREDIT_CARD, DEBIT_CARD, PAYPAL, BANK_TRANSFER]
 *                 description: Payment method
 *                 example: "CREDIT_CARD"
 *               amount:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 description: Payment amount
 *                 example: 150.00
 *               currency:
 *                 type: string
 *                 default: USD
 *                 description: Payment currency
 *                 example: "USD"
 *     responses:
 *       201:
 *         description: Payment created successfully
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
 *                         id:
 *                           type: string
 *                           format: uuid
 *                           description: Payment ID
 *                         sessionId:
 *                           type: string
 *                           description: Stripe checkout session ID
 *                         amount:
 *                           type: number
 *                           format: float
 *                           description: Payment amount
 *                         currency:
 *                           type: string
 *                           description: Payment currency
 *                         status:
 *                           type: string
 *                           enum: [PENDING, COMPLETED, FAILED, REFUNDED]
 *                           description: Payment status
 *       400:
 *         description: Invalid input or payment already exists
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
 *         description: Rental not found
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
export const createPayment = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Authentication required', 'User not authenticated');
      return;
    }

    if (req.user.role !== 'CUSTOMER') {
      sendError(res, 403, 'Access denied', 'Only customers can create payments');
      return;
    }

    const paymentData = {
      ...req.body,
      method: req.body.method as PaymentMethod,
    };

    const result = await paymentService.createPaymentService(paymentData, req.user.userId);

    sendSuccess(res, 201, 'Payment created successfully', result);
  } catch (error) {
    console.error('Create payment error:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('permission') || error.message.includes('already exists')) {
        sendError(res, 400, error.message);
        return;
      }
      sendError(res, 500, 'Failed to create payment', error.message);
    } else {
      sendError(res, 500, 'Failed to create payment', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/payments/confirm:
 *   post:
 *     summary: Confirm payment
 *     description: Confirm a payment after successful completion with the payment provider (e.g., Stripe webhook).
 *     tags:
 *       - Payments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentId
 *               - providerResponse
 *             properties:
 *               paymentId:
 *                 type: string
 *                 format: uuid
 *                 description: Payment ID to confirm
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               providerResponse:
 *                 type: object
 *                 description: Payment provider's response (e.g., Stripe payment intent)
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: Provider's payment ID
 *                   status:
 *                     type: string
 *                     description: Provider's payment status
 *                   amount:
 *                     type: integer
 *                     description: Amount in smallest currency unit
 *     responses:
 *       200:
 *         description: Payment confirmed successfully
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
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         status:
 *                           type: string
 *                           enum: [COMPLETED, FAILED]
 *                         transactionId:
 *                           type: string
 *                           description: Provider's transaction ID
 *       400:
 *         description: Invalid payment data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Payment not found
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
export const confirmPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { paymentId, providerResponse } = req.body;

    const confirmData = {
      paymentId,
      providerResponse,
    };

    const payment = await paymentService.confirmPaymentService(confirmData);

    sendSuccess(res, 200, 'Payment confirmed successfully', payment);
  } catch (error) {
    console.error('Confirm payment error:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('ID not found')) {
        sendError(res, 404, error.message);
        return;
      }
      sendError(res, 500, 'Failed to confirm payment', error.message);
    } else {
      sendError(res, 500, 'Failed to confirm payment', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/payments:
 *   get:
 *     summary: Get user's payment history
 *     description: Retrieve a paginated list of payment history for the authenticated user.
 *     tags:
 *       - Payments
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, COMPLETED, FAILED, REFUNDED]
 *         description: Filter by payment status
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *           enum: [CREDIT_CARD, DEBIT_CARD, PAYPAL, BANK_TRANSFER]
 *         description: Filter by payment method
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
 *           enum: [createdAt, amount]
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
 *         description: Payments retrieved successfully
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
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           rentalId:
 *                             type: string
 *                             format: uuid
 *                           amount:
 *                             type: number
 *                             format: float
 *                           currency:
 *                             type: string
 *                           method:
 *                             type: string
 *                           status:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
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
export const getUserPayments = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Authentication required', 'User not authenticated');
      return;
    }

    const filters = {
      status: req.query.status as string,
      method: req.query.method as PaymentMethod | undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as string,
    };

    const result = await paymentService.getUserPaymentsService(req.user.userId, filters);

    sendPaginatedResponse(
      res,
      result.payments,
      result.pagination.page,
      result.pagination.limit,
      result.pagination.total,
      'Payments retrieved successfully'
    );
  } catch (error) {
    console.error('Get user payments error:', error);
    if (error instanceof Error) {
      sendError(res, 500, 'Failed to retrieve payments', error.message);
    } else {
      sendError(res, 500, 'Failed to retrieve payments', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/payments/{id}:
 *   get:
 *     summary: Get payment by ID
 *     description: Retrieve detailed information about a specific payment. Users can only view their own payments.
 *     tags:
 *       - Payments
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment retrieved successfully
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
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         rentalId:
 *                           type: string
 *                           format: uuid
 *                         customerId:
 *                           type: string
 *                           format: uuid
 *                         amount:
 *                           type: number
 *                           format: float
 *                         currency:
 *                           type: string
 *                         method:
 *                           type: string
 *                           enum: [CREDIT_CARD, DEBIT_CARD, PAYPAL, BANK_TRANSFER]
 *                         status:
 *                           type: string
 *                           enum: [PENDING, COMPLETED, FAILED, REFUNDED]
 *                         transactionId:
 *                           type: string
 *                           description: Payment provider's transaction ID
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Invalid payment ID
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
 *         description: Access denied (not your payment)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Payment not found
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
export const getPaymentById = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Authentication required', 'User not authenticated');
      return;
    }

    const id = req.params['id'] as string;
    if (!id) { sendError(res, 400, 'Payment ID is required'); return; }
    const payment = await paymentService.getPaymentByIdService(id, req.user.userId, req.user.role);

    sendSuccess(res, 200, 'Payment retrieved successfully', payment);
  } catch (error) {
    console.error('Get payment by ID error:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('permission')) {
        sendError(res, 404, error.message);
        return;
      }
      sendError(res, 500, 'Failed to retrieve payment', error.message);
    } else {
      sendError(res, 500, 'Failed to retrieve payment', 'An unexpected error occurred');
    }
  }
};

