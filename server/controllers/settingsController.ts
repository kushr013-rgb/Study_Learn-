import type { Response } from 'express';
import { Settings } from '../models/Settings';
import { AuditLog } from '../models/AuditLog';
import type { AuthenticatedRequest } from '../middleware/auth';

export const settingsController = {
  /**
   * Get platform settings.
   */
  async getSettings(_req: AuthenticatedRequest, res: Response) {
    let settings = await Settings.findById('settings').lean();
    if (!settings) {
      settings = (
        await Settings.create({
          _id: 'settings',
          platformName: 'Astra Prep',
          weakAreaThreshold: 60,
          targetTimePerQuestion: 60,
          maintenance: false,
        })
      ).toObject();
    }
    const { _id, ...rest } = (settings || {}) as unknown as Record<string, unknown>;
    return res.json({ data: { ...rest, id: _id } });
  },

  /**
   * Update platform settings (Admin).
   */
  async updateSettings(req: AuthenticatedRequest, res: Response) {
    const allowed = ['platformName', 'weakAreaThreshold', 'targetTimePerQuestion', 'maintenance'];
    const patch = Object.fromEntries(Object.entries(req.body ?? {}).filter(([k]) => allowed.includes(k)));

    const settings = await Settings.findByIdAndUpdate(
      'settings',
      { $set: patch },
      { new: true, upsert: true }
    ).lean();

    const { _id, ...rest } = (settings || {}) as unknown as Record<string, unknown>;
    return res.json({ data: { ...rest, id: _id } });
  },

  /**
   * Get audit logs (Admin).
   */
  async getAuditLogs(req: AuthenticatedRequest, res: Response) {
    const filter: Record<string, unknown> = {};
    if (req.query.actorRole) filter.actorRole = req.query.actorRole;
    if (req.query.resource) filter.resource = req.query.resource;

    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 50)));

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return res.json({
      data: logs,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  },
};
