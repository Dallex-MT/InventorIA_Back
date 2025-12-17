import { pool } from '../../../shared/utils/database';
import { RolCreateDTO, RolUpdateDTO } from '../models/Rol';
import { RowDataPacket } from 'mysql2';
import { RolService } from '../services/RolService';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../../shared/middleware/auth';

export class RolController {

  static async getAllRoles(req: Request, res: Response): Promise<Response> {
    try {
      const { page = '1', limit = '10', active } = req.query;

      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(limit as string) || 10));

      // Validar límites de paginación
      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
          success: false,
          message: 'Parámetros de paginación inválidos'
        });
      }

      let activeFilter: boolean | undefined;
      if (active !== undefined) {
        if (active === 'true') {
          activeFilter = true;
        } else if (active === 'false') {
          activeFilter = false;
        }
      }

      const result = await RolService.getAllRoles(pageNum, limitNum, activeFilter);

      return res.json({
        success: true,
        data: result,
        message: 'Roles obtenidos exitosamente'
      });
    } catch (error) {
      console.error('Error al obtener roles:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener roles',
      });
    }
  }

  static async getAllPermisos(_req: Request, res: Response): Promise<Response> {
    try {
      const permisos = await RolService.getAllPermisos();

      return res.json({
        success: true,
        data: permisos,
        message: 'Permisos obtenidos exitosamente'
      });
    } catch (error) {
      console.error('Error al obtener permisos:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener permisos',
      });
    }
  }

  static async getRoleById(req: Request, res: Response): Promise<Response> {
    try {
      const id = parseInt(req.params['id'] as string);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de rol inválido'
        });
      }

      const role = await RolService.getRoleById(id);

      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Rol no encontrado'
        });
      }

      return res.json({
        success: true,
        data: role,
        message: 'Rol obtenido exitosamente'
      });
    } catch (error) {
      console.error('Error al obtener rol:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener rol',
      });
    }
  }

  static async createRole(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { nombre, descripcion, activo, permisos_ids }: RolCreateDTO = req.body;

      // Validación básica
      if (!nombre || nombre.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'El nombre del rol es requerido'
        });
      }

      if (nombre.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'El nombre del rol no puede exceder 50 caracteres'
        });
      }

      // Validar que permisos_ids sea un array si se proporciona
      if (permisos_ids !== undefined && !Array.isArray(permisos_ids)) {
        return res.status(400).json({
          success: false,
          message: 'permisos_ids debe ser un array de números'
        });
      }

      // Validar que todos los elementos del array sean números válidos
      if (permisos_ids && permisos_ids.length > 0) {
        const invalidPermisos = permisos_ids.filter(id => !Number.isInteger(id) || id <= 0);
        if (invalidPermisos.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Todos los IDs de permisos deben ser números enteros positivos'
          });
        }
      }

      // Verificar si el rol ya existe
      const existingRole = await RolService.getRoleByNombre(nombre.trim());
      if (existingRole) {
        return res.status(409).json({
          success: false,
          message: 'Ya existe un rol con ese nombre'
        });
      }

      const roleData: RolCreateDTO = {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || '',
        activo: activo !== undefined ? activo : true,
        permisos_ids: permisos_ids || []
      };

      const newRole = await RolService.createRole(roleData);

      return res.status(201).json({
        success: true,
        data: newRole,
        message: 'Rol creado exitosamente'
      });
    } catch (error) {
      console.error('Error al crear rol:', error);
      
      let errorMessage = 'Error al crear rol';
      if (error instanceof Error) {
        if (error.message.includes('Algunos permisos no existen')) {
          errorMessage = error.message;
        } else {
          errorMessage = error.message;
        }
      }
      
      return res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  static async updateRole(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const id = parseInt(req.params['id'] as string);
      const { nombre, descripcion, activo, permisos_ids }: RolUpdateDTO = req.body;

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de rol inválido'
        });
      }

      // Validar que el rol existe
      const existingRole = await RolService.getRoleById(id);
      if (!existingRole) {
        return res.status(404).json({
          success: false,
          message: 'Rol no encontrado'
        });
      }

      // Validar nombre si se está actualizando
      if (nombre !== undefined) {
        if (nombre.trim().length === 0) {
          return res.status(400).json({
            success: false,
            message: 'El nombre del rol no puede estar vacío'
          });
        }

        if (nombre.length > 50) {
          return res.status(400).json({
            success: false,
            message: 'El nombre del rol no puede exceder 50 caracteres'
          });
        }

        // Verificar si ya existe otro rol con ese nombre
        const roleWithSameName = await RolService.getRoleByNombre(nombre.trim());
        if (roleWithSameName && roleWithSameName.id !== id) {
          return res.status(409).json({
            success: false,
            message: 'Ya existe otro rol con ese nombre'
          });
        }
      }

      // Validación de permisos_ids
      if (permisos_ids !== undefined && !Array.isArray(permisos_ids)) {
        return res.status(400).json({
          success: false,
          message: 'Los permisos debe ser un array de números'
        });
      }
      if (permisos_ids && permisos_ids.length > 0) {
        const invalidPermisos = permisos_ids.filter(id => !Number.isInteger(id) || id <= 0);
        if (invalidPermisos.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Todos los IDs de permisos deben ser números enteros positivos'
          });
        }
      }

      const roleData: RolUpdateDTO = {};
      if (nombre !== undefined) roleData.nombre = nombre.trim();
      if (descripcion !== undefined) roleData.descripcion = descripcion.trim() || '';
      if (activo !== undefined) roleData.activo = activo;
      if (permisos_ids !== undefined) roleData.permisos_ids = permisos_ids;

      const updatedRole = await RolService.updateRole(id, roleData);

      return res.json({
        success: true,
        data: updatedRole,
        message: 'Rol actualizado exitosamente'
      });
    } catch (error) {
      console.error('Error al actualizar rol:', error);
      let errorMessage = 'Error al actualizar rol';
      if (error instanceof Error) {
        if (error.message.includes('Algunos permisos no existen')) {
          errorMessage = error.message;
        } else {
          errorMessage = error.message;
        }
      }
      return res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  static async deleteRole(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const id = parseInt(req.params['id'] as string);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de rol inválido'
        });
      }

      // Validar que el rol existe
      const existingRole = await RolService.getRoleById(id);
      if (!existingRole) {
        return res.status(404).json({
          success: false,
          message: 'Rol no encontrado'
        });
      }

      // Verificar si hay usuarios con este rol antes de eliminar
      const [usersWithRole] = await pool.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as total FROM usuarios WHERE rol_id = ? AND activo = 1',
        [id]
      );

      if (usersWithRole[0]?.['total'] > 0) {
        return res.status(409).json({
          success: false,
          message: 'No se puede eliminar el rol porque hay usuarios asignados a él'
        });
      }

      const deleted = await RolService.deleteRole(id);

      if (!deleted) {
        return res.status(500).json({
          success: false,
          message: 'Error al eliminar rol'
        });
      }

      return res.json({
        success: true,
        message: 'Rol eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar rol:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar rol',
      });
    }
  }

  static async getRoleStats(_req: Request, res: Response): Promise<Response> {
    try {
      const totalRoles = await RolService.countActiveRoles();

      return res.json({
        success: true,
        data: {
          totalRolesActivos: totalRoles
        },
        message: 'Estadísticas de roles obtenidas exitosamente'
      });
    } catch (error) {
      console.error('Error al obtener estadísticas de roles:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas de roles',
      });
    }
  }
}