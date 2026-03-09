import mongoose from 'mongoose';
import { LoggerService } from '../common/logger';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private readonly logger = new LoggerService('DB');

  private constructor() {}

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  async connect(uri: string): Promise<void> {
    try {
      await mongoose.connect(uri);
      this.logger.info('MongoDB connection established');
    } catch (error) {
      this.logger.error('Failed to connect to MongoDB', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await mongoose.disconnect();
      this.logger.info('MongoDB connection closed');
    } catch (error) {
      this.logger.error('Error disconnecting from MongoDB', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
