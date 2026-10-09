import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth';

export const requireRole = (...roles: Array<'student' | 'faculty' | 'admin'>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void | Response => {
    const auth = req.auth;
    if (!auth || !roles.includes(auth.role)) {
      return res.status(403).json({
        message: 'Access denied: insufficient permissions for this resource.',
        code: 'FORBIDDEN',
      });
    }
    return next();
  };
};

export const requireSelfOrAdmin = (paramName = 'id') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void | Response => {
    const auth = req.auth;
    if (!auth) {
      return res.status(401).json({ message: 'Authentication required.', code: 'AUTH_REQUIRED' });
    }

    const targetId = req.params[paramName];
    if (auth.role === 'admin' || auth.sub === targetId) {
      return next();
    }

    return res.status(403).json({
      message: 'Access denied: you can only view or manage your own profile.',
      code: 'FORBIDDEN_CROSS_USER',
    });
  };
};
