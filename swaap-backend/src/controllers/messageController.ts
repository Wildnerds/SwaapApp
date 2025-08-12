// controllers/messageController.ts
import Message from '../models/Message';
import Chat from '../models/Chat';
import { Request, Response } from 'express';

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { conversationId, senderId, text, replyTo } = req.body;

    if (!conversationId || !senderId || !text) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const newMessage = new Message({
      conversationId,
      senderId,
      text,
      replyTo: replyTo || null,
    });

    const savedMessage = await newMessage.save();

    // Optional: Update chat's lastMessage for preview
    await Chat.findByIdAndUpdate(conversationId, {
      lastMessage: {
        text,
        senderId,
        createdAt: savedMessage.createdAt,
      },
    });

    res.status(201).json(savedMessage);
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
};
