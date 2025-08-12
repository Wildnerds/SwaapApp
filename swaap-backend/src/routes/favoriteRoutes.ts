import express from 'express';
import { verifyJwtToken } from '../middlewares/verifyJwtToken';
import User from '../models/User';
import Product from '../models/Product';

const router = express.Router();

// Get user favorites
router.get('/', verifyJwtToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('favorites');
    res.json({ favorites: user.favorites || [] });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add/Remove favorite (toggle)
router.post('/:productId', verifyJwtToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize favorites array if it doesn't exist
    if (!user.favorites) {
      user.favorites = [];
    }

    // Check if already in favorites
    const favoriteIndex = user.favorites.findIndex(fav => fav.toString() === productId);
    
    if (favoriteIndex > -1) {
      // Remove from favorites
      user.favorites.splice(favoriteIndex, 1);
      await user.save();
      res.json({ message: 'Removed from favorites', isFavorite: false });
    } else {
      // Add to favorites
      user.favorites.push(productId);
      await user.save();
      res.json({ message: 'Added to favorites', isFavorite: true });
    }
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove from favorites
router.delete('/:productId', verifyJwtToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.favorites) {
      return res.status(400).json({ message: 'No favorites found' });
    }

    // Remove from favorites
    user.favorites = user.favorites.filter(fav => fav.toString() !== productId);
    await user.save();
    
    res.json({ message: 'Removed from favorites', isFavorite: false });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;