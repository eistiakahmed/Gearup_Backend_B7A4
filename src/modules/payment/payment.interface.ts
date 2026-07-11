import { PaymentMethod } from '../../../generated/prisma/enums';

export interface CreatePaymentData {
  orderId: string;
  method: PaymentMethod;
  currency?: string;
  successUrl?: string;
  cancelUrl?: string;
  failUrl?: string;
}

export interface ConfirmPaymentData {
  paymentId: string;
  providerResponse?: any;
  mockSuccess?: boolean;
}
