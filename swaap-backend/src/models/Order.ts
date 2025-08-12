// models/Order.ts - UPDATED with Complete Shipping Integration
import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
  user: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  quantity: number;
  totalAmount: number;
  paymentMethod: 'wallet' | 'paystack' | 'hybrid';
  walletPaid: number;
  paystackPaid: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'completed' | 'failed' | 'cancelled';
  reference?: string;
  paidAt?: Date;
  
  // Buyer and seller info
  buyer: mongoose.Types.ObjectId;
  seller: mongoose.Types.ObjectId;
  
  // ✅ ENHANCED: Shipping fields with better integration
  shippingMethod: 'shipbubble' | 'self-arranged';
  shippingStatus: 'pending_pickup' | 'confirmed' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'delivery_failed' | 'cancelled' | 'returned' | 'self_pickup';
  shipbubbleOrderId?: string;
  trackingCode?: string;
  trackingUrl?: string;
  courierName?: string;
  courierPhone?: string;
  shippingFee: number;
  
  // ✅ ENHANCED: Detailed shipping information
  shippingDetails?: {
    carrier?: string;
    service?: string;
    service_code?: string;
    courier_id?: string;
    fee: number;
    delivery_time?: string;
    pickup_time?: string;
    insurance_option: 'none' | 'basic' | 'premium';
    insurance_fee: number;
    insurance_coverage: number;
    total_shipping_cost: number;
    special_instructions?: string;
    tracking_level?: number;
    features?: string[];
    carrier_rating?: number;
    delivery_rating?: number;
    feedback?: string;
  };
  
  // ✅ ENHANCED: Courier contact information
  courierContact?: {
    name?: string;
    phone?: string;
    email?: string;
    company?: string;
  };
  
  // ✅ NEW: Package details for shipping
  packageDetails?: {
    weight: number;
    value: number;
    length: number;
    width: number;
    height: number;
    description?: string;
    fragile: boolean;
    perishable: boolean;
  };
  
  // ✅ NEW: Enhanced shipping timeline
  shippingTimeline?: {
    order_confirmed?: Date;
    pickup_scheduled?: Date;
    picked_up?: Date;
    in_transit?: Date;
    out_for_delivery?: Date;
    delivered?: Date;
    delivery_failed?: Date;
  };
  
  // Three-tier verification and escrow fields
  verificationLevel: 'self-arranged' | 'basic' | 'premium';
  serviceFee: number;
  escrowReleased: boolean;
  buyerConfirmedReceipt: boolean;
  inspectionPeriodEnd?: Date;
  
  // ✅ NEW: Quality confirmation fields
  qualityRating?: number; // 1-5 star rating
  qualityNotes?: string;  // Optional notes from buyer
  
  // ✅ ENHANCED: Timestamp fields
  lastShippingUpdate?: Date;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  deliveredAt?: Date;
  completedAt?: Date;
  deliveryAttempts?: number;
  
  // ✅ ENHANCED: Shipping addresses with snapshot functionality
  shipFromAddress?: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    state: string;
    landmark?: string;
  };
  shipToAddress?: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    state: string;
    landmark?: string;
    original_address_id?: mongoose.Types.ObjectId;
  };
  
  // ✅ NEW: Delivery confirmation
  deliveryConfirmation?: {
    signature_required: boolean;
    signature_image?: string;
    delivery_photo?: string;
    received_by?: string;
    delivery_notes?: string;
  };
  
  // ✅ NEW: Return/refund related to shipping
  returnShipping?: {
    return_requested: boolean;
    return_reason?: string;
    return_tracking_code?: string;
    return_carrier?: string;
    return_cost: number;
    return_status: 'not_requested' | 'requested' | 'approved' | 'in_transit' | 'received' | 'rejected';
  };
  
  // Self-arranged delivery details
  selfArrangedDetails?: {
    meetupLocation?: string;
    meetupTime?: Date;
    deliveryInstructions?: string;
    contactMethod?: 'phone' | 'chat' | 'both';
  };
  
  // Enhanced fields
  totalWeight?: number;
  items?: any[]; // For multi-item orders in future
  
  createdAt: Date;
  updatedAt: Date;
  
  // ✅ NEW: Methods
  updateShippingStatus(newStatus: string, additionalData?: any): Promise<IOrder>;
  getShippingProgress(): number;
  isTrackable(): boolean;
  getEstimatedDelivery(): Date;
  isDeliveryOverdue(): boolean;
  getShippingSummary(): any;
}

const orderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: 1 },
    totalAmount: { type: Number, required: true },

    paymentMethod: {
      type: String,
      enum: ['wallet', 'paystack', 'hybrid'],
      required: true,
    },

    walletPaid: { type: Number, default: 0 },
    paystackPaid: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['pending', 'paid', 'shipped', 'delivered', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },

    reference: { type: String },
    paidAt: { type: Date },
    
    // Buyer and seller references
    buyer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    
    // ✅ ENHANCED: Shipping method
    shippingMethod: { 
      type: String, 
      enum: ['shipbubble', 'self-arranged'], 
      default: 'self-arranged' 
    },
    
    // ✅ ENHANCED: More comprehensive shipping status tracking
    shippingStatus: { 
      type: String, 
      enum: [
        'pending_pickup',
        'confirmed', 
        'picked_up',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'delivery_failed',
        'cancelled',
        'returned',
        'self_pickup'
      ], 
      default: 'pending_pickup',
      index: true
    },
    
    // ShipBubble integration fields
    shipbubbleOrderId: { 
      type: String, 
      sparse: true, 
      index: true 
    },
    trackingCode: { 
      type: String,
      sparse: true, 
      index: true 
    },
    trackingUrl: { type: String },
    courierName: { type: String },
    courierPhone: { type: String },
    shippingFee: { type: Number, default: 0 },
    
    // ✅ NEW: Enhanced shipping details
    shippingDetails: {
      carrier: { type: String, trim: true },
      service: { type: String, trim: true },
      service_code: { type: String, trim: true },
      courier_id: { type: String, trim: true },
      fee: { type: Number, default: 0 },
      delivery_time: { type: String, trim: true },
      pickup_time: { type: String, trim: true },
      insurance_option: { 
        type: String, 
        enum: ['none', 'basic', 'premium'], 
        default: 'none' 
      },
      insurance_fee: { type: Number, default: 0 },
      insurance_coverage: { type: Number, default: 0 },
      total_shipping_cost: { type: Number, default: 0 },
      special_instructions: { type: String, trim: true },
      tracking_level: { type: Number, min: 1, max: 5, default: 3 },
      features: [{ type: String }],
      carrier_rating: { type: Number, min: 1, max: 5 },
      delivery_rating: { type: Number, min: 1, max: 5 },
      feedback: { type: String, trim: true }
    },
    
    // ✅ NEW: Enhanced courier contact information
    courierContact: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true },
      company: { type: String, trim: true }
    },
    
    // ✅ NEW: Package details
    packageDetails: {
      weight: { type: Number, default: 1.0 },
      value: { type: Number, required: true },
      length: { type: Number, default: 30 },
      width: { type: Number, default: 20 },
      height: { type: Number, default: 15 },
      description: { type: String, trim: true },
      fragile: { type: Boolean, default: false },
      perishable: { type: Boolean, default: false }
    },
    
    // ✅ NEW: Enhanced shipping timeline
    shippingTimeline: {
      order_confirmed: { type: Date },
      pickup_scheduled: { type: Date },
      picked_up: { type: Date },
      in_transit: { type: Date },
      out_for_delivery: { type: Date },
      delivered: { type: Date },
      delivery_failed: { type: Date }
    },
    
    // Three-tier service level and escrow
    verificationLevel: { 
      type: String, 
      enum: ['self-arranged', 'basic', 'premium'], 
      default: 'self-arranged' 
    },
    serviceFee: { type: Number, default: 0 },
    escrowReleased: { type: Boolean, default: false },
    buyerConfirmedReceipt: { type: Boolean, default: false },
    inspectionPeriodEnd: { type: Date },
    
    // ✅ NEW: Quality confirmation fields
    qualityRating: { type: Number, min: 1, max: 5 },
    qualityNotes: { type: String, maxlength: 500 },
    
    // ✅ ENHANCED: Timestamp fields
    lastShippingUpdate: { type: Date, default: Date.now },
    estimatedDeliveryDate: { type: Date },
    actualDeliveryDate: { type: Date },
    deliveredAt: { type: Date },
    completedAt: { type: Date },
    deliveryAttempts: { type: Number, default: 0 },
    
    // ✅ ENHANCED: Shipping addresses with additional fields
    shipFromAddress: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true },
      address: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      landmark: { type: String, trim: true }
    },
    shipToAddress: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true },
      address: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      landmark: { type: String, trim: true },
      original_address_id: { type: Schema.Types.ObjectId }
    },
    
    // ✅ NEW: Delivery confirmation
    deliveryConfirmation: {
      signature_required: { type: Boolean, default: false },
      signature_image: { type: String },
      delivery_photo: { type: String },
      received_by: { type: String, trim: true },
      delivery_notes: { type: String, trim: true }
    },
    
    // ✅ NEW: Return/refund related to shipping
    returnShipping: {
      return_requested: { type: Boolean, default: false },
      return_reason: { type: String, trim: true },
      return_tracking_code: { type: String, trim: true },
      return_carrier: { type: String, trim: true },
      return_cost: { type: Number, default: 0 },
      return_status: {
        type: String,
        enum: ['not_requested', 'requested', 'approved', 'in_transit', 'received', 'rejected'],
        default: 'not_requested'
      }
    },
    
    // Self-arranged delivery details
    selfArrangedDetails: {
      meetupLocation: { type: String },
      meetupTime: { type: Date },
      deliveryInstructions: { type: String },
      contactMethod: { 
        type: String, 
        enum: ['phone', 'chat', 'both'],
        default: 'chat'
      }
    },
    
    // ✅ NEW: Enhanced fields for shipping integration
    totalWeight: { type: Number, default: 1.0 },
    items: [{ type: Schema.Types.Mixed }] // For future multi-item orders
  },
  {
    timestamps: true,
  }
);

// ✅ ENHANCED: Comprehensive indexes for better performance
orderSchema.index({ shipbubbleOrderId: 1 });
orderSchema.index({ buyer: 1, status: 1 });
orderSchema.index({ seller: 1, status: 1 });
orderSchema.index({ trackingCode: 1 });
orderSchema.index({ reference: 1 });
orderSchema.index({ verificationLevel: 1, status: 1 });
orderSchema.index({ buyerConfirmedReceipt: 1 });
orderSchema.index({ inspectionPeriodEnd: 1 });

// ✅ NEW: Additional indexes for shipping
orderSchema.index({ shippingStatus: 1 });
orderSchema.index({ 'shipToAddress.city': 1, 'shipToAddress.state': 1 });
orderSchema.index({ estimatedDeliveryDate: 1 });
orderSchema.index({ lastShippingUpdate: -1 });
orderSchema.index({ 'shippingDetails.carrier': 1 });

// Compound indexes for efficient queries
orderSchema.index({ buyer: 1, shippingStatus: 1 });
orderSchema.index({ seller: 1, shippingStatus: 1 });
orderSchema.index({ createdAt: -1, shippingStatus: 1 });

// ✅ ENHANCED: Pre-save middleware
orderSchema.pre<IOrder>('save', function(next) {
  // Set inspection period for premium verification (48 hours after delivery)
  if (this.verificationLevel === 'premium' && 
      this.deliveredAt && 
      !this.inspectionPeriodEnd) {
    
    const inspectionEnd = new Date(this.deliveredAt);
    inspectionEnd.setHours(inspectionEnd.getHours() + 48);
    this.inspectionPeriodEnd = inspectionEnd;
  }
  
  // ✅ NEW: Set package details from order data
  if (!this.packageDetails && this.totalAmount) {
    this.packageDetails = {
      weight: this.totalWeight || 1.0,
      value: this.totalAmount,
      length: 30,
      width: 20,
      height: 15,
      description: 'Marketplace item',
      fragile: false,
      perishable: false
    };
  }
  
  // ✅ NEW: Sync legacy courier fields with new structure
  if (this.shippingDetails?.carrier && !this.courierName) {
    this.courierName = this.shippingDetails.carrier;
  }
  
  if (this.courierContact?.phone && !this.courierPhone) {
    this.courierPhone = this.courierContact.phone;
  }
  
  next();
});

// ✅ NEW: Instance Methods for shipping integration

// Update shipping status with automatic timeline tracking
orderSchema.methods.updateShippingStatus = function(newStatus: string, additionalData?: any) {
  const oldStatus = this.shippingStatus;
  this.shippingStatus = newStatus;
  this.lastShippingUpdate = new Date();
  
  // Update timeline
  if (!this.shippingTimeline) {
    this.shippingTimeline = {};
  }
  
  switch (newStatus) {
    case 'confirmed':
      this.shippingTimeline.order_confirmed = new Date();
      break;
    case 'picked_up':
      this.shippingTimeline.picked_up = new Date();
      break;
    case 'in_transit':
      this.shippingTimeline.in_transit = new Date();
      break;
    case 'out_for_delivery':
      this.shippingTimeline.out_for_delivery = new Date();
      break;
    case 'delivered':
      this.shippingTimeline.delivered = new Date();
      this.deliveredAt = new Date();
      this.actualDeliveryDate = new Date();
      break;
    case 'delivery_failed':
      this.shippingTimeline.delivery_failed = new Date();
      this.deliveryAttempts = (this.deliveryAttempts || 0) + 1;
      break;
  }
  
  // Add any additional data
  if (additionalData) {
    Object.assign(this, additionalData);
  }
  
  console.log('📦 Order shipping status updated:', {
    orderId: this._id,
    oldStatus,
    newStatus,
    timeline: this.shippingTimeline
  });
  
  return this.save();
};

// Get shipping progress percentage
orderSchema.methods.getShippingProgress = function() {
  const statusProgress: { [key: string]: number } = {
    'pending_pickup': 10,
    'confirmed': 20,
    'picked_up': 40,
    'in_transit': 60,
    'out_for_delivery': 80,
    'delivered': 100,
    'delivery_failed': 0,
    'cancelled': 0,
    'returned': 0,
    'self_pickup': 50
  };
  
  return statusProgress[this.shippingStatus] || 0;
};

// Check if order is trackable
orderSchema.methods.isTrackable = function() {
  return !!(this.trackingCode || this.shipbubbleOrderId);
};

// Get estimated delivery date
orderSchema.methods.getEstimatedDelivery = function() {
  if (this.estimatedDeliveryDate) {
    return this.estimatedDeliveryDate;
  }
  
  // Calculate based on delivery time from shipping details
  if (this.shippingDetails?.delivery_time) {
    const deliveryTime = this.shippingDetails.delivery_time.toLowerCase();
    let daysToAdd = 2; // default
    
    if (deliveryTime.includes('same day')) daysToAdd = 0;
    else if (deliveryTime.includes('1 day')) daysToAdd = 1;
    else if (deliveryTime.includes('2 day')) daysToAdd = 2;
    else if (deliveryTime.includes('3 day')) daysToAdd = 3;
    else if (deliveryTime.includes('week')) daysToAdd = 7;
    
    const estimatedDate = new Date(this.createdAt);
    estimatedDate.setDate(estimatedDate.getDate() + daysToAdd);
    this.estimatedDeliveryDate = estimatedDate;
    return estimatedDate;
  }
  
  // Default to 2 days from creation
  const defaultDate = new Date(this.createdAt);
  defaultDate.setDate(defaultDate.getDate() + 2);
  return defaultDate;
};

// Check if delivery is overdue
orderSchema.methods.isDeliveryOverdue = function() {
  const estimated = this.getEstimatedDelivery();
  const now = new Date();
  
  return (
    !this.deliveredAt && 
    this.shippingStatus !== 'delivered' && 
    this.shippingStatus !== 'cancelled' &&
    this.shippingStatus !== 'self_pickup' &&
    now > estimated
  );
};

// Get shipping summary for display
orderSchema.methods.getShippingSummary = function() {
  return {
    status: this.shippingStatus,
    carrier: this.shippingDetails?.carrier || this.courierName,
    service: this.shippingDetails?.service,
    tracking_code: this.trackingCode,
    tracking_url: this.trackingUrl,
    estimated_delivery: this.getEstimatedDelivery(),
    actual_delivery: this.actualDeliveryDate,
    progress_percentage: this.getShippingProgress(),
    is_trackable: this.isTrackable(),
    is_overdue: this.isDeliveryOverdue(),
    total_cost: this.shippingDetails?.total_shipping_cost || this.shippingFee,
    insurance_coverage: this.shippingDetails?.insurance_coverage || 0,
    delivery_attempts: this.deliveryAttempts || 0,
    courier_contact: this.courierContact,
    verification_level: this.verificationLevel
  };
};

export default mongoose.model<IOrder>('Order', orderSchema);