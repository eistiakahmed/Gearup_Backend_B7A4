import { OrderStatus } from '../../../generated/prisma/enums';
import { prisma } from '../../config/database';

/**
 * Get provider's incoming rental orders
 */
export const getProviderOrdersService = async (providerId: string, filters: any) => {
  const { status, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = filters;

  const skip = (page - 1) * limit;

  // Build where clause for provider's gear items
  const where: any = {
    items: {
      some: {
        gear: {
          providerId,
        },
      },
    },
  };

  if (status) {
    where.status = status;
  }

  const [orders, total] = await Promise.all([
    prisma.rentalOrder.findMany({
      where,
      skip,
      take: limit,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
        items: {
          include: {
            gear: {
              include: {
                category: true,
              },
            },
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            status: true,
            method: true,
            paidAt: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
    }),
    prisma.rentalOrder.count({ where }),
  ]);

  return {
    orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get provider's specific order by ID
 */
export const getProviderOrderByIdService = async (orderId: string, providerId: string) => {
  // First check if this order contains provider's gear
  const order = await prisma.rentalOrder.findFirst({
    where: {
      id: orderId,
      items: {
        some: {
          gear: {
            providerId,
          },
        },
      },
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
        },
      },
      items: {
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
        },
      },
      payments: {
        select: {
          id: true,
          amount: true,
          status: true,
          method: true,
          paidAt: true,
          transactionId: true,
        },
      },
      reviews: {
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new Error('Order not found or you do not have permission to view this order');
  }

  return order;
};

/**
 * Get provider's gear inventory
 */
export const getProviderGearService = async (providerId: string, filters: any) => {
  const { category, isAvailable, search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = filters;

  const skip = (page - 1) * limit;

  const where: any = { providerId };

  if (category) {
    where.categoryId = category;
  }

  if (isAvailable !== undefined) {
    where.isAvailable = isAvailable;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { brand: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [gearItems, total] = await Promise.all([
    prisma.gearItem.findMany({
      where,
      skip,
      take: limit,
      include: {
        category: true,
        _count: {
          select: {
            rentalOrders: true,
            reviews: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
    }),
    prisma.gearItem.count({ where }),
  ]);

  return {
    gearItems,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Update provider's gear availability status
 */
export const updateProviderGearStatusService = async (gearId: string, providerId: string, data: { isAvailable?: boolean; currentStock?: number }) => {
  const { isAvailable, currentStock } = data;

  // Check if gear exists and belongs to provider
  const gear = await prisma.gearItem.findUnique({
    where: { id: gearId },
  });

  if (!gear) {
    throw new Error('Gear item not found');
  }

  if (gear.providerId !== providerId) {
    throw new Error('You do not have permission to update this gear item');
  }

  // Update gear status
  const updatedGear = await prisma.gearItem.update({
    where: { id: gearId },
    data: {
      ...(isAvailable !== undefined && { isAvailable }),
      ...(currentStock !== undefined && { currentStock }),
    },
    include: {
      category: true,
    },
  });

  return updatedGear;
};
