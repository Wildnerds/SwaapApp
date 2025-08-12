// import mongoose from 'mongoose';
// import dotenv from 'dotenv';
// import Product from './models/Product';

// dotenv.config();

// const MONGO_URI = process.env.MONGO_URI!;
// if (!MONGO_URI) throw new Error('MONGO_URI not defined in .env');

// async function migrate() {
//   try {
//     await mongoose.connect(MONGO_URI);
//     console.log('Connected to MongoDB');

//     const products = await Product.find({});
//     let updatedCount = 0;

//     for (const product of products) {
//       // Check if user field is missing or invalid
//       if (
//         !product.user ||
//         (typeof product.user !== 'string' && !('toString' in product.user))
//       ) {
//         console.log(`Skipping product ${product._id} with invalid user:`, product.user);
//         continue;
//       }

//       // If user is object (e.g. populated), convert to string id
//       if (typeof product.user !== 'string' && 'toString' in product.user) {
//         product.user = product.user.toString();
//         await product.save();
//         updatedCount++;
//         console.log(`Updated product ${product._id} user to string`);
//       }
//     }

//     console.log(`Migration complete. Updated ${updatedCount} products.`);
//     process.exit(0);
//   } catch (error) {
//     console.error('Migration failed:', error);
//     process.exit(1);
//   }
// }

// migrate();
