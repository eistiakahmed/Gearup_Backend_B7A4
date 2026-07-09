import { OrderStatus } from '../../../generated/prisma/enums';
import { prisma } from '../../config/database';
import { CreateReviewData } from './review.interface';

/**
 * Create review service
 */
export const createReviewService = async (data: CreateReviewData) => {
  const { gearId, orderId, rating, comment, userId } = data;

  // Verify gear exists
  const gear = await prisma.gearItem.findUnique({
    where: { id: gearId },
  });

  if (!gear) {
    throw new Error('Gear item not found');
  }

  // Verify order exists and belongs to user
  const order = await prisma.rentalOrder.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error('Rental order not found');
  }

  if (order.customerId !== userId) {
    throw new Error('You can only review items from your own orders');
  }

  // Verify order is in RETURNED status
  if (order.status !== OrderStatus.RETURNED) {
    throw new Error('You can only review items from returned orders');
  }

  // Verify gear is in this order
  const orderItem = await prisma.rentalOrderItem.findFirst({
    where: {
      orderId,
      gearId,
    },
  });

  if (!orderItem) {
    throw new Error('This gear item is not part of the specified order');
  }

  // Check if review already exists
  const existingReview = await prisma.review.findFirst({
    where: {
      userId,
      gearId,
      orderId,
    },
  });

  if (existingReview) {
    throw new Error('You have already reviewed this gear item for this order');
  }

  // Create review
  const review = await prisma.review.create({
    data: {
      rating,
      comment,
      gearId,
      userId,
      orderId,
    },
    include: {
      gear: {
        include: {
          category: true,
          provider: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return review;
};

/**
 * Get reviews for gear item
 */
export const getGearReviewsService = async (gearId: string, filters: any) => {
  const { rating, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = filters;

  const skip = (page - 1) * limit;

  const where: any = { gearId };

  if (rating) {
    where.rating = rating;
  }

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        order: {
          select: {
            orderNumber: true,
            startDate: true,
            endDate: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
    }),
    prisma.review.count({ where }),
  ]);

  return {
    reviews,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get review by ID
 */
export const getReviewByIdService = async (reviewId: string) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      gear: {
        include: {
          category: true,
          provider: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      order: {
        select: {
          orderNumber: true,
          status: true,
        },
      },
    },
  });

  if (!review) {
    throw new Error('Review not found');
  }

  return review;
};

/**
 * Update review service
 */
export const updateReviewService = async (reviewId: string, userId: string, data: { rating?: number; comment?: string }) => {
  const { rating, comment } = data;

  // Get existing review
  const existingReview = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!existingReview) {
    throw new Error('Review not found');
  }

  // Verify user owns the review
  if (existingReview.userId !== userId) {
    throw new Error('You can only update your own reviews');
  }

  // Update review
  const updatedReview = await prisma.review.update({
    where: { id: reviewId },
    data: {
      ...(rating !== undefined && { rating }),
      ...(comment !== undefined && { comment }),
    },
    include: {
      gear: {
        include: {
          category: true,
          provider: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return updatedReview;
};

/**
 * Delete review service
 */
export const deleteReviewService = async (reviewId: string, userId: string, userRole: string) => {
  // Get existing review
  const existingReview = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!existingReview) {
    throw new Error('Review not found');
  }

  // Verify user owns the review or is admin
  const isOwner = existingReview.userId === userId;
  const isAdmin = userRole === 'ADMIN';

  if (!isOwner && !isAdmin) {
    throw new Error('You do not have permission to delete this review');
  }

  // Delete review
  await prisma.review.delete({
    where: { id: reviewId },
  });

  return { message: 'Review deleted successfully' };
};

/**
 * Get user's reviews
 */
export const getUserReviewsService = async (userId: string, filters: any) => {
  const { rating, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = filters;

  const skip = (page - 1) * limit;

  const where: any = { userId };

  if (rating) {
    where.rating = rating;
  }

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      skip,
      take: limit,
      include: {
        gear: {
          include: {
            category: true,
            provider: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        order: {
          select: {
            orderNumber: true,
            status: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
    }),
    prisma.review.count({ where }),
  ]);

  return {
    reviews,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};