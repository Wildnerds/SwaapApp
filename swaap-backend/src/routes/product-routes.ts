import { Router } from 'express';
import multer from 'multer';
import {
  getAllProducts,
  searchProducts,
  deleteProduct,
  updateProduct,
  getProductById,
  getMyProducts,
  createProduct, // <--- include this here
} from '@/controllers/productController'; // <- use a single consistent path
import { verifyJwtToken } from '@/middlewares/verifyJwtToken';
import { limitProductUploads } from '@/middlewares/limitProductUploads';
import { checkProLimit } from '@/middlewares/checkProLimit';


const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// 🔓 Public Routes
router.get('/', getAllProducts);
router.get('/search', searchProducts);

// ✅ Protected Routes
router.get('/my', verifyJwtToken, getMyProducts); // Move above :id
router.post(
  '/',
  verifyJwtToken,
  upload.array('images', 5),
  limitProductUploads,
  checkProLimit,
  createProduct
);
router.put(
  '/:id',
  verifyJwtToken,
  upload.array('images', 5),
  updateProduct
);
router.delete('/:id', verifyJwtToken, deleteProduct);

// 📦 Keep this LAST
router.get('/:id', getProductById);

export default router;
