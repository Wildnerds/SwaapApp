import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '@models/Product';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI!;

async function cleanupOldProducts() {
  await mongoose.connect(MONGO_URI);

  // Delete products with no images or empty images array
  const result = await Product.deleteMany({
    $or: [
      { images: { $exists: false } },
      { images: { $size: 0 } },
    ],
  });

  console.log(`Deleted ${result.deletedCount} products with no images`);

  // If you want to delete products with images matching a certain pattern, add conditions here

  process.exit(0);
}

cleanupOldProducts().catch(console.error);
