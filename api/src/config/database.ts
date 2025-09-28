import mongoose from 'mongoose';
import { logger } from './logger';

interface DatabaseConfig {
  url: string;
  options: mongoose.ConnectOptions;
}

const config: DatabaseConfig = {
  url: process.env.DATABASE_URL || 'mongodb://localhost:27017/defi-vault',
  options: {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
    retryWrites: true,
    w: 'majority',
  },
};

export class Database {
  private static instance: Database;
  private isConnected = false;

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await mongoose.connect(config.url, config.options);
      this.isConnected = true;
      logger.info('Database connected successfully');

      mongoose.connection.on('error', (error) => {
        logger.error('Database connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('Database disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('Database reconnected');
        this.isConnected = true;
      });

    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('Database disconnected successfully');
    } catch (error) {
      logger.error('Database disconnection failed:', error);
      throw error;
    }
  }

  public getConnection(): mongoose.Connection {
    return mongoose.connection;
  }

  public isHealthy(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }
}

export default Database.getInstance();