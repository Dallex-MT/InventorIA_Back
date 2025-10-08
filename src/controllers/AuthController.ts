import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { UsuarioService } from '../services/UsuarioService';
import { generateToken, setTokenCookie, clearTokenCookie } from '../utils/jwt';
import { comparePassword } from '../utils/password';
import { validatePassword } from '../utils/password';
import { 
  validateEmail, 
  validateNombreUsuario, 
  validateRolId 
} from '../utils/validation';
import { UsuarioRegistroDTO, AuthResponse, JWTPayload } from '../models/Usuario';

export class AuthController {
  private usuarioService: UsuarioService;

  constructor() {
    this.usuarioService = new UsuarioService();
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const { nombre_usuario, correo, password, rol_id } = req.body;

      if (!nombre_usuario || !correo || !password || !rol_id) {
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

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        const response: AuthResponse = {
          success: false,
          message: `Contraseña inválida: ${passwordValidation.errors.join(', ')}`
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
      const { nombre_usuario, correo } = req.body;

      if (!user || !user.userId) {
        const response: AuthResponse = {
          success: false,
          message: 'Usuario no autenticado'
        };
        res.status(401).json(response);
        return;
      }

      if (!nombre_usuario && !correo) {
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

      const updatedUser = await this.usuarioService.update(user.userId, updateData);
      if (!updatedUser) {
        const response: AuthResponse = {
          success: false,
          message: 'Usuario no encontrado'
        };
        res.status(404).json(response);
        return;
      }

      const safeUser = this.usuarioService.toSafeUser(updatedUser);

      const response: AuthResponse = {
        success: true,
        message: 'Perfil actualizado exitosamente',
        user: safeUser
      };
      res.json(response);
    } catch (error) {
      console.error('Error in updateProfile:', error);
      const response: AuthResponse = {
        success: false,
        message: 'Error al actualizar el perfil'
      };
      res.status(500).json(response);
    }
  }
}