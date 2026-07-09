import { Prisma } from '../../../generated/prisma/client';
import { OrderStatus } from '../../../generated/prisma/enums';
import { prisma } from '../../config/database';
import { calculateRentalPricing, checkAvailability, updateGearStockForOrder } from '../../utils/availability.util';
import { RentalItem } from './rental.interface';

export interface CreateRentalOrderData {
  customerId: string;
  items: RentalItem[];
  startDate: Date;
  endDate: Date;
  pickupAddress?: string;
  returnAddress?: string;
  notes?: string;
}

export interface UpdateOrderStatusData {
  status: OrderStatus;
  notes?: string;
}

/**
 * Generate unique order number
 */
const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `GEAR-${timestamp}-${random}`;
};

/**
 * Create rental order
 */
export const createRentalOrderService = async (data: CreateRentalOrderData) => {
  const { customerId, items, startDate, endDate, pickupAddress, returnAddress, notes } = data;

  // Validate dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (start < today) {
    throw new Error('Start date cannot be in the past');
  }

  if (end <= start) {
    throw new Error('End date must be after start date');
  }

  // Maximum rental period check (30 days)
  const maxEndDate = new Date(start);
  maxEndDate.setDate(maxEndDate.getDate() + 30);
  if (end > maxEndDate) {
    throw new Error('Rental period cannot exceed 30 days');
  }

  // Get gear items and verify availability
  const gearItems = await Promise.all(
    items.map(async (item) => {
      const gear = await prisma.gearItem.findUnique({
        where: { id: item.gearId },
      });

      if (!gear) {
        throw new Error(`Gear item with ID ${item.gearId} not found`);
      }

      if (!gear.isAvailable) {
        throw new Error(`Gear item "${gear.name}" is not available for rent`);
      }

      if (gear.currentStock < item.quantity) {
        throw new Error(`Insufficient stock for "${gear.name}". Available: ${gear.currentStock}, Requested: ${item.quantity}`);
      }

      return {
        gear,
        quantity: item.quantity,
      };
    })
  );

  // Check availability for the requested dates
  const availabilityChecks = gearItems.map((item) => ({
    gearId: item.gear.id,
    quantity: item.quantity,
    startDate: start,
    endDate: end,
  }));

  const availabilityResults = await checkAvailability(availabilityChecks);

  const unavailableItems = availabilityResults.filter((result) => !result.isAvailable);
  if (unavailableItems.length > 0) {
    const unavailableDetails = unavailableItems.map((result) => {
      const gear = gearItems.find((item) => item.gear.id === result.gearId);
      return `${gear?.gear.name}: ${result.availableQuantity} available, ${result.requestedQuantity} requested`;
    });
    throw new Error(`Some items are not available for the selected dates: ${unavailableDetails.join(', ')}`);
  }

  // Calculate total amount
  let totalAmount = 0;
  let depositAmount = 0;
  const orderItems = gearItems.map((item) => {
    const pricing = calculateRentalPricing(
      start,
      end,
      Number(item.gear.dailyRate),
      item.gear.weeklyRate ? Number(item.gear.weeklyRate) : undefined,
      item.gear.monthlyRate ? Number(item.gear.monthlyRate) : undefined
    );

    const itemTotal = pricing.totalAmount * item.quantity;
    totalAmount += itemTotal;

    if (item.gear.depositAmount) {
      depositAmount += Number(item.gear.depositAmount) * item.quantity;
    }

    return {
      gearId: item.gear.id,
      quantity: item.quantity,
      dailyRate: item.gear.dailyRate,
      totalAmount: new Prisma.Decimal(itemTotal),
    };
  });

  // Calculate total days
  const timeDiff = end.getTime() - start.getTime();
  const totalDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  // Create rental order
  const order = await prisma.rentalOrder.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerId,
      startDate: start,
      endDate: end,
      totalDays,
      totalAmount: new Prisma.Decimal(totalAmount),
      depositAmount: depositAmount > 0 ? new Prisma.Decimal(depositAmount) : null,
      status: OrderStatus.PLACED,
      notes,
      pickupAddress,
      returnAddress,
      items: {
        create: orderItems,
      },
    },
    include: {
      items: {
        include: {
          gear: {
            include: {
              category: true,
              provider: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phoneNumber: true,
                },
              },
            },
          },
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
        },
      },
    },
  });

  return order;
};

/**
 * Get rental orders for a user
 */
export const getUserRentalOrdersService = async (userId: string, filters: any) => {
  const { status, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = filters;

  const skip = (page - 1) * limit;

  const where: any = { customerId: userId };

  if (status) {
    where.status = status;
  }

  const [orders, total] = await Promise.all([
    prisma.rentalOrder.findMany({
      where,
      skip,
      take: limit,
      include: {
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
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
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
 * Get rental order by ID
 */
export const getRentalOrderByIdService = async (orderId: string, userId: string, userRole: string) => {
  const order = await prisma.rentalOrder.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          gear: {
            include: {
              category: true,
              provider: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phoneNumber: true,
                },
              },
            },
          },
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          address: true,
        },
      },
      payments: true,
      reviews: true,
    },
  });

  if (!order) {
    throw new Error('Rental order not found');
  }

  // Check access permissions
  const isCustomer = order.customerId === userId;
  const isProvider = order.items.some((item) => item.gear.providerId === userId);
  const isAdmin = userRole === 'ADMIN';

  if (!isCustomer && !isProvider && !isAdmin) {
    throw new Error('You do not have permission to view this order');
  }

  return order;
};

/**
 * Update rental order status (Provider/Admin only)
 */
export const updateOrderStatusService = async (
  orderId: string,
  providerId: string,
  userRole: string,
  data: UpdateOrderStatusData
) => {
  const { status, notes } = data;

  // Get existing order
  const existingOrder = await prisma.rentalOrder.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          gear: true,
        },
      },
    },
  });

  if (!existingOrder) {
    throw new Error('Rental order not found');
  }

  // Verify provider owns the gear items
  const isProvider = existingOrder.items.some((item) => item.gear.providerId === providerId);
  const isAdmin = userRole === 'ADMIN';

  if (!isProvider && !isAdmin) {
    throw new Error('You do not have permission to update this order');
  }

  // Validate status transitions
  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PLACED]: ['CONFIRMED', 'CANCELLED'],
    [OrderStatus.CONFIRMED]: ['PAID', 'CANCELLED'],
    [OrderStatus.PAID]: ['PICKED_UP'],
    [OrderStatus.PICKED_UP]: ['RETURNED'],
    [OrderStatus.RETURNED]: [],
    [OrderStatus.CANCELLED]: [],
  };

  const allowedStatuses = validTransitions[existingOrder.status] ?? [];
  if (!allowedStatuses.includes(status)) {
    throw new Error(`Cannot change order status from ${existingOrder.status} to ${status}`);
  }

  // Update gear stock based on status change
  await updateGearStockForOrder(orderId, status, existingOrder.status);

  // Update order
  const updatedOrder = await prisma.rentalOrder.update({
    where: { id: orderId },
    data: {
      status,
      notes: notes || existingOrder.notes,
    },
    include: {
      items: {
        include: {
          gear: {
            include: {
              category: true,
              provider: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phoneNumber: true,
                },
              },
            },
          },
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
        },
      },
      payments: true,
    },
  });

  return updatedOrder;
};

/**
 * Cancel rental order (Customer only)
 */
export const cancelRentalOrderService = async (orderId: string, customerId: string) => {
  const existingOrder = await prisma.rentalOrder.findUnique({
    where: { id: orderId },
  });

  if (!existingOrder) {
    throw new Error('Rental order not found');
  }

  if (existingOrder.customerId !== customerId) {
    throw new Error('You do not have permission to cancel this order');
  }

  if (existingOrder.status !== OrderStatus.PLACED) {
    throw new Error('Only placed orders can be cancelled');
  }

  // Update gear stock
  await updateGearStockForOrder(orderId, OrderStatus.CANCELLED, existingOrder.status);

  // Update order status
  const cancelledOrder = await prisma.rentalOrder.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.CANCELLED,
    },
    include: {
      items: {
        include: {
          gear: true,
        },
      },
    },
  });

  return cancelledOrder;
};