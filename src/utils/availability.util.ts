import { OrderStatus } from '../../generated/prisma/enums';
import { prisma } from '../config/database';

export interface AvailabilityCheck {
  gearId: string;
  quantity: number;
  startDate: Date;
  endDate: Date;
}

export interface AvailabilityResult {
  gearId: string;
  isAvailable: boolean;
  availableQuantity: number;
  requestedQuantity: number;
  conflictOrders?: string[];
}

/**
 * Check if gear items are available for the requested dates
 * @param checks - Array of availability checks to perform
 * @returns Array of availability results
 */
export const checkAvailability = async (checks: AvailabilityCheck[]): Promise<AvailabilityResult[]> => {
  const results = await Promise.all(
    checks.map(async (check) => {
      const { gearId, quantity, startDate, endDate } = check;

      // Get the gear item
      const gearItem = await prisma.gearItem.findUnique({
        where: { id: gearId },
      });

      if (!gearItem) {
        return {
          gearId,
          isAvailable: false,
          availableQuantity: 0,
          requestedQuantity: quantity,
          conflictOrders: [],
        };
      }

      // Check if gear is available
      if (!gearItem.isAvailable || gearItem.currentStock < 1) {
        return {
          gearId,
          isAvailable: false,
          availableQuantity: gearItem.currentStock,
          requestedQuantity: quantity,
          conflictOrders: [],
        };
      }

      // Find conflicting orders
      const conflictOrders = await prisma.rentalOrderItem.findMany({
        where: {
          gearId,
          order: {
            status: {
              in: ['CONFIRMED', 'PAID', 'PICKED_UP'],
            },
            OR: [
              {
                // Order starts during requested period
                AND: [
                  { startDate: { lte: endDate } },
                  { startDate: { gte: startDate } },
                ],
              },
              {
                // Order ends during requested period
                AND: [
                  { endDate: { lte: endDate } },
                  { endDate: { gte: startDate } },
                ],
              },
              {
                // Order spans the entire requested period
                AND: [
                  { startDate: { lte: startDate } },
                  { endDate: { gte: endDate } },
                ],
              },
            ],
          },
        },
        include: {
          order: {
            select: {
              orderNumber: true,
              status: true,
            },
          },
        },
      });

      // Calculate total quantity of conflicting orders
      const conflictingQuantity = conflictOrders.reduce(
        (total, item) => total + item.quantity,
        0
      );

      // Calculate available quantity
      const availableQuantity = Math.max(0, gearItem.currentStock - conflictingQuantity);

      return {
        gearId,
        isAvailable: availableQuantity >= quantity,
        availableQuantity,
        requestedQuantity: quantity,
        conflictOrders: conflictOrders.map((item) => item.order.orderNumber),
      };
    })
  );

  return results;
};

/**
 * Calculate rental days and pricing
 * @param startDate - Rental start date
 * @param endDate - Rental end date
 * @param dailyRate - Daily rental rate
 * @param weeklyRate - Weekly rental rate (optional)
 * @param monthlyRate - Monthly rental rate (optional)
 * @returns Total days and total amount
 */
export const calculateRentalPricing = (
  startDate: Date,
  endDate: Date,
  dailyRate: number,
  weeklyRate?: number,
  monthlyRate?: number
) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Calculate total days
  const timeDiff = end.getTime() - start.getTime();
  const totalDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  // Calculate weeks and remaining days
  const weeks = Math.floor(totalDays / 7);
  const remainingDays = totalDays % 7;

  // Calculate months and remaining days
  const months = Math.floor(totalDays / 30);
  const remainingDaysAfterMonth = totalDays % 30;

  // Determine best pricing
  let totalAmount = 0;
  let breakdown = [];

  if (monthlyRate && months > 0) {
    const monthlyCost = months * monthlyRate;
    totalAmount += monthlyCost;
    breakdown.push({ type: 'monthly', quantity: months, rate: monthlyRate, cost: monthlyCost });

    // Calculate remaining days after monthly pricing
    if (remainingDaysAfterMonth > 0) {
      if (weeklyRate && remainingDaysAfterMonth >= 7) {
        const remainingWeeks = Math.floor(remainingDaysAfterMonth / 7);
        const remainingDaysAfterWeek = remainingDaysAfterMonth % 7;

        if (remainingWeeks > 0) {
          const weeklyCost = remainingWeeks * weeklyRate;
          totalAmount += weeklyCost;
          breakdown.push({ type: 'weekly', quantity: remainingWeeks, rate: weeklyRate, cost: weeklyCost });
        }

        if (remainingDaysAfterWeek > 0) {
          const dailyCost = remainingDaysAfterWeek * dailyRate;
          totalAmount += dailyCost;
          breakdown.push({ type: 'daily', quantity: remainingDaysAfterWeek, rate: dailyRate, cost: dailyCost });
        }
      } else {
        const dailyCost = remainingDaysAfterMonth * dailyRate;
        totalAmount += dailyCost;
        breakdown.push({ type: 'daily', quantity: remainingDaysAfterMonth, rate: dailyRate, cost: dailyCost });
      }
    }
  } else if (weeklyRate && totalDays >= 7) {
    const weeklyCost = weeks * weeklyRate;
    totalAmount += weeklyCost;
    breakdown.push({ type: 'weekly', quantity: weeks, rate: weeklyRate, cost: weeklyCost });

    if (remainingDays > 0) {
      const dailyCost = remainingDays * dailyRate;
      totalAmount += dailyCost;
      breakdown.push({ type: 'daily', quantity: remainingDays, rate: dailyRate, cost: dailyCost });
    }
  } else {
    const dailyCost = totalDays * dailyRate;
    totalAmount += dailyCost;
    breakdown.push({ type: 'daily', quantity: totalDays, rate: dailyRate, cost: dailyCost });
  }

  return {
    totalDays,
    totalAmount,
    breakdown,
  };
};

/**
 * Update gear stock based on rental order status
 * @param orderId - Rental order ID
 * @param newStatus - New order status
 * @param oldStatus - Previous order status (optional)
 */
export const updateGearStockForOrder = async (
  orderId: string,
  newStatus: OrderStatus,
  oldStatus?: OrderStatus
): Promise<void> => {
  if (!oldStatus || oldStatus === newStatus) {
    return;
  }

  // Get all order items
  const orderItems = await prisma.rentalOrderItem.findMany({
    where: { orderId },
    include: {
      gear: true,
    },
  });

  // Update stock for each gear item
  for (const item of orderItems) {
    const gear = item.gear;
    let stockAdjustment = 0;

    // When order is CONFIRMED, reduce stock
    if (newStatus === 'CONFIRMED' && (!oldStatus || oldStatus === 'PLACED')) {
      stockAdjustment = -item.quantity;
    }
    // When order is CANCELLED or RETURNED, restore stock
    else if ((newStatus === 'CANCELLED' || newStatus === 'RETURNED') &&
      (oldStatus === 'CONFIRMED' || oldStatus === 'PAID' || oldStatus === 'PICKED_UP')) {
      stockAdjustment = item.quantity;
    }

    if (stockAdjustment !== 0) {
      await prisma.gearItem.update({
        where: { id: gear.id },
        data: {
          currentStock: Math.max(0, gear.currentStock + stockAdjustment),
        },
      });
    }
  }
};