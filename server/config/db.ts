import mongoose from 'mongoose';
import { config } from './index';

export async function connectDB(): Promise<typeof mongoose> {
  const url = config.databaseUrl;
  if (!url) {
    throw new Error('DATABASE_URL is not defined in configuration.');
  }

  mongoose.connection.on('connected', () => {
    console.log('MongoDB connected successfully.');
  });

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Reconnecting...');
  });

  return mongoose.connect(url, {
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
  });
}

export async function closeDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
