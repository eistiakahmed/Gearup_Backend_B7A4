import { Request, Response } from 'express';
import * as reviewService from './review.service';
import { sendSuccess, sendError, sendPaginatedResponse } from '../../utils/apiResponse.util';
import { RequestWithUser } from '../../middlewares/auth.middleware';

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Create review
 *     description: Create a new review for a gear item. Only accessible by customers who have rented the gear.
 *     tags:
 *       - Reviews
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
 *               - rating
 *               - comment
 *             properties:
 *               gearId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the gear item to review
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating from 1 to 5
 *                 example: 5
 *               comment:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 1000
 *                 description: Review comment
 *                 example: "Excellent gear, exactly as described. Will rent again!"
 *     responses:
 *       201:
 *         description: Review created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Review'
 *       400:
 *         description: Invalid input or user has not rented the gear
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
 *       409:
 *         description: User has already reviewed this gear
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
export const createReview = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Authentication required', 'User not authenticated');
      return;
    }

    if (req.user.role !== 'CUSTOMER') {
      sendError(res, 403, 'Access denied', 'Only customers can create reviews');
      return;
    }

    const reviewData = {
      ...req.body,
      userId: req.user.userId,
    };

    const review = await reviewService.createReviewService(reviewData);

    sendSuccess(res, 201, 'Review created successfully', review);
  } catch (error) {
    console.error('Create review error:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('permission') || error.message.includes('can only review') || error.message.includes('already reviewed')) {
        sendError(res, 400, error.message);
        return;
      }
      sendError(res, 500, 'Failed to create review', error.message);
    } else {
      sendError(res, 500, 'Failed to create review', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/reviews/gear/{gearId}:
 *   get:
 *     summary: Get reviews for gear item
 *     description: Retrieve a paginated list of reviews for a specific gear item.
 *     tags:
 *       - Reviews
 *     parameters:
 *       - in: path
 *         name: gearId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Gear item ID
 *       - in: query
 *         name: rating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Filter by rating
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
 *           enum: [createdAt, rating]
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
 *         description: Reviews retrieved successfully
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
 *                         $ref: '#/components/schemas/Review'
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
 *       400:
 *         description: Invalid gear ID
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
export const getGearReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const gearId = req.params['gearId'] as string;
    if (!gearId) { sendError(res, 400, 'Gear ID is required'); return; }

    const filters = {
      rating: req.query.rating ? parseInt(req.query.rating as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as string,
    };

    const result = await reviewService.getGearReviewsService(gearId, filters);

    sendPaginatedResponse(
      res,
      result.reviews,
      result.pagination.page,
      result.pagination.limit,
      result.pagination.total,
      'Reviews retrieved successfully'
    );
  } catch (error) {
    console.error('Get gear reviews error:', error);
    if (error instanceof Error) {
      sendError(res, 500, 'Failed to retrieve reviews', error.message);
    } else {
      sendError(res, 500, 'Failed to retrieve reviews', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/reviews/{id}:
 *   get:
 *     summary: Get review by ID
 *     description: Retrieve detailed information about a specific review.
 *     tags:
 *       - Reviews
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Review'
 *       400:
 *         description: Invalid review ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Review not found
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
export const getReviewById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    if (!id) { sendError(res, 400, 'Review ID is required'); return; }
    const review = await reviewService.getReviewByIdService(id);

    sendSuccess(res, 200, 'Review retrieved successfully', review);
  } catch (error) {
    console.error('Get review by ID error:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        sendError(res, 404, error.message);
        return;
      }
      sendError(res, 500, 'Failed to retrieve review', error.message);
    } else {
      sendError(res, 500, 'Failed to retrieve review', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/reviews/{id}:
 *   put:
 *     summary: Update review
 *     description: Update an existing review. Users can only update their own reviews.
 *     tags:
 *       - Reviews
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Updated rating from 1 to 5
 *                 example: 4
 *               comment:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 1000
 *                 description: Updated review comment
 *                 example: "Good gear, but delivery was delayed"
 *     responses:
 *       200:
 *         description: Review updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Review'
 *       400:
 *         description: Invalid input or not the review owner
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
 *         description: Not the review owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Review not found
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
export const updateReview = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Authentication required', 'User not authenticated');
      return;
    }

    const id = req.params['id'] as string;
    if (!id) { sendError(res, 400, 'Review ID is required'); return; }
    const updateData = {
      rating: req.body.rating ? parseInt(req.body.rating) : undefined,
      comment: req.body.comment,
    };

    const review = await reviewService.updateReviewService(id, req.user.userId, updateData);

    sendSuccess(res, 200, 'Review updated successfully', review);
  } catch (error) {
    console.error('Update review error:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('permission') || error.message.includes('can only update')) {
        sendError(res, 400, error.message);
        return;
      }
      sendError(res, 500, 'Failed to update review', error.message);
    } else {
      sendError(res, 500, 'Failed to update review', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/reviews/{id}:
 *   delete:
 *     summary: Delete review
 *     description: Delete a review. Users can only delete their own reviews, admins can delete any review.
 *     tags:
 *       - Reviews
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review deleted successfully
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
 *                         message:
 *                           type: string
 *                           example: "Review deleted successfully"
 *       400:
 *         description: Invalid review ID
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
 *         description: Not the review owner or admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Review not found
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
export const deleteReview = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Authentication required', 'User not authenticated');
      return;
    }

    const id = req.params['id'] as string;
    if (!id) { sendError(res, 400, 'Review ID is required'); return; }
    const result = await reviewService.deleteReviewService(id, req.user.userId, req.user.role);

    sendSuccess(res, 200, result.message, result);
  } catch (error) {
    console.error('Delete review error:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('permission')) {
        sendError(res, 404, error.message);
        return;
      }
      sendError(res, 500, 'Failed to delete review', error.message);
    } else {
      sendError(res, 500, 'Failed to delete review', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/reviews/user/me:
 *   get:
 *     summary: Get user's reviews
 *     description: Retrieve a paginated list of reviews written by the authenticated user.
 *     tags:
 *       - Reviews
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: rating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Filter by rating
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
 *           enum: [createdAt, rating]
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
 *         description: Reviews retrieved successfully
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
 *                         $ref: '#/components/schemas/Review'
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
export const getUserReviews = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Authentication required', 'User not authenticated');
      return;
    }

    const filters = {
      rating: req.query.rating ? parseInt(req.query.rating as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as string,
    };

    const result = await reviewService.getUserReviewsService(req.user.userId, filters);

    sendPaginatedResponse(
      res,
      result.reviews,
      result.pagination.page,
      result.pagination.limit,
      result.pagination.total,
      'Reviews retrieved successfully'
    );
  } catch (error) {
    console.error('Get user reviews error:', error);
    if (error instanceof Error) {
      sendError(res, 500, 'Failed to retrieve reviews', error.message);
    } else {
      sendError(res, 500, 'Failed to retrieve reviews', 'An unexpected error occurred');
    }
  }
};