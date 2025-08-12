// src/middleware/validation.ts
import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const validateUpload = [
  body('documentType')
    .isIn(['nin', 'drivers_license', 'passport', 'voters_card'])
    .withMessage('Invalid document type'),
  
  body('documentNumber')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('Document number must be between 3 and 50 characters'),
    
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

export const validateReview = [
  param('uploadId')
    .isUUID(4)
    .withMessage('Invalid upload ID'),
    
  body('action')
    .isIn(['approve', 'reject'])
    .withMessage('Action must be approve or reject'),
    
  body('comments')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Comments must be less than 500 characters'),
    
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

