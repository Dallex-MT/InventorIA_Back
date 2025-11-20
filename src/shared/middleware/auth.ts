import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromCookie, extractTokenFromHeader } from '../utils/jwt';
import { JWTPayload } from '../../modules/auth/models/Usuario';
import { tokenBlacklist } from '../utils/tokenBlacklist';

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    // Try to extract token from cookie first, then from Authorization header
    let token = extractTokenFromCookie(req);

    if (!token) {
      token = extractTokenFromHeader(req.headers.authorization);
    }

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

    // Verificar si el token está en la lista negra
    if (tokenBlacklist.isTokenBlacklisted(token)) {
      res.status(401).json({
        success: false,
        message: 'Token invalidado - sesión cerrada'
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

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    // Verificar que el usuario esté autenticado
    if (!req.user || !req.user.userId) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
      return;
    }

    // Verificar que el usuario tenga rol de administrador (rol_id = 1)
    if (req.user.rol_id !== 1) {
      res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Error en validación de rol administrador:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};