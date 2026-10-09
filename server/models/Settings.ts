import mongoose, { Schema, type Model } from 'mongoose';

export interface ISettings {
  _id: string;
  platformName: string;
  weakAreaThreshold: number;
  targetTimePerQuestion: number;
  maintenance: boolean;
}

const settingsSchema = new Schema<ISettings>(
  {
    _id: { type: String, default: 'settings' },
    platformName: { type: String, default: 'Astra Prep' },
    weakAreaThreshold: { type: Number, default: 60 },
    targetTimePerQuestion: { type: Number, default: 60 },
    maintenance: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Settings: Model<ISettings> =
  mongoose.models.Settings || mongoose.model<ISettings>('Settings', settingsSchema);
