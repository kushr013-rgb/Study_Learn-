import mongoose, { Schema, type Model } from 'mongoose';

export interface IAuditLog {
  actorId: string;
  actorRole: string;
  actorName?: string;
  action: string;
  resource: string;
  resourceId?: string;
  requestId?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: String, required: true },
    actorRole: { type: String, required: true },
    actorName: { type: String, default: '' },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    resourceId: { type: String },
    requestId: { type: String },
    ip: { type: String },
    metadata: { type: Schema.Types.Mixed },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, action: 1 });
auditLogSchema.index({ createdAt: -1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
