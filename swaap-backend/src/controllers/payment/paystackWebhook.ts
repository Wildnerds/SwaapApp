// src/controllers/payment/paystackWebhook.ts

import { Request, Response } from 'express';
import crypto from 'crypto';
import Product from '../../models/Product';
import User from '../../models/User';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || '';

export const paystackWebhook = async (req: Request, res: Response) => {
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(401).send('Invalid signature');
  }

  const event = req.body;

  if (event.event === 'charge.success') {
    const { reference, metadata, customer } = event.data;

    const productId = metadata?.productId;
    const buyerId = metadata?.buyerId;

    if (!productId || !buyerId) {
      return res.status(400).json({ error: 'Missing metadata for escrow' });
    }

    try {
      // Mark the product as in escrow
      const updated = await Product.findByIdAndUpdate(
        productId,
        {
          isInEscrow: true,
          paymentReference: reference,
          buyer: buyerId,
          paidAt: new Date(),
        },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ error: 'Product not found' });
      }

      return res.status(200).json({ message: 'Escrow initiated', product: updated });
    } catch (err) {
      console.error('Webhook error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.sendStatus(200); // Acknowledge receipt
};
