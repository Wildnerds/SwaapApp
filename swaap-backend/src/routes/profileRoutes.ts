// src/routes/profileRoutes.ts
import express from 'express';
import User from '@/models/User';
import  {verifyJwtToken}  from '@/middlewares/verifyJwtToken';

const router = express.Router();

// ✅ Authenticated GET /api/profiles/me
router.get('/me', verifyJwtToken, async (req, res) => {
  try {
    const user = await User.findById(req.user?._id).select('fullName email level successfulSwaps');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json(user);
  } catch (err) {
    console.error('Fetch profile failed:', err);
    res.status(500).json({ message: 'Failed to fetch user profile' });
  }
});

export default router;