import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { logger } from '../config/logger';

export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    logger.warn('Validation failed for request:', {
      url: req.url,
      method: req.method,
      errors: errors.array(),
      body: req.body,
      query: req.query,
      params: req.params
    });

    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.type === 'field' ? error.path : 'unknown',
        message: error.msg,
        value: error.type === 'field' ? error.value : undefined
      })),
      timestamp: new Date()
    });
    return;
  }

  next();
};