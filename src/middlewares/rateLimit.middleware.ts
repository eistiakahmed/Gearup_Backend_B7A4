import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse.util';

/**
 * Simple in-memory rate limiter
 * For production, consider using Redis or a dedicated rate limiting library
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Clean up old entries periodically
    setInterval(() => this.cleanup(), this.windowMs);
  }

  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(t => t > cutoff);

      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimestamps);
      }
    }
  }

  private getKey(req: Request): string {
    // Use IP address or user ID if available
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = (req as any).user?.userId || 'anonymous';
    return `${ip}:${userId}`;
  }

  public checkLimit(req: Request): boolean {
    const key = this.getKey(req);
    const now = Date.now();
    const cutoff = now - this.windowMs;

    let timestamps = this.requests.get(key) || [];

    // Filter out timestamps outside the current window
    timestamps = timestamps.filter(t => t > cutoff);

    // Check if limit exceeded
    if (timestamps.length >= this.maxRequests) {
      return false;
    }

    // Add current timestamp
    timestamps.push(now);
    this.requests.set(key, timestamps);

    return true;
  }
}

/**
 * Rate limiters for different endpoints
 */
const strictLimiter = new RateLimiter(15 * 60 * 1000, 5); // 5 requests per 15 minutes
const authLimiter = new RateLimiter(60 * 60 * 1000, 10); // 10 requests per hour
const standardLimiter = new RateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes

/**
 * Strict rate limiting middleware for sensitive operations
 */
export const strictRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  if (!strictLimiter.checkLimit(req)) {
    sendError(
      res,
      429,
      'Too many requests',
      'Please try again later. Rate limit exceeded for this operation.'
    );
    return;
  }
  next();
};

/**
 * Authentication rate limiting middleware
 */
export const authRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  if (!authLimiter.checkLimit(req)) {
    sendError(
      res,
      429,
      'Too many authentication attempts',
      'Please try again later. Too many login/register attempts.'
    );
    return;
  }
  next();
};

/**
 * Standard rate limiting middleware
 */
export const standardRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  if (!standardLimiter.checkLimit(req)) {
    sendError(
      res,
      429,
      'Too many requests',
      'Please slow down. You have exceeded the rate limit.'
    );
    return;
  }
  next();
};