import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../config/logger';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export const createRateLimit = (options: RateLimitOptions) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      success: false,
      error: options.message || 'Too many requests, please try again later',
      timestamp: new Date()
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded:', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent')
      });

      res.status(429).json({
        success: false,
        error: options.message || 'Too many requests, please try again later',
        timestamp: new Date()
      });
    }
  });
};

// Default rate limiter
export const rateLimit = createRateLimit;

// Predefined rate limiters
export const strictRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

export const generalRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per windowMs
  message: 'Too many authentication attempts, please try again after 15 minutes',
  skipSuccessfulRequests: true
});