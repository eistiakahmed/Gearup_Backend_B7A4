import { Request, Response } from 'express';
import * as gearService from './gear.service';
import { sendSuccess, sendError, sendPaginatedResponse } from '../../utils/apiResponse.util';
import { RequestWithUser } from '../../middlewares/auth.middleware';

/**
 * @swagger
 * /api/gear:
 *   get:
 *     summary: Get all gear items
 *     description: Retrieve a paginated list of gear items with optional filtering by category, price, brand, availability, and more.
 *     tags:
 *       - Gear
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *           format: float
 *         description: Minimum price per day
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           format: float
 *         description: Maximum price per day
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *       - in: query
 *         name: isAvailable
 *         schema:
 *           type: boolean
 *         description: Filter by availability status
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
 *           enum: [price, createdAt, rating, title]
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
 *       400:
 *         description: Invalid query parameters
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
export const getAllGear = async (req: Request, res: Response): Promise<void> => {
  try {
    const params = {
      category: req.query.category as string,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
      brand: req.query.brand as string,
      search: req.query.search as string,
      isAvailable: req.query.isAvailable === 'true' ? true : req.query.isAvailable === 'false' ? false : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as string,
    };

    const result = await gearService.getAllGearService(params);

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
 * /api/gear/{id}:
 *   get:
 *     summary: Get gear item by ID
 *     description: Retrieve detailed information about a specific gear item including its reviews and availability.
 *     tags:
 *       - Gear
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Gear item ID
 *     responses:
 *       200:
 *         description: Gear item retrieved successfully
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
 *         description: Invalid gear ID
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
export const getGearById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    if (!id) { sendError(res, 400, 'Gear ID is required'); return; }
    const gearItem = await gearService.getGearByIdService(id);

    sendSuccess(res, 200, 'Gear item retrieved successfully', gearItem);
  } catch (error) {
    console.error('Get gear by ID error:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        sendError(res, 404, error.message);
        return;
      }
      sendError(res, 500, 'Failed to retrieve gear item', error.message);
    } else {
      sendError(res, 500, 'Failed to retrieve gear item', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/gear:
 *   post:
 *     summary: Create new gear item
 *     description: Create a new gear item listing. Only accessible by users with PROVIDER role.
 *     tags:
 *       - Gear
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - categoryId
 *               - pricePerDay
 *               - condition
 *               - location
 *             properties:
 *               title:
 *                 type: string
 *                 description: Gear item title
 *                 example: "Professional Tennis Racket"
 *               description:
 *                 type: string
 *                 description: Detailed description of the gear
 *                 example: "High-performance tennis racket suitable for intermediate to advanced players"
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *                 description: Category ID
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               pricePerDay:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 description: Daily rental price
 *                 example: 25.00
 *               condition:
 *                 type: string
 *                 enum: [NEW, GOOD, FAIR, POOR]
 *                 description: Condition of the gear
 *                 example: "GOOD"
 *               location:
 *                 type: string
 *                 description: Physical location of the gear
 *                 example: "San Francisco, CA"
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of image URLs
 *                 example: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
 *               specs:
 *                 type: object
 *                 description: Additional specifications (varies by category)
 *                 example: {"brand": "Wilson", "weight": "300g", "gripSize": "4 3/8"}
 *     responses:
 *       201:
 *         description: Gear item created successfully
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
 *         description: Invalid input or duplicate gear
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
 *         description: User is not a provider
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
export const createGear = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Authentication required', 'User not authenticated');
      return;
    }

    const gearData = {
      ...req.body,
      providerId: req.user.userId,
    };

    const gearItem = await gearService.createGearService(gearData);

    sendSuccess(res, 201, 'Gear item created successfully', gearItem);
  } catch (error) {
    console.error('Create gear error:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        sendError(res, 404, error.message);
        return;
      }
      if (error.message.includes('already exists') || error.message.includes('permission')) {
        sendError(res, 400, error.message);
        return;
      }
      sendError(res, 500, 'Failed to create gear item', error.message);
    } else {
      sendError(res, 500, 'Failed to create gear item', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/gear/{id}:
 *   put:
 *     summary: Update gear item
 *     description: Update an existing gear item. Only accessible by the provider who owns the gear.
 *     tags:
 *       - Gear
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
 *             properties:
 *               title:
 *                 type: string
 *                 description: Gear item title
 *               description:
 *                 type: string
 *                 description: Detailed description of the gear
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *                 description: Category ID
 *               pricePerDay:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 description: Daily rental price
 *               condition:
 *                 type: string
 *                 enum: [NEW, GOOD, FAIR, POOR]
 *                 description: Condition of the gear
 *               location:
 *                 type: string
 *                 description: Physical location of the gear
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of image URLs
 *               specs:
 *                 type: object
 *                 description: Additional specifications
 *               isAvailable:
 *                 type: boolean
 *                 description: Availability status
 *     responses:
 *       200:
 *         description: Gear item updated successfully
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
 *         description: Invalid input or duplicate gear
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
 *         description: User is not the gear owner
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
export const updateGear = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Authentication required', 'User not authenticated');
      return;
    }

    const id = req.params['id'] as string;
    if (!id) { sendError(res, 400, 'Gear ID is required'); return; }
    const gearItem = await gearService.updateGearService(id, req.user.userId, req.body);

    sendSuccess(res, 200, 'Gear item updated successfully', gearItem);
  } catch (error) {
    console.error('Update gear error:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('permission')) {
        sendError(res, 404, error.message);
        return;
      }
      if (error.message.includes('already exists')) {
        sendError(res, 400, error.message);
        return;
      }
      sendError(res, 500, 'Failed to update gear item', error.message);
    } else {
      sendError(res, 500, 'Failed to update gear item', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/gear/{id}:
 *   delete:
 *     summary: Delete gear item
 *     description: Delete a gear item. Only accessible by the provider who owns the gear. Cannot delete gear with active rentals.
 *     tags:
 *       - Gear
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
 *     responses:
 *       200:
 *         description: Gear item deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               success: true
 *               message: "Gear item deleted successfully"
 *       400:
 *         description: Cannot delete gear with active rentals
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
 *         description: User is not the gear owner
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
export const deleteGear = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Authentication required', 'User not authenticated');
      return;
    }

    const id = req.params['id'] as string;
    if (!id) { sendError(res, 400, 'Gear ID is required'); return; }
    const result = await gearService.deleteGearService(id, req.user.userId);

    sendSuccess(res, 200, result.message, result);
  } catch (error) {
    console.error('Delete gear error:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('permission')) {
        sendError(res, 404, error.message);
        return;
      }
      if (error.message.includes('active rentals')) {
        sendError(res, 400, error.message);
        return;
      }
      sendError(res, 500, 'Failed to delete gear item', error.message);
    } else {
      sendError(res, 500, 'Failed to delete gear item', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/gear/categories/all:
 *   get:
 *     summary: Get all categories
 *     description: Retrieve a list of all gear categories available in the system.
 *     tags:
 *       - Categories
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
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const getAllCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await gearService.getAllCategoriesService();

    sendSuccess(res, 200, 'Categories retrieved successfully', categories);
  } catch (error) {
    console.error('Get all categories error:', error);
    sendError(res, 500, 'Failed to retrieve categories', 'An unexpected error occurred');
  }
};

/**
 * @swagger
 * /api/gear/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     description: Retrieve detailed information about a specific category including its gear items.
 *     tags:
 *       - Categories
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
 *         description: Category retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       allOf:
 *                         - $ref: '#/components/schemas/Category'
 *                         - type: object
 *                           properties:
 *                             gearItems:
 *                               type: array
 *                               items:
 *                                 $ref: '#/components/schemas/Gear'
 *       400:
 *         description: Invalid category ID
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
export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    if (!id) { sendError(res, 400, 'Category ID is required'); return; }
    const category = await gearService.getCategoryByIdService(id);

    sendSuccess(res, 200, 'Category retrieved successfully', category);
  } catch (error) {
    console.error('Get category by ID error:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        sendError(res, 404, error.message);
        return;
      }
      sendError(res, 500, 'Failed to retrieve category', error.message);
    } else {
      sendError(res, 500, 'Failed to retrieve category', 'An unexpected error occurred');
    }
  }
};

/**
 * @swagger
 * /api/gear/categories:
 *   post:
 *     summary: Create new category
 *     description: Create a new gear category. Only accessible by admin users.
 *     tags:
 *       - Categories
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
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *                 description: Category name
 *                 example: "Camping Equipment"
 *               description:
 *                 type: string
 *                 description: Category description
 *                 example: "Tents, sleeping bags, and camping accessories"
 *               icon:
 *                 type: string
 *                 description: Category icon URL
 *                 example: "https://example.com/icons/camping.svg"
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
 *         description: Invalid input or category already exists
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
 *         description: User is not an admin
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
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    const category = await gearService.createCategoryService(name, description);

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