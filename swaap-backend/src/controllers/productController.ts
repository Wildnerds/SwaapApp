// src/controllers/productController.ts
import { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import Product from '../models/Product';
import User from '../models/User';
import mongoose from 'mongoose';


// Utility to upload a single buffer 
// to Cloudinary
const uploadToCloudinary = async (fileBuffer: Buffer): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream({ folder: 'products' }, (err, result) => {
      if (err || !result) return reject(err);
      resolve(result.secure_url);
    });

    uploadStream.end(fileBuffer);
  });
};

// POST /api/products
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, price, category, type, description } = req.body;
    const files = req.files as Express.Multer.File[];
      
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, message: 'No images provided' });
      return;
    }

    if (!req.user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // ✅ Upload to Cloudinary
    const imageUrls: string[] = [];
    for (const file of files) {
      const imageUrl = await uploadToCloudinary(file.buffer);
      imageUrls.push(imageUrl);
    }

    const product = new Product({
      title,
      price,
      category,
      type,
      description,
      images: imageUrls,
      user: req.user._id, // ✅ Use the MongoDB user ID
    });

    const saved = await product.save();
    console.log('✅ Product created:', saved);

    res.status(201).json({ success: true, product: saved });
  } catch (error: any) {
    console.error('❌ Product Upload Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload product',
      error: error?.message || 'Unexpected server error',
    });
  }
};

// GET /api/products
export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, sort, start, end } = req.query;

    const sortOrder = sort === 'oldest' ? 1 : -1;

    const dateFilter: any = {};
    if (start) dateFilter.$gte = new Date(start.toString());
    if (end) dateFilter.$lte = new Date(end.toString());

    const filter: any = {};
    if (start || end) filter.createdAt = dateFilter;

    const products = await Product.find(filter)
      .sort({ createdAt: sortOrder })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate({
        path: 'user',
        select: '_id fullName level successfulSwaps successfulSales trustScore verificationLevel phoneVerified emailVerified identityVerified addressVerified photoURL'
      });

    // ✅ Move this inside the try block AFTER fetching products
    const humanizeDate = (date: Date) => {
      const diff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 0) return 'Today';
      if (diff === 1) return '1 day ago';
      return `${diff} days ago`;
    };

    const response = products.map(p => ({
      ...p.toObject(),
      uploadedAgo: humanizeDate(p.createdAt),
    }));

    // ✅ Send modified response
    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error while fetching products' });
  }
};



// GET /api/products/search?q=query
export const searchProducts = async (req: Request, res: Response): Promise<void> => {
  const query = req.query.q?.toString() || '';

  try {
    const products = await Product.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } },
      ],
    })
      .populate({
        path: 'user',
        select: '_id fullName level successfulSwaps successfulSales trustScore verificationLevel phoneVerified emailVerified identityVerified addressVerified photoURL'
      })
      .limit(50);

    res.status(200).json(products); // ✅ Return raw array here too
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error?.message || 'Unexpected server error',
    });
  }
};

// DELETE /api/products/:id
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = req.params.id;

    if (!req.user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const product = await Product.findById(productId);

    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    if (product.user.toString() !== req.user._id) {
      res.status(403).json({ success: false, message: 'Forbidden: You do not own this product' });
      return;
    }

    // Optional: Delete images from Cloudinary
    if (product.images && product.images.length > 0) {
      try {
        for (const imageUrl of product.images) {
          // Extract public_id from Cloudinary URL
          const publicId = imageUrl.split('/').slice(-2).join('/').split('.')[0];
          if (publicId.includes('products/')) {
            await cloudinary.uploader.destroy(publicId);
          }
        }
      } catch (cloudinaryError) {
        console.error('Error deleting images from Cloudinary:', cloudinaryError);
        // Continue with product deletion even if image deletion fails
      }
    }

    await Product.findByIdAndDelete(productId);

    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error: any) {
    console.error('❌ Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error?.message || 'Unexpected server error',
    });
  }
};

// PUT /api/products/:id
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = req.params.id;

    if (!req.user?._id) {
      res.status(401).json({ message: 'Unauthorized: Missing user ID' });
      return;
    }

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    if (product.user.toString() !== req.user._id) {
      res.status(403).json({ message: 'Forbidden: You can only update your own products' });
      return;
    }

    console.log('🔍 UpdateProduct: Processing update for product:', productId);
    console.log('🔍 UpdateProduct: Body keys:', Object.keys(req.body));
    console.log('🔍 UpdateProduct: Files count:', (req.files as Express.Multer.File[])?.length || 0);
    console.log('🔍 UpdateProduct: Has X-Existing-Images header:', !!req.headers['x-existing-images']);

    // ✅ Update basic fields
    product.title = req.body.title ?? product.title;
    product.price = req.body.price ?? product.price;
    product.category = req.body.category ?? product.category;
    product.type = req.body.type ?? product.type;
    product.description = req.body.description ?? product.description;

    // ✅ ENHANCED: Handle existing images from multiple sources
    let existingImages: string[] = [];
    
    // Method 1: From headers (our frontend sends this) - PRIORITY
    if (req.headers['x-existing-images']) {
      try {
        existingImages = JSON.parse(req.headers['x-existing-images'] as string);
        console.log('📸 Found existing images in headers:', existingImages.length);
      } catch (error) {
        console.error('❌ Failed to parse existing images from headers:', error);
      }
    }
    
    // Method 2: From body (fallback for JSON-only updates)
    if (existingImages.length === 0 && req.body.images) {
      if (typeof req.body.images === 'string') {
        // Single existing image
        if (req.body.images.startsWith('http')) {
          existingImages = [req.body.images];
        }
      } else if (Array.isArray(req.body.images)) {
        // Multiple items - filter out only the URL strings (existing images)
        const isHttpUrl = (value: unknown): value is string => {
          return typeof value === 'string' && value.startsWith('http');
        };
        existingImages = req.body.images.filter(isHttpUrl);
      }
      console.log('📸 Found existing images in body:', existingImages.length);
    }

    // Method 3: Keep current images if no existing images specified and no new files
    if (existingImages.length === 0 && (!req.files || (req.files as Express.Multer.File[]).length === 0)) {
      existingImages = product.images || [];
      console.log('📸 Keeping current images (no changes):', existingImages.length);
    }

    // ✅ Upload new images to Cloudinary
    const newImageUrls: string[] = [];
    const files = req.files as Express.Multer.File[];
    
    if (files && files.length > 0) {
      console.log('📸 Processing', files.length, 'new image files');
      for (const file of files) {
        try {
          const imageUrl = await uploadToCloudinary(file.buffer);
          newImageUrls.push(imageUrl);
          console.log('📸 Uploaded new image:', imageUrl);
        } catch (uploadError) {
          console.error('❌ Error uploading image:', uploadError);
          // Continue with other images
        }
      }
    }

    // ✅ Combine existing and new images
    const finalImages = [...existingImages, ...newImageUrls];
    product.images = finalImages;

    const updatedProduct = await product.save();
    
    const imageStats = {
      existing: existingImages.length,
      new: newImageUrls.length,
      total: finalImages.length
    };
    
    console.log('✅ Product updated successfully:', {
      id: productId,
      ...imageStats
    });

    // ✅ ENHANCED: Return more detailed response for frontend
    res.status(200).json({
      success: true,
      product: updatedProduct,
      message: 'Product updated successfully',
      imageStats // This helps frontend show detailed feedback
    });
    
  } catch (error: any) {
    console.error('❌ Update product error:', error);
    res.status(500).json({
      message: 'Failed to update product',
      error: error.message || 'Server error',
    });
  }
};

// ✅ FIXED: Get product by ID with complete user trust score data
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ID format before querying MongoDB
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }

    const product = await Product.findById(id).populate({
      path: 'user',
      select: '_id fullName level successfulSwaps successfulSales trustScore verificationLevel phoneVerified emailVerified identityVerified addressVerified photoURL rating isActive lastSeen'
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    console.log('✅ Product fetched with user trust data:', {
      productId: product._id,
      userId: product.user?._id,
      userTrustScore: product.user?.trustScore,
      userVerificationLevel: product.user?.verificationLevel,
      userSuccessfulSwaps: product.user?.successfulSwaps,
      userSuccessfulSales: product.user?.successfulSales
    });

    res.json(product);
 } catch (err) {
  if (err instanceof Error) {
    console.error('❌ Product fetch error:', err.message);
  } else {
    console.error('❌ Product fetch error:', err);
  }
}
};

// GET /api/products/my
export const getMyProducts = async (req: Request, res: Response) => {
  try {
    // Type-safe check if user is attached by auth middleware
    const user = req.user;

    if (!user || !user._id) {
      return res.status(401).json({ message: 'Unauthorized: Missing user ID' });
    }

    const products = await Product.find({ user: user._id }).sort({ createdAt: -1 });

    return res.status(200).json(products);
  } catch (error: any) {
    console.error('❌ My Products Fetch Error:', error);
    return res.status(400).json({
      message: 'Bad Request',
      error: error?.message,
    });
  }
};