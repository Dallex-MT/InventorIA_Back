import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromCookie } from '../utils/jwt';
import { JWTPayload } from '../models/Usuario';

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const token = extractTokenFromCookie(req);

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Token de autenticación requerido'
      });
      return;
    }

    const decoded = verifyToken(token);
    
    if (!decoded) {
      res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
      return;
    }

    req.user = decoded as JWTPayload;
    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    res.status(401).json({
      success: false,
      message: 'Error en autenticación'
    });
  }
};

export const optionalAuthenticate = (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
  try {
    const token = extractTokenFromCookie(req);

    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        req.user = decoded as JWTPayload;
      }
    }

    next();
  } catch (error) {
    // Silently continue if optional authentication fails
    next();
  }
};