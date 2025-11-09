import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2/promise';
import { CategoriaService } from '../services/CategoriaService';
import { CategoriaCreateDTO, CategoriaUpdateDTO } from '../models/Categoria';
import { AuthenticatedRequest } from '../middleware/auth';
import { pool } from '../utils/database';

export class CategoriaController {
  
  static async getAllCategorias(req: Request, res: Response): Promise<Response> {
    try {
      const { page = '1', limit = '10', active } = req.query;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;
      
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

      const result = await CategoriaService.getAllCategorias(pageNum, limitNum, activeFilter);
      
      return res.json({
        success: true,
        message: 'Categorías obtenidas exitosamente',
        data: {
          categories: result.categorias,
          pagination: {
            total: result.total,
            page: result.page,
            totalPages: result.totalPages,
            limit: limitNum
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener categorías:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener categorías',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async getCategoriaById(req: Request, res: Response): Promise<Response> {
    try {
      const id = parseInt(req.params['id'] as string);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de categoría inválido'
        });
      }
      
      const categoria = await CategoriaService.getCategoriaById(id);
      
      if (!categoria) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }
      
      return res.json({
        success: true,
        data: categoria,
        message: 'Categoría obtenida exitosamente'
      });
    } catch (error) {
      console.error('Error al obtener categoría:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener categoría',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async createCategoria(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { nombre, descripcion, activo }: CategoriaCreateDTO = req.body;
      
      // Validación básica
      if (!nombre || nombre.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'El nombre de la categoría es requerido'
        });
      }
      
      if (nombre.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'El nombre de la categoría no puede exceder 100 caracteres'
        });
      }
      
      // Verificar si la categoría ya existe
      const existingCategoria = await CategoriaService.getCategoriaByNombre(nombre.trim());
      if (existingCategoria) {
        return res.status(409).json({
          success: false,
          message: 'Ya existe una categoría con ese nombre'
        });
      }
      
      const categoriaData: CategoriaCreateDTO = {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || '',
        activo: activo !== undefined ? activo : true
      };
      
      const newCategoria = await CategoriaService.createCategoria(categoriaData);
      
      return res.status(201).json({
        success: true,
        data: newCategoria,
        message: 'Categoría creada exitosamente'
      });
    } catch (error) {
      console.error('Error al crear categoría:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al crear categoría',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async updateCategoria(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const id = parseInt(req.params['id'] as string);
      const { nombre, descripcion, activo }: CategoriaUpdateDTO = req.body;
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de categoría inválido'
        });
      }
      
      // Validar que la categoría existe
      const existingCategoria = await CategoriaService.getCategoriaById(id);
      if (!existingCategoria) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }
      
      // Validar nombre si se está actualizando
      if (nombre !== undefined) {
        if (nombre.trim().length === 0) {
          return res.status(400).json({
            success: false,
            message: 'El nombre de la categoría no puede estar vacío'
          });
        }
        
        if (nombre.length > 100) {
          return res.status(400).json({
            success: false,
            message: 'El nombre de la categoría no puede exceder 100 caracteres'
          });
        }
        
        // Verificar si ya existe otra categoría con ese nombre
        const categoriaWithSameName = await CategoriaService.getCategoriaByNombre(nombre.trim());
        if (categoriaWithSameName && categoriaWithSameName.id !== id) {
          return res.status(409).json({
            success: false,
            message: 'Ya existe otra categoría con ese nombre'
          });
        }
      }
      
      const categoriaData: CategoriaUpdateDTO = {};
      if (nombre !== undefined) categoriaData.nombre = nombre.trim();
      if (descripcion !== undefined) categoriaData.descripcion = descripcion.trim() || '';
      if (activo !== undefined) categoriaData.activo = activo;
      
      const updatedCategoria = await CategoriaService.updateCategoria(id, categoriaData);
      
      return res.json({
        success: true,
        data: updatedCategoria,
        message: 'Categoría actualizada exitosamente'
      });
    } catch (error) {
      console.error('Error al actualizar categoría:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar categoría',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async deleteCategoria(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const id = parseInt(req.params['id'] as string);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de categoría inválido'
        });
      }
      
      // Validar que la categoría existe
      const existingCategoria = await CategoriaService.getCategoriaById(id);
      if (!existingCategoria) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }
      
      // Verificar si hay productos con esta categoría antes de eliminar
      const [productsWithCategory] = await pool.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as total FROM productos WHERE categoria_id = ? AND activo = 1',
        [id]
      );
      
      if (productsWithCategory[0]?.['total'] > 0) {
        return res.status(409).json({
          success: false,
          message: 'No se puede eliminar la categoría porque hay productos asignados a ella'
        });
      }
      
      const deleted = await CategoriaService.deleteCategoria(id);
      
      if (!deleted) {
        return res.status(500).json({
          success: false,
          message: 'Error al eliminar categoría'
        });
      }
      
      return res.json({
        success: true,
        message: 'Categoría eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar categoría',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async getCategoriaStats(_req: Request, res: Response): Promise<Response> {
    try {
      const totalCategorias = await CategoriaService.countActiveCategorias();
      
      return res.json({
        success: true,
        data: {
          totalCategoriasActivas: totalCategorias
        },
        message: 'Estadísticas de categorías obtenidas exitosamente'
      });
    } catch (error) {
      console.error('Error al obtener estadísticas de categorías:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas de categorías',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }
}