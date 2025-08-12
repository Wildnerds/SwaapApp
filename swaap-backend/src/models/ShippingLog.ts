import mongoose from 'mongoose';

const shippingLogSchema = new mongoose.Schema({
  order: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order', 
    required: true 
  },
  shipbubbleOrderId: { 
    type: String, 
    required: true,
    index: true 
  },
  status: { 
    type: String, 
    required: true,
    enum: ['pending', 'picked_up', 'in_transit', 'delivered', 'failed', 'cancelled', 'returned']
  },
  trackingCode: String,
  courierName: String,
  courierPhone: String,
  trackingUrl: String,
  shippingFee: Number, // in naira (not kobo)
  events: [{
    status: String,
    datetime: String,
    location: String,
    notes: String
  }],
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  notes: String,
  rawData: mongoose.Schema.Types.Mixed // Store full webhook data for debugging
}, {
  timestamps: true
});

// Index for faster queries
shippingLogSchema.index({ shipbubbleOrderId: 1 });
shippingLogSchema.index({ order: 1, timestamp: -1 });

export default mongoose.model('ShippingLog', shippingLogSchema);