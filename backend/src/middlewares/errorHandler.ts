import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  errors?: any[];
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected internal server error occurred.';

  // Structured safe error response (no sensitive stacks or credentials leaked)
  res.status(statusCode).json({
    success: false,
    error: message,
    errors: err.errors || undefined,
    timestamp: new Date().toISOString()
  });
};
