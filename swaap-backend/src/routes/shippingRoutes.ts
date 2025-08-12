// routes/shippingRoutes.ts - REFACTORED with User Preferences & Complete ShipBubble Flow
import express from 'express';
import { verifyJwtToken } from '@/middlewares/verifyJwtToken';
import { shippingService } from '@/services/ShippingService';
import User from '@/models/User';
import Order from '@/models/Order';
import axios from 'axios';

const router = express.Router();

// ========================================
// ✅ ENHANCED SHIPPING RATES WITH PREFERENCES
// ========================================

router.post('/rates', verifyJwtToken, async (req, res) => {
  try {
    const { ship_to, item_value, weight, cart_items, preferences } = req.body;

    console.log('📦 Enhanced shipping rates request:', {
      ship_to: ship_to ? `${ship_to.city}, ${ship_to.state}` : 'missing',
      item_value,
      weight,
      cart_items_count: cart_items?.length || 0,
      preferences
    });

    // Validate required fields
    if (!ship_to?.address || !ship_to?.city || !ship_to?.state) {
      return res.status(400).json({
        success: false,
        error: 'Missing required shipping address fields',
        required: ['ship_to.address', 'ship_to.city', 'ship_to.state']
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Calculate package details
    let packageDetails;
    if (cart_items && cart_items.length > 0) {
      packageDetails = shippingService.calculatePackageDetails(cart_items);
    } else {
      packageDetails = {
        weight: weight || 1.0,
        value: item_value || 10000,
        description: 'Marketplace items'
      };
    }

    // Create shipping request
    const shippingRequest = {
      ship_from: {
        address: user?.address?.street || 'Swaap Marketplace, Victoria Island',
        city: user?.address?.city || 'Lagos',
        state: normalizeNigerianState(user?.address?.state) || 'Lagos'
      },
      ship_to: {
        address: ship_to.address.trim(),
        city: ship_to.city.trim(),
        state: normalizeNigerianState(ship_to.state)
      },
      package: {
        weight: packageDetails.weight,
        value: packageDetails.value,
        length: 30,
        width: 20,
        height: 15
      }
    };

    // Get shipping rates
    const startTime = Date.now();
    const allRates = await shippingService.getShippingRates(shippingRequest);
    const endTime = Date.now();

    // ✅ GET USER'S SHIPPING PREFERENCES
    const userPreferences = await getUserShippingPreferences(req.user._id);

    // ✅ CATEGORIZE RATES BY SPEED AND COST
    const categorizedRates = categorizeShippingRates(allRates, packageDetails.value);

    // ✅ APPLY USER PREFERENCES FOR SORTING
    const sortedRates = applyUserPreferences(categorizedRates, preferences || userPreferences, userPreferences.preferred_couriers);

    // ✅ ADD INSURANCE OPTIONS FOR HIGH-VALUE ITEMS
    const insuranceOptions = packageDetails.value > 50000 
      ? shippingService.getInsuranceOptions(packageDetails.value)
      : [];

    const rateSource = allRates.some(r => !r.carrier.includes('Delivery')) ? 'shipbubble_api' : 'estimated';

    console.log(`✅ Enhanced rates calculated: ${allRates.length} total, ${endTime - startTime}ms`);

    res.json({
      success: true,
      
      // ✅ CATEGORIZED RATES FOR EASY SELECTION
      rate_categories: {
        economy: sortedRates.economy.map(rate => enhanceRateWithInsurance(rate, insuranceOptions)),
        standard: sortedRates.standard.map(rate => enhanceRateWithInsurance(rate, insuranceOptions)),
        express: sortedRates.express.map(rate => enhanceRateWithInsurance(rate, insuranceOptions)),
        premium: sortedRates.premium.map(rate => enhanceRateWithInsurance(rate, insuranceOptions))
      },
      
      // ✅ RECOMMENDED RATES BASED ON PREFERENCES
      recommended: {
        fastest: enhanceRateWithInsurance(sortedRates.fastest, insuranceOptions),
        cheapest: enhanceRateWithInsurance(sortedRates.cheapest, insuranceOptions),
        best_value: enhanceRateWithInsurance(sortedRates.bestValue, insuranceOptions),
        user_favorite: sortedRates.userFavorite ? enhanceRateWithInsurance(sortedRates.userFavorite, insuranceOptions) : null
      },
      
      // ✅ ALL RATES FOR FULL SELECTION
      all_rates: allRates.map(rate => enhanceRateWithInsurance({
        ...rate,
        fee: Math.round(rate.fee),
        currency: 'NGN'
      }, insuranceOptions)),

      // ✅ INSURANCE OPTIONS
      insurance_options: insuranceOptions,

      metadata: {
        ship_from: shippingRequest.ship_from,
        ship_to: shippingRequest.ship_to,
        package_details: packageDetails,
        rate_source: rateSource,
        calculation_time: `${endTime - startTime}ms`,
        total_options: allRates.length,
        user_preferences: userPreferences,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Enhanced shipping rates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate shipping rates',
      message: error.message
    });
  }
});

// ========================================
// ✅ USER SHIPPING PREFERENCES MANAGEMENT
// ========================================

router.get('/preferences', verifyJwtToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('shippingPreferences');
    
    const preferences = user?.shippingPreferences || getDefaultPreferences();

    res.json({
      success: true,
      preferences,
      available_options: {
        priorities: [
          { value: 'speed', label: 'Fastest Delivery', description: 'Get items as quickly as possible' },
          { value: 'cost', label: 'Lowest Cost', description: 'Save money on shipping' },
          { value: 'balanced', label: 'Best Balance', description: 'Good value for time and cost' }
        ],
        max_delivery_times: ['Same day', '1 day', '2 days', '3 days', '1 week', 'No preference'],
        insurance_options: [
          { value: 'always', label: 'Always Add Insurance', description: 'Protect all shipments' },
          { value: 'never', label: 'Never Add Insurance', description: 'Skip insurance to save cost' },
          { value: 'auto', label: 'Auto (High Value Items)', description: 'Insurance for items >₦50,000' }
        ]
      }
    });
  } catch (error: any) {
    console.error('❌ Get preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get shipping preferences'
    });
  }
});

router.put('/preferences', verifyJwtToken, async (req, res) => {
  try {
    const { priority, max_delivery_time, preferred_couriers, insurance_preference, notifications, auto_options } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Update shipping preferences
    user.shippingPreferences = {
      ...user.shippingPreferences,
      priority: priority || 'balanced',
      max_delivery_time: max_delivery_time || '2 days',
      preferred_couriers: preferred_couriers || [],
      insurance_preference: insurance_preference || 'auto',
      notifications: {
        pickup: notifications?.pickup !== false,
        in_transit: notifications?.in_transit !== false,
        delivered: notifications?.delivered !== false,
        delays: notifications?.delays !== false,
        ...notifications
      },
      auto_select_cheapest: auto_options?.auto_select_cheapest || false,
      auto_select_fastest: auto_options?.auto_select_fastest || false,
      updated_at: new Date()
    };

    await user.save();

    console.log('✅ Updated shipping preferences for user:', req.user._id);

    res.json({
      success: true,
      message: 'Shipping preferences updated successfully',
      preferences: user.shippingPreferences
    });

  } catch (error: any) {
    console.error('❌ Update preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update shipping preferences'
    });
  }
});

// ========================================
// ✅ COMPLETE SHIPBUBBLE ORDER CREATION WITH INSURANCE
// ========================================

router.post('/create-order', verifyJwtToken, async (req, res) => {
  try {
    const {
      order_id,
      selected_rate,
      shipping_address,
      insurance_option = 'none',
      special_instructions
    } = req.body;

    console.log('📦 Creating complete ShipBubble order:', {
      order_id,
      carrier: selected_rate?.carrier,
      fee: selected_rate?.fee,
      insurance_option
    });

    // Validate required fields
    if (!order_id || !selected_rate || !shipping_address) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['order_id', 'selected_rate', 'shipping_address']
      });
    }

    // Get the order
    const order = await Order.findById(order_id)
      .populate('seller', 'fullName email mobile address')
      .populate('buyer', 'fullName email mobile');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Verify user authorization
    const isAuthorized = order.buyer.toString() === req.user._id || 
                        order.seller.toString() === req.user._id;
    
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to order'
      });
    }

    // ✅ STEP 1: Get rates with request token
    console.log('🔍 Step 1: Getting request token...');
    
    const rateRequest = {
      ship_from: {
        address: order.seller.address?.street || 'Victoria Island',
        city: order.seller.address?.city || 'Lagos',
        state: order.seller.address?.state || 'Lagos'
      },
      ship_to: shipping_address,
      package: {
        weight: order.totalWeight || 1.5,
        value: order.totalAmount,
        length: 30,
        width: 20,
        height: 15
      }
    };

    const ratesWithToken = await shippingService.getShippingRatesWithToken(rateRequest);
    
    if (!ratesWithToken.request_token) {
      throw new Error('Failed to get request token from ShipBubble');
    }

    console.log('✅ Got request token');

    // ✅ STEP 2: Calculate insurance
    let insuranceFee = 0;
    let insuranceCode = undefined;
    
    if (insurance_option !== 'none') {
      const insuranceOptions = shippingService.getInsuranceOptions(order.totalAmount);
      const selectedInsurance = insuranceOptions.find(opt => opt.type === insurance_option);
      if (selectedInsurance) {
        insuranceFee = selectedInsurance.fee;
        insuranceCode = `${insurance_option}_insurance`;
      }
    }

    // ✅ STEP 3: Create the shipment
    console.log('🔍 Step 2: Creating shipment...');

    const shipmentData = {
      request_token: ratesWithToken.request_token,
      service_code: selected_rate.service_code || selected_rate.service,
      courier_id: selected_rate.courier_id || selected_rate.carrier.toLowerCase().replace(/\s+/g, '_'),
      is_cod_label: order.paymentMethod === 'cash_on_delivery',
      insurance_code: insuranceCode,
      special_instructions: special_instructions || 'Handle with care'
    };

    const shipmentResult = await shippingService.createShipBubbleOrder(shipmentData);

    // ✅ STEP 4: Update order with shipping details
    order.shippingDetails = {
      carrier: selected_rate.carrier,
      service: selected_rate.service,
      fee: selected_rate.fee,
      delivery_time: selected_rate.delivery_time,
      pickup_time: selected_rate.pickup_time,
      insurance_option: insurance_option,
      insurance_fee: insuranceFee,
      total_shipping_cost: selected_rate.fee + insuranceFee
    };

    order.shipbubbleOrderId = shipmentResult.order_id;
    order.trackingCode = shipmentResult.tracking_code;
    order.trackingUrl = shipmentResult.tracking_url;
    order.shippingStatus = 'pending_pickup';
    order.courierContact = shipmentResult.courier;

    await order.save();

    // ✅ STEP 5: Update user's courier preferences
    await updateUserCourierPreference(req.user._id, selected_rate.carrier);

    console.log('✅ Complete ShipBubble order created:', shipmentResult.order_id);

    res.json({
      success: true,
      message: 'Shipping order created successfully',
      shipping_order: {
        shipbubble_order_id: shipmentResult.order_id,
        tracking_code: shipmentResult.tracking_code,
        tracking_url: shipmentResult.tracking_url,
        carrier: selected_rate.carrier,
        estimated_pickup: selected_rate.pickup_time,
        estimated_delivery: selected_rate.delivery_time,
        shipping_cost: selected_rate.fee,
        insurance_cost: insuranceFee,
        total_cost: selected_rate.fee + insuranceFee,
        courier_contact: shipmentResult.courier
      },
      order_id: order._id
    });

  } catch (error: any) {
    console.error('❌ Create shipping order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create shipping order',
      message: error.message
    });
  }
});

// ========================================
// ✅ REAL-TIME PACKAGE TRACKING WITH PROGRESS
// ========================================

router.get('/track/:orderId', verifyJwtToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('seller', 'fullName mobile')
      .populate('buyer', 'fullName mobile');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Verify authorization
    const isAuthorized = order.buyer.toString() === req.user._id || 
                        order.seller.toString() === req.user._id;
    
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to order'
      });
    }

    if (!order.shipbubbleOrderId) {
      return res.status(400).json({
        success: false,
        error: 'No shipping order found for this order'
      });
    }

    // ✅ GET REAL-TIME TRACKING FROM SHIPBUBBLE
    const trackingInfo = await shippingService.getDetailedTracking(order.shipbubbleOrderId);

    // ✅ UPDATE ORDER STATUS IF CHANGED
    if (trackingInfo.status && trackingInfo.status !== order.shippingStatus) {
      order.shippingStatus = trackingInfo.status;
      order.lastShippingUpdate = new Date();
      
      if (trackingInfo.status === 'delivered' && !order.deliveredAt) {
        order.deliveredAt = new Date();
      }
      
      await order.save();
    }

    // ✅ CALCULATE DELIVERY PROGRESS
    const progress = calculateDeliveryProgress(order.shippingStatus, trackingInfo.events);

    res.json({
      success: true,
      tracking: {
        order_id: order._id,
        shipbubble_order_id: order.shipbubbleOrderId,
        tracking_code: order.trackingCode,
        tracking_url: order.trackingUrl,
        current_status: order.shippingStatus,
        
        // ✅ ENHANCED TRACKING INFO
        carrier: order.shippingDetails?.carrier,
        service: order.shippingDetails?.service,
        estimated_delivery: order.shippingDetails?.delivery_time,
        last_update: order.lastShippingUpdate,
        delivered_at: order.deliveredAt,
        
        // ✅ DETAILED PROGRESS
        progress: progress,
        
        // ✅ TRACKING EVENTS TIMELINE
        events: trackingInfo.events || [],
        
        // ✅ COURIER CONTACT INFO
        courier_contact: order.courierContact,
        
        // ✅ PACKAGE & SHIPPING DETAILS
        package_info: {
          weight: order.totalWeight,
          value: order.totalAmount,
          description: order.items?.[0]?.title || 'Marketplace items',
          insurance_coverage: order.shippingDetails?.insurance_option !== 'none'
        },
        
        shipping_details: order.shippingDetails
      }
    });

  } catch (error: any) {
    console.error('❌ Package tracking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tracking information',
      message: error.message
    });
  }
});

// ========================================
// ✅ FAVORITE COURIERS & USAGE ANALYTICS
// ========================================

router.get('/favorite-couriers', verifyJwtToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('shippingPreferences');
    
    // Get courier usage from recent orders
    const recentOrders = await Order.find({
      $or: [{ buyer: req.user._id }, { seller: req.user._id }],
      'shippingDetails.carrier': { $exists: true }
    })
    .select('shippingDetails createdAt')
    .sort({ createdAt: -1 })
    .limit(50);

    // Count courier usage and calculate metrics
    const courierStats: { [key: string]: any } = {};
    
    recentOrders.forEach(order => {
      const carrier = order.shippingDetails?.carrier;
      if (carrier) {
        if (!courierStats[carrier]) {
          courierStats[carrier] = {
            carrier,
            usage_count: 0,
            total_cost: 0,
            avg_delivery_time: [],
            last_used: order.createdAt,
            ratings: []
          };
        }
        
        courierStats[carrier].usage_count++;
        courierStats[carrier].total_cost += order.shippingDetails.fee || 0;
        courierStats[carrier].last_used = order.createdAt;
      }
    });

    // Sort by usage and calculate averages
    const favorites = Object.values(courierStats)
      .sort((a: any, b: any) => b.usage_count - a.usage_count)
      .slice(0, 5)
      .map((stats: any) => ({
        carrier: stats.carrier,
        usage_count: stats.usage_count,
        avg_cost: Math.round(stats.total_cost / stats.usage_count),
        last_used: stats.last_used,
        is_preferred: user?.shippingPreferences?.preferred_couriers?.includes(stats.carrier) || false
      }));

    res.json({
      success: true,
      favorite_couriers: favorites,
      preferred_couriers: user?.shippingPreferences?.preferred_couriers || [],
      usage_summary: {
        total_shipments: recentOrders.length,
        unique_couriers: Object.keys(courierStats).length,
        most_used: favorites[0]?.carrier || null
      },
      recent_shipments: recentOrders.slice(0, 10).map(order => ({
        carrier: order.shippingDetails?.carrier,
        fee: order.shippingDetails?.fee,
        service: order.shippingDetails?.service,
        date: order.createdAt
      }))
    });

  } catch (error: any) {
    console.error('❌ Get favorite couriers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get favorite couriers'
    });
  }
});

// ========================================
// ✅ EXISTING ROUTES (Cleaned up)
// ========================================

// Test routes (keep for debugging)
router.get('/test-connection', async (req, res) => {
  try {
    const result = await shippingService.testConnection();
    res.json({
      success: result.success,
      message: result.message,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Locations endpoint (keep as is)
router.get('/locations', (req, res) => {
  const locations = {
    states: [
      { code: 'LA', name: 'Lagos', zone: 'South-West' },
      { code: 'FC', name: 'FCT', zone: 'North-Central', fullName: 'Federal Capital Territory' },
      { code: 'RI', name: 'Rivers', zone: 'South-South' },
      { code: 'KN', name: 'Kano', zone: 'North-West' },
      { code: 'OG', name: 'Ogun', zone: 'South-West' },
      // ... add all Nigerian states
    ],
    popular_cities: {
      'Lagos': ['Victoria Island', 'Ikeja', 'Lekki', 'Surulere', 'Yaba', 'Ikoyi'],
      'FCT': ['Central Area', 'Garki', 'Wuse', 'Asokoro', 'Maitama'],
      'Rivers': ['Port Harcourt', 'Obio-Akpor'],
    }
  };

  res.json({
    success: true,
    ...locations
  });
});

// Address management (keep existing logic)
router.get('/addresses', verifyJwtToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('shippingAddresses address fullName mobile');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    let addresses = [];
    
    // ✅ FIRST: Get addresses from shippingAddresses array
    if (user.shippingAddresses && user.shippingAddresses.length > 0) {
      addresses = user.shippingAddresses.map(addr => ({
        _id: addr._id,
        name: addr.name,
        phone: addr.phone,
        address: addr.address,
        city: addr.city,
        state: addr.state,
        label: addr.label || 'Home',
        isDefault: addr.isDefault || false,
        last_used: addr.last_used || new Date(),
        created_at: addr.created_at || new Date()
      }));
      
      console.log('📍 Found shipping addresses:', addresses.length);
    }
    
    // ✅ SECOND: If no shipping addresses, create one from profile address
    if (addresses.length === 0 && user.address && user.address.street) {
      console.log('📍 No shipping addresses found, using profile address');
      
      const profileAddress = {
        _id: 'profile_address',
        name: user.fullName || 'User',
        phone: user.mobile || '+234-xxx-xxx-xxxx',
        address: user.address.street,
        city: user.address.city,
        state: user.address.state,
        country: user.address.country || 'Nigeria',
        label: 'Home',
        isDefault: true,
        verified: user.address.verified || false,
        addressType: user.address.addressType || 'residential'
      };
      
      addresses = [profileAddress];
      console.log('📍 Created address from user profile');
    }
    
    const defaultAddress = addresses.find(addr => addr.isDefault) || 
                           (addresses.length > 0 ? { ...addresses[0], isDefault: true } : null);
    
    res.json({
      success: true,
      addresses: addresses,
      default_address: defaultAddress,
      count: addresses.length,
      // Debug info
      debug: {
        user_id: user._id,
        has_shipping_addresses: (user.shippingAddresses?.length || 0) > 0,
        has_profile_address: !!(user.address?.street),
        profile_address: user.address ? {
          street: user.address.street,
          city: user.address.city,
          state: user.address.state,
          verified: user.address.verified
        } : null
      }
    });

  } catch (error: any) {
    console.error('❌ Get addresses error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get addresses',
      message: error.message
    });
  }
});

// ✅ NEW: Convert profile address to shipping address
router.post('/addresses/import-profile', verifyJwtToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    if (!user.address || !user.address.street) {
      return res.status(400).json({
        success: false,
        error: 'No profile address found to import'
      });
    }

    // Check if already imported
    const existingAddress = user.shippingAddresses?.find(addr => 
      addr.address === user.address?.street && 
      addr.city === user.address?.city
    );

    if (existingAddress) {
      return res.status(400).json({
        success: false,
        error: 'Profile address already imported'
      });
    }

    // Import profile address as shipping address
    const importedAddress = await user.addShippingAddress({
      name: user.fullName || 'User',
      phone: user.mobile || '+234-xxx-xxx-xxxx',
      address: user.address.street,
      city: user.address.city,
      state: user.address.state,
      label: 'Home (Imported)',
      isDefault: true
    });

    console.log('✅ Imported profile address to shipping addresses');

    res.json({
      success: true,
      message: 'Profile address imported successfully',
      address: importedAddress.shippingAddresses?.slice(-1)[0] // Get the last added address
    });

  } catch (error: any) {
    console.error('❌ Import profile address error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import profile address',
      message: error.message
    });
  }
});

// ✅ ADD: POST route for creating new addresses
router.post('/addresses', verifyJwtToken, async (req, res) => {
  try {
    console.log('📍 Creating new address for user:', req.user._id);
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    const { name, phone, address, city, state, label, isDefault } = req.body;

    // Validation
    if (!name || !phone || !address || !city || !state) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required: name, phone, address, city, state'
      });
    }

    // Create new address object
    const newAddress = {
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      label: label?.trim() || 'Home',
      isDefault: isDefault || user.shippingAddresses?.length === 0, // First address is default
      last_used: new Date(),
      created_at: new Date()
    };

    // If this is set as default, unset others
    if (newAddress.isDefault && user.shippingAddresses) {
      user.shippingAddresses.forEach(addr => addr.isDefault = false);
    }

    // Add to user's shipping addresses
    if (!user.shippingAddresses) {
      user.shippingAddresses = [];
    }
    
    user.shippingAddresses.push(newAddress);

    // Save user
    const updatedUser = await user.save();
    const savedAddress = updatedUser.shippingAddresses?.slice(-1)[0]; // Get the newly added address

    console.log('✅ Address created successfully:', savedAddress?._id);

    res.status(201).json({
      success: true,
      message: 'Address created successfully',
      address: savedAddress,
      data: { address: savedAddress } // For compatibility with frontend
    });

  } catch (error: any) {
    console.error('❌ Create address error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create address',
      message: error.message
    });
  }
});

// ========================================
// ✅ HELPER FUNCTIONS
// ========================================

function categorizeShippingRates(rates: any[], packageValue: number) {
  const sorted = [...rates].sort((a, b) => a.fee - b.fee);
  const fastest = [...rates].sort((a, b) => parseDeliveryTime(a.delivery_time) - parseDeliveryTime(b.delivery_time));
  
  const economyThreshold = sorted[Math.floor(sorted.length * 0.3)]?.fee || 0;
  const standardThreshold = sorted[Math.floor(sorted.length * 0.7)]?.fee || 0;
  const premiumThreshold = sorted[Math.floor(sorted.length * 0.9)]?.fee || 0;
  
  return {
    economy: sorted.filter(r => r.fee <= economyThreshold),
    standard: sorted.filter(r => r.fee > economyThreshold && r.fee <= standardThreshold),
    express: sorted.filter(r => r.fee > standardThreshold && r.fee <= premiumThreshold),
    premium: sorted.filter(r => r.fee > premiumThreshold),
    
    fastest: fastest[0],
    cheapest: sorted[0],
    bestValue: findBestValue(rates),
    userFavorite: null // Will be set based on user preferences
  };
}

function parseDeliveryTime(deliveryTime: string): number {
  if (deliveryTime.includes('30 minutes')) return 0.5;
  if (deliveryTime.includes('1 hour')) return 1;
  if (deliveryTime.includes('Same day') || deliveryTime.includes('14 hrs')) return 12;
  if (deliveryTime.includes('1 day') || deliveryTime.includes('24')) return 24;
  if (deliveryTime.includes('2 days')) return 48;
  if (deliveryTime.includes('3 days')) return 72;
  return 120; // Default to 5 days
}

function findBestValue(rates: any[]): any {
  if (rates.length === 0) return null;
  
  const maxFee = Math.max(...rates.map(r => r.fee));
  const minFee = Math.min(...rates.map(r => r.fee));
  
  return rates.reduce((best, rate) => {
    const deliveryHours = parseDeliveryTime(rate.delivery_time);
    const priceScore = (maxFee - rate.fee) / (maxFee - minFee || 1); // 0-1, higher is better
    const speedScore = 120 / (deliveryHours || 120); // 0-1, higher is better
    const valueScore = (priceScore + speedScore) / 2;
    
    const bestScore = best ? (
      ((maxFee - best.fee) / (maxFee - minFee || 1) + 120 / parseDeliveryTime(best.delivery_time)) / 2
    ) : 0;
    
    return valueScore > bestScore ? rate : best;
  }, null);
}

function applyUserPreferences(categorizedRates: any, preferences: any, preferredCouriers: string[] = []) {
  // Set user favorite based on preferences and history
  let userFavorite = null;
  
  if (preferences?.priority === 'speed') {
    userFavorite = categorizedRates.fastest;
  } else if (preferences?.priority === 'cost') {
    userFavorite = categorizedRates.cheapest;
  } else {
    userFavorite = categorizedRates.bestValue;
  }
  
  // Override with preferred courier if available
  if (preferredCouriers.length > 0) {
    const allRates = [
      ...categorizedRates.economy,
      ...categorizedRates.standard,
      ...categorizedRates.express,
      ...categorizedRates.premium
    ];
    
    const preferredRate = allRates.find(rate => 
      preferredCouriers.some(courier => 
        rate.carrier.toLowerCase().includes(courier.toLowerCase())
      )
    );
    
    if (preferredRate) {
      userFavorite = preferredRate;
    }
  }
  
  return {
    ...categorizedRates,
    userFavorite
  };
}

function enhanceRateWithInsurance(rate: any, insuranceOptions: any[]) {
  if (!rate) return null;
  
  return {
    ...rate,
    insurance_options: insuranceOptions,
    with_insurance: insuranceOptions.map(option => ({
      insurance_type: option.type,
      insurance_fee: option.fee,
      total_cost: rate.fee + option.fee,
      coverage: option.coverage
    }))
  };
}

async function getUserShippingPreferences(userId: string) {
  try {
    const user = await User.findById(userId).select('shippingPreferences');
    return user?.shippingPreferences || getDefaultPreferences();
  } catch (error) {
    return getDefaultPreferences();
  }
}

function getDefaultPreferences() {
  return {
    priority: 'balanced',
    max_delivery_time: '2 days',
    preferred_couriers: [],
    insurance_preference: 'auto',
    notifications: {
      pickup: true,
      in_transit: true,
      delivered: true,
      delays: true
    },
    auto_select_cheapest: false,
    auto_select_fastest: false
  };
}

async function updateUserCourierPreference(userId: string, carrier: string) {
  try {
    const user = await User.findById(userId);
    if (user && user.shippingPreferences) {
      const preferred = user.shippingPreferences.preferred_couriers || [];
      if (!preferred.includes(carrier)) {
        preferred.unshift(carrier); // Add to front
        if (preferred.length > 5) preferred.pop(); // Keep only top 5
        user.shippingPreferences.preferred_couriers = preferred;
        await user.save();
      }
    }
  } catch (error) {
    console.log('Could not update courier preference:', error.message);
  }
}

function calculateDeliveryProgress(status: string, events: any[]): any {
  const stages = ['pending', 'confirmed', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'];
  const currentIndex = stages.indexOf(status) !== -1 ? stages.indexOf(status) : 0;
  
  return {
    current_stage: status,
    progress_percentage: Math.round((currentIndex / (stages.length - 1)) * 100),
    stages: stages.map((stage, index) => ({
      name: stage.replace(/_/g, ' ').toUpperCase(),
      completed: index <= currentIndex,
      current: index === currentIndex,
      timestamp: events.find(e => e.status?.toLowerCase() === stage)?.datetime
    })),
    estimated_completion: events.length > 0 ? 'Based on recent updates' : 'Calculating...',
    total_stages: stages.length,
    completed_stages: currentIndex + 1
  };
}

function normalizeNigerianState(state: string): string {
  if (!state) return '';
  
  const stateMap: { [key: string]: string } = {
    'fct': 'FCT',
    'fct abuja': 'FCT',
    'federal capital territory': 'FCT',
    'abuja': 'FCT',
    'lag': 'Lagos',
    'ph': 'Rivers',
    'portharcourt': 'Rivers',
    'port harcourt': 'Rivers',
  };
  
  const normalized = state.toLowerCase().trim();
  const mapped = stateMap[normalized] || state.trim();
  
  return mapped.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

export default router;