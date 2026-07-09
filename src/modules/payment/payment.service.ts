import { PaymentMethod, PaymentStatus } from '../../../generated/prisma/enums';
import { prisma } from '../../config/database';
import { createStripePaymentIntent, getStripePaymentIntent } from '../../config/stripe.config';
import { CreatePaymentData, ConfirmPaymentData } from './payment.interface';

/**
 * Generate unique transaction ID
 */
const generateTransactionId = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN-${timestamp}-${random}`;
};

/**
 * Create payment intent/session
 */
export const createPaymentService = async (data: CreatePaymentData, userId: string) => {
  const { orderId, method, currency = 'USD', successUrl, cancelUrl, failUrl } = data;

  // Get rental order
  const order = await prisma.rentalOrder.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
    },
  });

  if (!order) {
    throw new Error('Rental order not found');
  }

  // Verify order belongs to user
  if (order.customerId !== userId) {
    throw new Error('You do not have permission to create payment for this order');
  }

  // Check if order is in correct status
  if (order.status !== 'CONFIRMED') {
    throw new Error('Payment can only be created for confirmed orders');
  }

  // Check if payment already exists
  const existingPayment = await prisma.payment.findFirst({
    where: {
      orderId,
      status: {
        in: ['PENDING', 'COMPLETED'],
      },
    },
  });

  if (existingPayment) {
    throw new Error('Payment already exists for this order');
  }

  const transactionId = generateTransactionId();
  const totalAmount = Number(order.totalAmount);

  let providerResponse: any = null;
  let paymentUrl: string | null = null;

  // Create Stripe payment intent
  const stripeIntent = await createStripePaymentIntent(
    totalAmount,
    currency.toLowerCase(),
    {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerEmail: order.customer.email,
    }
  );

  providerResponse = {
    intentId: stripeIntent.id,
    clientSecret: stripeIntent.client_secret,
    amount: stripeIntent.amount,
    currency: stripeIntent.currency,
    status: stripeIntent.status,
  };

  paymentUrl = null; // Stripe uses client secret on frontend

  // Create payment record
  const payment = await prisma.payment.create({
    data: {
      transactionId,
      orderId,
      userId,
      amount: order.totalAmount,
      method,
      status: PaymentStatus.PENDING,
      providerResponse,
    },
  });

  return {
    payment,
    paymentUrl,
    providerResponse,
  };
};

/**
 * Confirm payment
 */
export const confirmPaymentService = async (data: ConfirmPaymentData) => {
  const { paymentId, providerResponse } = data;

  // Get payment record
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      order: true,
    },
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  if (payment.status === PaymentStatus.COMPLETED) {
    return payment; // Already completed
  }

  let paymentStatus: PaymentStatus = PaymentStatus.PENDING;
  let verifiedProviderResponse: any = null;

  // Verify with Stripe
  const storedResponse = payment.providerResponse as any;
  const intentId = providerResponse?.intentId || storedResponse?.intentId;
  if (!intentId) {
    throw new Error('Stripe intent ID not found');
  }

  const stripeIntent = await getStripePaymentIntent(intentId);

  if (stripeIntent.status === 'succeeded') {
    paymentStatus = PaymentStatus.COMPLETED;
  } else if (stripeIntent.status === 'requires_payment_method' || stripeIntent.status === 'canceled') {
    paymentStatus = PaymentStatus.FAILED;
  }

  verifiedProviderResponse = {
    intentId: stripeIntent.id,
    status: stripeIntent.status,
    amount: stripeIntent.amount,
    currency: stripeIntent.currency,
  };

  // Update payment record
  const updatedPayment = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: paymentStatus,
      providerResponse: verifiedProviderResponse || providerResponse,
      ...(paymentStatus === PaymentStatus.COMPLETED && { paidAt: new Date() }),
    },
  });

  // Update order status if payment completed
  if (paymentStatus === PaymentStatus.COMPLETED && payment.order.status === 'CONFIRMED') {
    await prisma.rentalOrder.update({
      where: { id: payment.orderId },
      data: { status: 'PAID' },
    });
  }

  return updatedPayment;
};

/**
 * Get user's payment history
 */
export const getUserPaymentsService = async (userId: string, filters: any) => {
  const { status, method, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = filters;

  const skip = (page - 1) * limit;

  const where: any = { userId };

  if (status) {
    where.status = status;
  }

  if (method) {
    where.method = method;
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      include: {
        order: {
          select: {
            orderNumber: true,
            status: true,
            totalAmount: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    payments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get payment by ID
 */
export const getPaymentByIdService = async (paymentId: string, userId: string, userRole: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      order: {
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
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
    },
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  // Check access permissions
  const isUser = payment.userId === userId;
  const isAdmin = userRole === 'ADMIN';

  if (!isUser && !isAdmin) {
    throw new Error('You do not have permission to view this payment');
  }

  return payment;
};