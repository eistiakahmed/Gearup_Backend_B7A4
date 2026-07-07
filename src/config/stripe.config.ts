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