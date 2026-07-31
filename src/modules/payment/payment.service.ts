import { PaymentMethod, PaymentStatus } from '../../../generated/prisma/enums';
import { prisma } from '../../config/database';
import { createStripeCheckoutSession, createStripePaymentIntent, getStripePaymentIntent } from '../../config/stripe.config';
import { CreatePaymentData, ConfirmPaymentData } from './payment.interface';
import { updateGearStockForOrder } from '../../utils/availability.util';

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

  // Check if order is in correct status for payment
  // Allow payment for PLACED orders to enable better UX (customer pays immediately)
  if (order.status !== 'PLACED' && order.status !== 'CONFIRMED') {
    throw new Error('Payment can only be created for placed or confirmed orders');
  }

  const totalAmount = Number(order.totalAmount);

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
    if (existingPayment.status === 'COMPLETED') {
      throw new Error('Payment has already been completed for this order');
    }

    // Generate fresh Stripe Checkout session with customerEmail and customerName
    const session = await createStripeCheckoutSession(
      totalAmount,
      currency.toLowerCase(),
      {
        orderNumber: order.orderNumber,
        customerEmail: (data as any).customerEmail || order.customer?.email,
        customerName: (data as any).customerName || order.customer?.name,
        successUrl,
        cancelUrl,

        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerId: order.customerId,
          customerEmail: order.customer.email,
          paymentId: existingPayment.id,
        },
      }
    );

    const providerResponse = {
      sessionId: session.id,
      sessionUrl: session.url,
      intentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      amount: session.amount_total,
      currency: session.currency,
      status: session.payment_status,
    };

    await prisma.payment.update({
      where: { id: existingPayment.id },
      data: { providerResponse },
    });

    return {
      payment: existingPayment,
      sessionId: session.id,
      paymentUrl: session.url,
      providerResponse,
    };
  }

  const transactionId = generateTransactionId();

  // Set payment expiration (30 minutes from now)

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 30);

  // Wrap PLACED -> CONFIRMED transition, stock adjustment, and payment creation in a database transaction
  const payment = await prisma.$transaction(async (tx) => {
    // Auto-transition PLACED orders to CONFIRMED when payment is initiated
    if (order.status === 'PLACED') {
      await tx.rentalOrder.update({
        where: { id: orderId },
        data: { status: 'CONFIRMED' },
      });

      // Call stock adjustment (decrements stock since PLACED -> CONFIRMED)
      await updateGearStockForOrder(orderId, 'CONFIRMED', 'PLACED', tx);
    }

    // Create payment record
    return tx.payment.create({
      data: {
        transactionId,
        orderId,
        userId,
        amount: order.totalAmount,
        method,
        status: PaymentStatus.PENDING,
        providerResponse: {}, // Temporarily empty
        expiresAt,
      },
    });
  });

  let providerResponse: any = null;
  let paymentUrl: string | null = null;

  // Create Stripe Checkout Session
  const session = await createStripeCheckoutSession(
    totalAmount,
    currency.toLowerCase(),
    {
      orderNumber: order.orderNumber,
      customerEmail: order.customer?.email,
      customerName: order.customer?.name,
      successUrl,

      cancelUrl,

      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerEmail: order.customer.email,
        paymentId: payment.id,
      },
    }
  );

  providerResponse = {
    sessionId: session.id,
    sessionUrl: session.url,
    intentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
    amount: session.amount_total,
    currency: session.currency,
    status: session.payment_status,
  };

  paymentUrl = session.url;

  // Update the payment record with Stripe Checkout Session details
  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      providerResponse,
    },
  });

  return {
    payment: updatedPayment,
    sessionId: session.id,
    paymentUrl,
    providerResponse,
  };
};

/**
 * Confirm payment
 */
export const confirmPaymentService = async (data: ConfirmPaymentData) => {
  const { paymentId, providerResponse, mockSuccess } = data;

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

  // Verify with Stripe or Mock if in dev/test environment
  const storedResponse = payment.providerResponse as any;
  const intentId = providerResponse?.intentId || storedResponse?.intentId;

  if (process.env.NODE_ENV !== 'production' && mockSuccess) {
    paymentStatus = PaymentStatus.COMPLETED;
    verifiedProviderResponse = {
      intentId: intentId || 'mock_intent_id',
      status: 'succeeded',
      amount: Number(payment.amount) * 100,
      currency: 'usd',
    };
  } else {
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
  }

  // Update database in a transaction
  const updatedPayment = await prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: paymentStatus,
        providerResponse: verifiedProviderResponse || providerResponse,
        ...(paymentStatus === PaymentStatus.COMPLETED && { paidAt: new Date() }),
      },
    });

    // Update order status if payment completed
    if (paymentStatus === PaymentStatus.COMPLETED && (payment.order.status === 'CONFIRMED' || payment.order.status === 'PLACED')) {
      await tx.rentalOrder.update({
        where: { id: payment.orderId },
        data: { status: 'PAID' },
      });
    }

    return updated;
  });

  return updatedPayment;
};

/**
 * Verify Stripe Checkout Session and mark payment & order as PAID
 */
export const verifySessionService = async (
  sessionId: string,
  orderId?: string
): Promise<{ paid: boolean; session?: any }> => {

  const { getStripeClient } = await import('../../config/stripe.config');
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== 'paid') {
    return { paid: false, session };
  }

  // Find payment associated with order or session
  const targetOrderId = orderId || (session.metadata?.orderId as string);

  let payment = null;
  if (targetOrderId) {
    payment = await prisma.payment.findFirst({
      where: { orderId: targetOrderId },
      include: { order: true },
    });
  }

  if (!payment && session.metadata?.paymentId) {
    payment = await prisma.payment.findUnique({
      where: { id: session.metadata.paymentId },
      include: { order: true },
    });
  }

  if (payment) {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.COMPLETED,
          paidAt: new Date(),
          providerResponse: {
            ...(payment.providerResponse as object || {}),
            sessionId: session.id,
            paymentStatus: session.payment_status,
            amount: session.amount_total,
            currency: session.currency,
          },
        },
      });

      await tx.rentalOrder.update({
        where: { id: payment.orderId },
        data: { status: 'PAID' },
      });

      // Cleanup any other leftover PENDING payment attempts for this order
      await tx.payment.updateMany({
        where: {
          orderId: payment.orderId,
          id: { not: payment.id },
          status: PaymentStatus.PENDING,
        },
        data: {
          status: PaymentStatus.FAILED,
        },
      });
    });
  } else if (targetOrderId) {
    await prisma.rentalOrder.update({
      where: { id: targetOrderId },
      data: { status: 'PAID' },
    });
  }

  return { paid: true, session };
};


/**
 * Get user's payment history
 */
export const getUserPaymentsService = async (userId: string, filters: any) => {
  const { status, method, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = filters;

  // Auto-sync any PENDING payments whose order status is already PAID, PICKED_UP, or RETURNED
  await prisma.payment.updateMany({
    where: {
      userId,
      status: PaymentStatus.PENDING,
      order: {
        status: {
          in: ['PAID', 'PICKED_UP', 'RETURNED'],
        },
      },
    },
    data: {
      status: PaymentStatus.COMPLETED,
      paidAt: new Date(),
    },
  });

  // Auto-expire old pending payments older than their expiration date
  await prisma.payment.updateMany({
    where: {
      userId,
      status: PaymentStatus.PENDING,
      expiresAt: {
        lt: new Date(),
      },
      order: {
        status: {
          notIn: ['PAID', 'PICKED_UP', 'RETURNED'],
        },
      },
    },
    data: {
      status: PaymentStatus.FAILED,
    },
  });

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
 * Handle Stripe webhook events
 */
export const handleStripeWebhookService = async (event: any) => {
  const eventType = event.type;
  const stripeObject = event.data.object;

  let paymentId: string | null = null;

  // Extract payment ID from metadata
  if (stripeObject.metadata && stripeObject.metadata.paymentId) {
    paymentId = stripeObject.metadata.paymentId;
  }

  switch (eventType) {
    case 'checkout.session.completed':
    case 'payment_intent.succeeded':
      let payment = null;
      if (paymentId) {
        payment = await prisma.payment.findUnique({
          where: { id: paymentId },
          include: { order: true },
        });
      }

      if (!payment) {
        payment = await prisma.payment.findFirst({
          where: {
            OR: [
              {
                providerResponse: {
                  path: ['sessionId'],
                  equals: stripeObject.id,
                },
              },
              {
                providerResponse: {
                  path: ['intentId'],
                  equals: stripeObject.id,
                },
              },
            ],
          },
          include: {
            order: true,
          },
        });
      }

      if (!payment) {
        throw new Error('Payment not found for webhook');
      }

      if (payment.status !== PaymentStatus.COMPLETED) {
        // Update payment and order status in a transaction
        await prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.COMPLETED,
              paidAt: new Date(),
              providerResponse: {
                ...(payment.providerResponse as object || {}),
                eventId: event.id,
                status: stripeObject.payment_status || stripeObject.status,
                amount: stripeObject.amount_total || stripeObject.amount,
                currency: stripeObject.currency,
              },
            },
          });

          // Update order status if needed
          if (payment.order.status === 'CONFIRMED') {
            await tx.rentalOrder.update({
              where: { id: payment.orderId },
              data: { status: 'PAID' },
            });
          }
        });
      }

      return {
        success: true,
        message: 'Payment succeeded',
        paymentId: payment.id,
      };

    case 'payment_intent.payment_failed':
      // Find payment by metadata ID or fallback to intent ID
      let failedPayment = null;
      if (paymentId) {
        failedPayment = await prisma.payment.findUnique({
          where: { id: paymentId },
        });
      }

      if (!failedPayment) {
        failedPayment = await prisma.payment.findFirst({
          where: {
            providerResponse: {
              path: ['intentId'],
              equals: stripeObject.id,
            },
          },
        });
      }

      if (!failedPayment) {
        throw new Error('Payment not found for webhook');
      }

      // Update payment to failed
      await prisma.payment.update({
        where: { id: failedPayment.id },
        data: {
          status: PaymentStatus.FAILED,
          providerResponse: {
            intentId: stripeObject.id,
            status: stripeObject.status,
            last_payment_error: stripeObject.last_payment_error,
          },
        },
      });

      return {
        success: false,
        message: 'Payment failed',
        paymentId: failedPayment.id,
      };

    case 'payment_intent.canceled':
      // Find payment by metadata ID or fallback to intent ID
      let canceledPayment = null;
      if (paymentId) {
        canceledPayment = await prisma.payment.findUnique({
          where: { id: paymentId },
        });
      }

      if (!canceledPayment) {
        canceledPayment = await prisma.payment.findFirst({
          where: {
            providerResponse: {
              path: ['intentId'],
              equals: stripeObject.id,
            },
          },
        });
      }

      if (!canceledPayment) {
        throw new Error('Payment not found for webhook');
      }

      // Update payment to failed
      await prisma.payment.update({
        where: { id: canceledPayment.id },
        data: {
          status: PaymentStatus.FAILED,
          providerResponse: {
            intentId: stripeObject.id,
            status: stripeObject.status,
            cancel_reason: stripeObject.cancellation_reason,
          },
        },
      });

      return {
        success: false,
        message: 'Payment canceled',
        paymentId: canceledPayment.id,
      };

    default:
      return {
        success: true,
        message: 'Event received but not processed',
        eventType,
      };
  }
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

/**
 * Clean up expired payments
 * This should be run periodically (e.g., every hour) to clean up expired pending payments
 */
export const cleanupExpiredPaymentsService = async () => {
  const now = new Date();

  // Find expired pending payments
  const expiredPayments = await prisma.payment.findMany({
    where: {
      status: PaymentStatus.PENDING,
      expiresAt: {
        lt: now,
      },
    },
    include: {
      order: true,
    },
  });

  if (expiredPayments.length === 0) {
    return {
      cleaned: 0,
      message: 'No expired payments found',
    };
  }

  // Update expired payments to failed
  const updatePromises = expiredPayments.map((payment) =>
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        providerResponse: {
          ...(payment.providerResponse as any || {}),
          expirationReason: 'Payment expired',
        },
      },
    })
  );

  await Promise.all(updatePromises);

  // Cancel orders that were CONFIRMED but payment expired
  const ordersToCancel = expiredPayments
    .filter((p) => p.order.status === 'CONFIRMED')
    .map((p) => p.orderId);

  if (ordersToCancel.length > 0) {
    for (const orderId of ordersToCancel) {
      try {
        await prisma.$transaction(async (tx) => {
          const ord = await tx.rentalOrder.findUnique({
            where: { id: orderId },
          });
          if (ord && ord.status === 'CONFIRMED') {
            await tx.rentalOrder.update({
              where: { id: orderId },
              data: {
                status: 'CANCELLED',
              },
            });
            // Restore stock correctly using transaction client
            await updateGearStockForOrder(orderId, 'CANCELLED', 'CONFIRMED', tx);
          }
        });
      } catch (err) {
        console.error(`Failed to cancel and restore stock for order ${orderId}:`, err);
      }
    }
  }

  return {
    cleaned: expiredPayments.length,
    ordersCancelled: ordersToCancel.length,
    message: `Cleaned up ${expiredPayments.length} expired payments and cancelled ${ordersToCancel.length} orders`,
  };
};