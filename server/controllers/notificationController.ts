import type { Response } from 'express';
import { Notification } from '../models/Notification';
import type { AuthenticatedRequest } from '../middleware/auth';

export const notificationController = {
  /**
   * List notifications for logged in user.
   */
  async getNotifications(req: AuthenticatedRequest, res: Response) {
    const auth = req.auth!;
    const notifications = await Notification.find({
      $or: [{ userId: auth.sub }, { userId: 'all' }, { userId: auth.role }],
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    return res.json({ data: notifications });
  },

  /**
   * Mark notification as read.
   */
  async markRead(req: AuthenticatedRequest, res: Response) {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    return res.status(204).send();
  },

  /**
   * Send notification (Admin / System).
   */
  async createNotification(req: AuthenticatedRequest, res: Response) {
    const { userId = 'all', title, message, type = 'info', link = '' } = req.body ?? {};
    if (!title || !message) return res.status(400).json({ message: 'Title and message are required.' });

    const notification = await Notification.create({
      _id: `NOTIF-${Date.now()}`,
      userId,
      title,
      message,
      type,
      link,
      read: false,
      createdAt: new Date(),
    });

    return res.status(201).json({ data: notification });
  },
};
