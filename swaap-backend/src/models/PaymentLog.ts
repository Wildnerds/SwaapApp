import { Schema, model, models, Document, Types } from 'mongoose';

export interface IPaymentLog extends Document {
  user: Types.ObjectId;
  amount: number;
  reference: string;
  status: 'pending' | 'success' | 'failed'; // ✅ ADDED: 'pending' status
  gatewayResponse?: string; // ✅ UPDATED: Made optional since pending payments don't have response yet
  paidAt?: Date; // ✅ UPDATED: Made optional since pending payments aren't paid yet
  
  // ✅ Enhanced payment tracking
  type: 'wallet_topup' | 'pro_upgrade' | 'order_payment' | 'hybrid_payment' | 'cart_payment' | 'cart_hybrid_payment' | 'service_fee' | 'shipping_fee';
  method: 'paystack' | 'virtual_account' | 'wallet';
  order?: Types.ObjectId; // Link to order if applicable
  serviceFeeAmount?: number; // Track verification service fees
  shippingFeeAmount?: number; // Track shipping costs
  
  createdAt: Date;
  updatedAt: Date;
}

const paymentLogSchema = new Schema<IPaymentLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    reference: { type: String, required: true, unique: true },
    status: { 
      type: String, 
      enum: ['pending', 'success', 'failed'], // ✅ ADDED: 'pending' to enum
      required: true 
    },
    gatewayResponse: { 
      type: String,
      required: false // ✅ UPDATED: Optional for pending payments
    },
    paidAt: { 
      type: Date,
      required: false // ✅ UPDATED: Optional since pending payments have no paidAt
    },
    
    // ✅ Payment categorization
    type: { 
      type: String, 
      enum: [
        'wallet_topup', 
        'pro_upgrade', 
        'order_payment', 
        'hybrid_payment', 
        'cart_payment', 
        'cart_hybrid_payment', 
        'service_fee', 
        'shipping_fee'
      ],
      default: 'wallet_topup'
    },
    
    // ✅ Payment method tracking
    method: { 
      type: String, 
      enum: ['paystack', 'virtual_account', 'wallet'],
      required: true 
    },
    
    // ✅ Link to order
    order: { 
      type: Schema.Types.ObjectId, 
      ref: 'Order',
      sparse: true 
    },
    
    // ✅ Fee breakdown
    serviceFeeAmount: { type: Number, default: 0 },
    shippingFeeAmount: { type: Number, default: 0 }
  },
  { 
    timestamps: true 
  }
);

// ✅ Add validation: paidAt required only for successful payments
paymentLogSchema.pre('save', function(next) {
  if (this.status === 'success' && !this.paidAt) {
    this.paidAt = new Date();
  }
  next();
});

// ✅ Add indexes for better performance
paymentLogSchema.index({ order: 1 });
paymentLogSchema.index({ type: 1, status: 1 });
paymentLogSchema.index({ user: 1, createdAt: -1 });
paymentLogSchema.index({ reference: 1 });
paymentLogSchema.index({ method: 1, status: 1 });

const PaymentLog = models.PaymentLog || model<IPaymentLog>('PaymentLog', paymentLogSchema);
export default PaymentLog;