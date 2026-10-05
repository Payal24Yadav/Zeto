import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { IdempotencyRecord } from '../models/IdempotencyRecord';

export const idempotencyMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const idempotencyKey = req.header('Idempotency-Key') || (req.body && req.body.idempotencyKey);

  if (!idempotencyKey) {
    next();
    return;
  }

  try {
    const existing = await IdempotencyRecord.findOne({ key: idempotencyKey });
    if (existing) {
      res.setHeader('X-Idempotent-Replay', 'true');
      res.status(existing.responseStatus).json(existing.responseBody);
      return;
    }

    // Intercept res.json to capture response
    const originalJson = res.json.bind(res);
    res.json = (body: any): Response => {
      // Only cache successful or legitimate business responses (not internal 500 errors)
      if (res.statusCode < 500) {
        IdempotencyRecord.create({
          key: idempotencyKey,
          userId: req.user?.id,
          method: req.method,
          path: req.originalUrl,
          responseStatus: res.statusCode,
          responseBody: body
        }).catch((err) => {
          console.error('Failed to save idempotency record:', err);
        });
      }
      return originalJson(body);
    };

    next();
  } catch (error) {
    console.error('Idempotency middleware error:', error);
    next();
  }
};
