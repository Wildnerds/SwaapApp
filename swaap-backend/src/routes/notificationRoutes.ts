import express from 'express';
import { verifyJwtToken } from '../middlewares/verifyJwtToken';
import Notification from '../models/notification';

const router = express.Router();

// Test route to create a sample notification
router.post('/test', verifyJwtToken, async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ type: 'error', message: 'Unauthorized' });
    }

    // Create a test notification for the current user
    const notification = await Notification.create({
      user: req.user._id,
      type: 'test',
      message: `Test notification for ${req.user.fullName || req.user.email}`,
      data: { testData: 'This is a test notification' }
    });

    console.log(`📲 Created test notification for user: ${req.user._id}`);

    return res.json({
      type: 'success',
      message: 'Test notification created',
      data: notification
    });
  } catch (err) {
    console.error('Create test notification error:', err);
    return res.status(500).json({ type: 'error', message: 'Server error' });
  }
});

router.get('/', verifyJwtToken, async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ type: 'error', message: 'Unauthorized' });
    }

    console.log(`🔍 Fetching notifications for user: ${req.user._id} (${req.user.email})`);

    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    console.log(`📊 Found ${notifications.length} notifications for user ${req.user._id}`);
    console.log(`📋 Notifications:`, notifications.map(n => ({ 
      id: n._id, 
      type: n.type, 
      message: n.message.substring(0, 50),
      read: n.read,
      createdAt: n.createdAt 
    })));

    return res.json({
      type: 'success',
      message: 'Notifications fetched',
      data: notifications,
    });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    return res.status(500).json({ type: 'error', message: 'Server error' });
  }
});


router.put('/:id/read', verifyJwtToken, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user?._id,
      },
      { read: true },
      { new: true }
    );

    if (!notif) {
      return res.status(404).json({ message: 'Not found' });
    }

    return res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    console.error('Mark notification as read error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Mark all notifications as read for a specific chat
router.put('/chat/:chatId/read', verifyJwtToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const groupKey = `chat_${chatId}`;
    
    console.log(`🔍 Marking grouped notification as read for chat: ${chatId}, user: ${req.user._id}`);

    // Mark the grouped notification as read using groupKey
    const result = await Notification.updateMany(
      {
        user: req.user._id,
        type: 'new_message',
        groupKey: groupKey,
        read: false
      },
      { read: true }
    );

    console.log(`✅ Marked ${result.modifiedCount} grouped chat notifications as read`);

    return res.json({ 
      success: true, 
      message: `Marked ${result.modifiedCount} grouped chat notifications as read`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error('Mark chat notifications as read error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', verifyJwtToken, async (req, res) => {
  try {
    const notif = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user?._id,
    });

    if (!notif) {
      return res.status(404).json({ message: 'Not found' });
    }

    return res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    console.error('Delete notification error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
