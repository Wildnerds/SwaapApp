import { Request, Response } from 'express';
import Swap from '../models/Swap';
import Product from '../models/Product';
import { IUser } from '../models/User';

interface AuthRequest extends Request {
  user?: IUser & { _id: string }; // Ensure _id is string
}

// @desc    Create a swap request
// @route   POST /api/swaps
// @access  Private

export const createSwap = async (req: AuthRequest, res: Response) => {
  try {
    const fromUserId = req.user?._id;
    const { offeringProductId, requestedProductId, extraPayment, message } = req.body;

    console.log('Swap Request Body:', req.body);

    if (!offeringProductId || !requestedProductId) {
      return res.status(400).json({ message: 'Both products are required' });
    }

    const offeringProduct = await Product.findById(offeringProductId);
    const requestedProduct = await Product.findById(requestedProductId);

    if (!offeringProduct || !requestedProduct) {
      return res.status(404).json({ message: 'One or both products not found' });
    }

    const newSwap = await Swap.create({
      fromUser: fromUserId,
      toUser: requestedProduct.user,
      offeringProduct: offeringProductId,
      requestedProduct: requestedProductId,
      extraPayment,
      message,
    });

    return res.status(201).json(newSwap);
  } catch (error: any) {
    console.error('Swap creation error:', error);
    return res.status(500).json({
      message: 'Server error',
      error: error?.message || 'Unknown error',
    });
  }
};

// @desc    Accept a swap
// @route   POST /api/swaps/:swapId/accept
// @access  Private
export const acceptSwap = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { swapId } = req.params;

    const swap = await Swap.findById(swapId);
    if (!swap) {
      return res.status(404).json({ message: 'Swap not found' });
    }

    if (swap.toUser.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    swap.status = 'accepted';
    await swap.save();

    res.status(200).json(swap);
  } catch (error) {
    console.error('Accept swap error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Reject a swap
// @route   POST /api/swaps/:swapId/reject
// @access  Private
export const rejectSwap = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { swapId } = req.params;

    const swap = await Swap.findById(swapId);
    if (!swap) {
      return res.status(404).json({ message: 'Swap not found' });
    }

    if (swap.toUser.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    swap.status = 'rejected';
    swap.rejectedBy = userId;
    await swap.save();

    res.status(200).json(swap);
  } catch (error) {
    console.error('Reject swap error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
