import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { UsuarioService } from '../services/UsuarioService';
import { generateToken, setTokenCookie, clearTokenCookie } from '../utils/jwt';
import { comparePassword, hashPassword } from '../utils/password';
import { 
  validateEmail, 
  validateNombreUsuario, 
  validateRolId,
} from '../utils/validation';
import { UsuarioRegistroDTO, AuthResponse, JWTPayload } from '../models/Usuario';
import { invalidateUserSessions } from '../utils/tokenBlacklist';

export class AuthController {
  private usuarioService: UsuarioService;

  constructor() {
    this.usuarioService = new UsuarioService();
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const { cedula, nombre_usuario, correo, password, rol_id } = req.body;

      if (!cedula || !nombre_usuario || !correo || !password || !rol_id) {
        const response: AuthResponse = {
          success: false,
          message: 'Todos los campos son requeridos'
        };
        res.status(400).json(response);
        return;
      }

      const nombreValidation = validateNombreUsuario(nombre_usuario);
      if (!nombreValidation.isValid) {
        const response: AuthResponse = {
          success: false,
          message: nombreValidation.error || 'Nombre de usuario inválido'
        };
        res.status(400).json(response);
        return;
      }

      const emailValidation = validateEmail(correo);
      if (!emailValidation.isValid) {
        const response: AuthResponse = {
          success: false,
          message: emailValidation.error || 'Correo electrónico inválido'
        };
        res.status(400).json(response);
        return;
      }

      const rolValidation = validateRolId(parseInt(rol_id));
      if (!rolValidation.isValid) {
        const response: AuthResponse = {
          success: false,
          message: rolValidation.error || 'Rol inválido'
        };
        res.status(400).json(response);
        return;
      }

      const existingUser = await this.usuarioService.checkIfUserExists(correo);
      if (existingUser.exists) {
        const response: AuthResponse = {
          success: false,
          message: 'Ya existe un usuario con este correo electrónico'
        };
        res.status(409).json(response);
        return;
      }

      const usuarioData: UsuarioRegistroDTO = {
        cedula,
        nombre_usuario,
        correo,
        password,
        rol_id: parseInt(rol_id)
      };

      const newUser = await this.usuarioService.create(usuarioData);
      const safeUser = this.usuarioService.toSafeUser(newUser);

      const tokenPayload: JWTPayload = {
        userId: newUser.id,
        cedula: newUser.cedula,
        nombre_usuario: newUser.nombre_usuario,
        rol_id: newUser.rol_id
      };

      const token = generateToken(tokenPayload);
      setTokenCookie(res, token);

      const response: AuthResponse = {
        success: true,
        message: 'Usuario registrado exitosamente',
        user: safeUser
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error en registro:', error);
      const response: AuthResponse = {
        success: false,
        message: 'Error interno del servidor'
      };
      res.status(500).json(response);
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { correo, password } = req.body;

      if (!correo || !password) {
        const response: AuthResponse = {
          success: false,
          message: 'Correo electrónico y contraseña son requeridos'
        };
        res.status(400).json(response);
        return;
      }

      const emailValidation = validateEmail(correo);
      if (!emailValidation.isValid) {
        const response: AuthResponse = {
          success: false,
          message: emailValidation.error || 'Correo electrónico inválido'
        };
        res.status(400).json(response);
        return;
      }

      const user = await this.usuarioService.findByEmail(correo);
      if (!user) {
        const response: AuthResponse = {
          success: false,
          message: 'Credenciales inválidas'
        };
        res.status(401).json(response);
        return;
      }

      if (!user.activo) {
        const response: AuthResponse = {
          success: false,
          message: 'Usuario desactivado'
        };
        res.status(401).json(response);
        return;
      }

      const isPasswordValid = await comparePassword(password, user.password_hash);
      if (!isPasswordValid) {
        const response: AuthResponse = {
          success: false,
          message: 'Credenciales inválidas'
        };
        res.status(401).json(response);
        return;
      }

      await this.usuarioService.updateLastAccess(user.id);

      const tokenPayload: JWTPayload = {
        userId: user.id,
        cedula: user.cedula,
        nombre_usuario: user.nombre_usuario,
        rol_id: user.rol_id
      };

      const token = generateToken(tokenPayload);
      setTokenCookie(res, token);
      const safeUser = this.usuarioService.toSafeUser(user);

      const response: AuthResponse = {
        success: true,
        message: 'Inicio de sesión exitoso',
        user: safeUser
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error en login:', error);
      const response: AuthResponse = {
        success: false,
        message: 'Error interno del servidor'
      };
      res.status(500).json(response);
    }
  }

  async me(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      
      if (!user || !user.userId) {
        const response: AuthResponse = {
          success: false,
          message: 'Usuario no autenticado'
        };
        res.status(401).json(response);
        return;
      }

      const userData = await this.usuarioService.findById(user.userId);
      if (!userData) {
        const response: AuthResponse = {
          success: false,
          message: 'Usuario no encontrado'
        };
        res.status(404).json(response);
        return;
      }

      const safeUser = this.usuarioService.toSafeUser(userData);

      const response: AuthResponse = {
        success: true,
        message: 'Usuario obtenido exitosamente',
        user: safeUser
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      const response: AuthResponse = {
        success: false,
        message: 'Error interno del servidor'
      };
      res.status(500).json(response);
    }
  }

  async logout(_req: Request, res: Response): Promise<void> {
    try {
      clearTokenCookie(res);
      const response: AuthResponse = {
        success: true,
        message: 'Sesión cerrada exitosamente'
      };
      res.json(response);
    } catch (error) {
      console.error('Error in logout:', error);
      const response: AuthResponse = {
        success: false,
        message: 'Error al cerrar sesión'
      };
      res.status(500).json(response);
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const { estado, nombre_usuario, correo, cedula, userId } = req.body;

      if (!user || !user.userId) {
        const response: AuthResponse = {
          success: false,
          message: 'Usuario no autenticado'
        };
        res.status(401).json(response);
        return;
      }

      // Si no se proporciona userId, se asume que se quiere editar el propio perfil
      const targetUserId = userId ? parseInt(userId) : user.userId;

      if (!nombre_usuario && !correo && !cedula) {
        const response: AuthResponse = {
          success: false,
          message: 'Debe proporcionar al menos un campo para actualizar'
        };
        res.status(400).json(response);
        return;
      }

      const updateData: any = {};
      if (nombre_usuario) {
        const nombreValidation = validateNombreUsuario(nombre_usuario);
        if (!nombreValidation.isValid) {
          const response: AuthResponse = {
            success: false,
            message: nombreValidation.error || 'Nombre de usuario inválido'
          };
          res.status(400).json(response);
          return;
        }
        updateData.nombre_usuario = nombre_usuario;
      }

      if (correo) {
        const emailValidation = validateEmail(correo);
        if (!emailValidation.isValid) {
          const response: AuthResponse = {
            success: false,
            message: emailValidation.error || 'Correo electrónico inválido'
          };
          res.status(400).json(response);
          return;
        }
        updateData.correo = correo;
      }

      if (cedula) {
        // La cédula viene encriptada desde el frontend, no se valida formato
        updateData.cedula = cedula;
      }

      if (estado !== undefined) {
        updateData.activo = estado;
      }

      const updatedUser = await this.usuarioService.update(user.userId, targetUserId, updateData);
      if (!updatedUser) {
        const response: AuthResponse = {
          success: false,
          message: 'Usuario no encontrado'
        };
        res.status(404).json(response);
        return;
      }

      const safeUser = this.usuarioService.toSafeUser(updatedUser);

      // Mensaje personalizado según quién está siendo modificado
      let successMessage = 'Perfil actualizado exitosamente';
      if (user.userId !== targetUserId) {
        successMessage = `Perfil del usuario ${updatedUser.nombre_usuario} (ID: ${targetUserId}) actualizado exitosamente por el administrador`;
      } else {
        successMessage = 'Tu perfil ha sido actualizado exitosamente';
      }

      const response: AuthResponse = {
        success: true,
        message: successMessage,
        user: safeUser,
        metadata: {
          updatedBy: user.userId,
          updatedUser: targetUserId,
          isAdmin: user.userId !== targetUserId
        }
      };
      res.json(response);
    } catch (error) {
      console.error('Error in updateProfile:', error);
      const response: AuthResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Error al actualizar el perfil'
      };
      
      // Manejar códigos de estado específicos según el tipo de error
      if (error instanceof Error) {
        if (error.message.includes('permisos')) {
          res.status(403).json(response);
        } else if (error.message.includes('no encontrado')) {
          res.status(404).json(response);
        } else {
          res.status(500).json(response);
        }
      } else {
        res.status(500).json(response);
      }
    }
  }

  async updatePassword(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const { oldPassword, newPassword } = req.body;

      if (!user || !user.userId) {
        const response: AuthResponse = {
          success: false,
          message: 'Usuario no autenticado'
        };
        res.status(401).json(response);
        return;
      }

      if (!oldPassword || !newPassword) {
        const response: AuthResponse = {
          success: false,
          message: 'La contraseña actual y la nueva contraseña son requeridas'
        };
        res.status(400).json(response);
        return;
      }

      // Verificar que la nueva contraseña no sea igual a la actual
      if (oldPassword === newPassword) {
        const response: AuthResponse = {
          success: false,
          message: 'La nueva contraseña debe ser diferente a la actual'
        };
        res.status(400).json(response);
        return;
      }

      // Obtener el usuario actual con su contraseña hash
      const currentUser = await this.usuarioService.findById(user.userId);
      if (!currentUser) {
        const response: AuthResponse = {
          success: false,
          message: 'Usuario no encontrado'
        };
        res.status(404).json(response);
        return;
      }

      // Verificar que la contraseña actual sea correcta
      const isCurrentPasswordValid = await comparePassword(oldPassword, currentUser.password_hash);
      if (!isCurrentPasswordValid) {
        const response: AuthResponse = {
          success: false,
          message: 'La contraseña actual es incorrecta'
        };
        res.status(401).json(response);
        return;
      }

      // Hash de la nueva contraseña
      const newPasswordHash = await hashPassword(newPassword);

      // Actualizar la contraseña en la base de datos
      await this.usuarioService.updatePassword(user.userId, newPasswordHash);

      const response: AuthResponse = {
        success: true,
        message: 'Contraseña actualizada exitosamente'
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error al actualizar contraseña:', error);
      const response: AuthResponse = {
        success: false,
        message: 'Error interno del servidor'
      };
      res.status(500).json(response);
    }
  }

  async deactivateUser(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const { userId } = req.params;

      if (!user || !user.userId) {
        const response: AuthResponse = {
          success: false,
          message: 'Usuario no autenticado'
        };
        res.status(401).json(response);
        return;
      }

      // Validar que el ID de usuario sea válido
      if (!userId || isNaN(parseInt(userId))) {
        const response: AuthResponse = {
          success: false,
          message: 'ID de usuario inválido'
        };
        res.status(400).json(response);
        return;
      }

      const targetUserId = parseInt(userId);

      // Paso 1: Verificar si el usuario que realiza la solicitud coincide con el ID objetivo
      if (user.userId === targetUserId) {
        // El usuario puede desactivar su propia cuenta
        console.log(`Usuario ${user.userId} está desactivando su propia cuenta`);
        
        // **NUEVO**: Gestionar sesiones y tokens cuando el usuario se desactiva a sí mismo
        try {
          console.log(`[SESION] Iniciando limpieza de sesiones para usuario ${user.userId}`);
          
          // 1. Invalidar todos los tokens del usuario (acceso y refresh)
          const invalidatedTokens = await invalidateUserSessions(user.userId);
          console.log(`[SESION] ${invalidatedTokens} tokens invalidados para usuario ${user.userId}`);
          
          // 2. Limpiar cookies de tokens en el cliente
          clearTokenCookie(res);
          console.log(`[SESION] Cookies de tokens limpiadas para usuario ${user.userId}`);
          
          // 3. Registrar evento de auditoría
          console.log(`[AUDITORIA] Usuario ${user.userId} desactivó su cuenta - sesiones cerradas forzosamente`);
          
        } catch (sessionError) {
          console.error(`[ERROR] Error al limpiar sesiones para usuario ${user.userId}:`, sessionError);
        }
      } else {
        // Paso 2: Si no coincide, verificar si el usuario tiene rol de administrador
        const requestingUser = await this.usuarioService.findById(user.userId);
        if (!requestingUser) {
          const response: AuthResponse = {
            success: false,
            message: 'Usuario solicitante no encontrado'
          };
          res.status(404).json(response);
          return;
        }

        // Verificar rol de administrador de forma segura
        if (requestingUser.rol_id !== 1) {
          const response: AuthResponse = {
            success: false,
            message: 'No tienes permisos para realizar esta acción'
          };
          res.status(403).json(response);
          return;
        }

        // El administrador puede desactivar cualquier cuenta
        console.log(`Administrador ${user.userId} está desactivando la cuenta de usuario ${targetUserId}`);
      }

      // Realizar la desactivación del usuario
      const deactivatedUser = await this.usuarioService.softDelete(targetUserId);
      if (!deactivatedUser) {
        const response: AuthResponse = {
          success: false,
          message: 'Usuario no encontrado'
        };
        res.status(404).json(response);
        return;
      }

      const safeUser = this.usuarioService.toSafeUser(deactivatedUser);

      const response: AuthResponse = {
        success: true,
        message: 'Usuario desactivado exitosamente',
        user: safeUser
      };
      res.json(response);
    } catch (error) {
      console.error('Error al desactivar usuario:', error);
      const response: AuthResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Error al desactivar usuario'
      };
      res.status(500).json(response);
    }
  }

  async listUsers(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const { page = '1', limit = '10', active } = req.query;

      if (!user || !user.userId) {
        const response: AuthResponse = {
          success: false,
          message: 'Usuario no autenticado'
        };
        res.status(401).json(response);
        return;
      }

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;
      
      // Validar límites de paginación
      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        const response: AuthResponse = {
          success: false,
          message: 'Parámetros de paginación inválidos'
        };
        res.status(400).json(response);
        return;
      }

      let activeFilter: boolean | undefined;
      if (active !== undefined) {
        if (active === 'true') {
          activeFilter = true;
        } else if (active === 'false') {
          activeFilter = false;
        }
      }

      const result = await this.usuarioService.listUsers(
        user.userId,
        pageNum,
        limitNum,
        activeFilter
      );

      const response = {
        success: true,
        message: 'Usuarios obtenidos exitosamente',
        data: result
      };

      res.json(response);
    } catch (error) {
      console.error('Error al listar usuarios:', error);
      const response: AuthResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Error al listar usuarios'
      };
      res.status(500).json(response);
    }
  }
}