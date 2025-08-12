import { fetchPaystackKey } from "./fetchPaystackKey";

export interface PaystackPaymentOptions {
  email: string;
  amount: number; // In Naira
  reference: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const payWithPaystack = async ({
  email,
  amount,
  reference,
  onSuccess,
  onCancel,
}: PaystackPaymentOptions) => {
  const amountInKobo = amount * 100;

  const paystackKey = await fetchPaystackKey();

  return {
    paystackKey,
    amount: amountInKobo,
    billingEmail: email,
    reference,
    onSuccess,
    onCancel,
  };
};
