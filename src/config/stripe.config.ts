import Stripe from 'stripe';
import config from './env.config';

let stripeInstance: Stripe | null = null;

/**
 * Get or create Stripe instance
 */
export const getStripeClient = (): Stripe => {
  if (stripeInstance) {
    return stripeInstance;
  }

  if (!config.stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }

  stripeInstance = new Stripe(config.stripeSecretKey, {
    apiVersion: '2026-06-24.dahlia',
    typescript: true,
  });

  return stripeInstance;
};

/**
 * Create Stripe payment intent
 */
export const createStripePaymentIntent = async (
  amount: number,
  currency: string = 'usd',
  metadata?: Record<string, string>
): Promise<Stripe.PaymentIntent> => {
  const stripe = getStripeClient();

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency,
    metadata,
    automatic_payment_methods: {
      enabled: true,
    },
  });

  return paymentIntent;
};

/**
 * Get Stripe payment intent
 */
export const getStripePaymentIntent = async (paymentIntentId: string): Promise<Stripe.PaymentIntent> => {
  const stripe = getStripeClient();

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  return paymentIntent;
};

/**
 * Create Stripe checkout session
 */
export const createStripeCheckoutSession = async (
  amount: number,
  currency: string = 'usd',
  options: {
    orderNumber: string;
    customerEmail?: string;
    customerName?: string;
    successUrl?: string;
    cancelUrl?: string;
    metadata?: Record<string, string>;
  }
): Promise<Stripe.Checkout.Session> => {
  const stripe = getStripeClient();

  const successUrl = options.successUrl || `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = options.cancelUrl || `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/payment/cancel`;

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: `GearUp Rental Order #${options.orderNumber}`,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: options.metadata,
  };

  if (options.customerEmail) {
    sessionParams.customer_email = options.customerEmail;
  }

  return await stripe.checkout.sessions.create(sessionParams);
};