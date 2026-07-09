import { UserRole } from '../../../generated/prisma/enums';
import { prisma } from '../../config/database';
import { UpdateUserStatusData } from './admin.interface';

/**
 * Get all users (Admin only)
 */
export const getAllUsersService = async (filters: any) => {
  const { status, role, search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = filters;

  const skip = (page - 1) * limit;

  const where: any = {};

  if (status) {
    where.isActive = status === 'active';
  }

  if (role) {
    where.role = role;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phoneNumber: true,
        address: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            gearItems: true,
            rentalOrders: true,
            reviews: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get user by ID (Admin only)
 */
export const getUserByIdService = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phoneNumber: true,
      address: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      gearItems: {
        include: {
          category: true,
        },
        take: 10,
      },
      rentalOrders: {
        take: 10,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          items: {
            include: {
              gear: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
      payments: {
        take: 10,
        orderBy: {
          createdAt: 'desc',
        },
      },
      reviews: {
        take: 10,
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

/**
 * Update user status (Admin only)
 */
export const updateUserStatusService = async (userId: string, data: UpdateUserStatusData) => {
  const { isActive, reason } = data;

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    throw new Error('User not found');
  }

  // Prevent admin from deactivating themselves
  if (existingUser.role === UserRole.ADMIN && !isActive) {
    throw new Error('Cannot deactivate admin accounts');
  }

  // Update user status
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      isActive,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      updatedAt: true,
    },
  });

  // Log the action (you could create an audit log table for this)
  console.log(`User ${userId} status updated to ${isActive} by admin. Reason: ${reason || 'Not provided'}`);

  return updatedUser;
};

/**
 * Get all gear items (Admin only)
 */
export const getAllGearService = async (filters: any) => {
  const { category, provider, isAvailable, search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = filters;

  const skip = (page - 1) * limit;

  const where: any = {};

  if (category) {
    where.categoryId = category;
  }

  if (provider) {
    where.providerId = provider;
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
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
 * Get all rental orders (Admin only)
 */
export const getAllRentalOrdersService = async (filters: any) => {
  const { status, customer, provider, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = filters;

  const skip = (page - 1) * limit;

  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (customer) {
    where.customerId = customer;
  }

  if (provider) {
    where.items = {
      some: {
        gear: {
          providerId: provider,
        },
      },
    };
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
        payments: true,
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
 * Get dashboard statistics (Admin only)
 */
export const getDashboardStatsService = async () => {
  const [
    totalUsers,
    totalProviders,
    totalCustomers,
    activeUsers,
    totalGearItems,
    availableGearItems,
    totalOrders,
    ordersByStatus,
    totalPayments,
    completedPayments,
    totalRevenue,
  ] = await Promise.all([
    // User stats
    prisma.user.count(),
    prisma.user.count({ where: { role: 'PROVIDER' } }),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.user.count({ where: { isActive: true } }),

    // Gear stats
    prisma.gearItem.count(),
    prisma.gearItem.count({ where: { isAvailable: true } }),

    // Order stats
    prisma.rentalOrder.count(),
    prisma.rentalOrder.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    }),

    // Payment stats
    prisma.payment.count(),
    prisma.payment.count({ where: { status: 'COMPLETED' } }),

    // Revenue
    prisma.payment.aggregate({
      where: { status: 'COMPLETED' },
      _sum: {
        amount: true,
      },
    }),
  ]);

  return {
    users: {
      total: totalUsers,
      providers: totalProviders,
      customers: totalCustomers,
      active: activeUsers,
    },
    gear: {
      total: totalGearItems,
      available: availableGearItems,
      unavailable: totalGearItems - availableGearItems,
    },
    orders: {
      total: totalOrders,
      byStatus: ordersByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {} as Record<string, number>),
    },
    payments: {
      total: totalPayments,
      completed: completedPayments,
      pending: totalPayments - completedPayments,
    },
    revenue: {
      total: totalRevenue._sum.amount ? Number(totalRevenue._sum.amount) : 0,
    },
  };
};