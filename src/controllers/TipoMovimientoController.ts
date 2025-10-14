import { Request, Response } from 'express';
import { TipoMovimientoService } from '../services/TipoMovimientoService';
import { TipoMovimientoCreateDTO, TipoMovimientoUpdateDTO } from '../models/TipoMovimiento';
import { AuthenticatedRequest } from '../middleware/auth';

export class TipoMovimientoController {
  
  static async getAllTiposMovimiento(_req: Request, res: Response): Promise<Response> {
    try {
      const tiposMovimiento = await TipoMovimientoService.getAllTiposMovimiento();
      
      return res.json({
        success: true,
        data: tiposMovimiento,
        message: 'Tipos de movimiento obtenidos exitosamente'
      });
    } catch (error) {
      console.error('Error al obtener tipos de movimiento:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener tipos de movimiento',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async getTipoMovimientoById(req: Request, res: Response): Promise<Response> {
    try {
      const id = parseInt(req.params['id'] as string);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de tipo de movimiento inválido'
        });
      }
      
      const tipoMovimiento = await TipoMovimientoService.getTipoMovimientoById(id);
      
      if (!tipoMovimiento) {
        return res.status(404).json({
          success: false,
          message: 'Tipo de movimiento no encontrado'
        });
      }
      
      return res.json({
        success: true,
        data: tipoMovimiento,
        message: 'Tipo de movimiento obtenido exitosamente'
      });
    } catch (error) {
      console.error('Error al obtener tipo de movimiento:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener tipo de movimiento',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async getTiposMovimientoByAfectaStock(req: Request, res: Response): Promise<Response> {
    try {
      const afectaStock = req.params['afectaStock'] as string;
      
      if (afectaStock !== 'ENTRADA' && afectaStock !== 'SALIDA') {
        return res.status(400).json({
          success: false,
          message: 'El valor de afecta_stock debe ser ENTRADA o SALIDA'
        });
      }
      
      const tiposMovimiento = await TipoMovimientoService.getTiposMovimientoByAfectaStock(afectaStock as 'ENTRADA' | 'SALIDA');
      
      return res.json({
        success: true,
        data: tiposMovimiento,
        message: 'Tipos de movimiento por tipo de stock obtenidos exitosamente'
      });
    } catch (error) {
      console.error('Error al obtener tipos de movimiento por afecta_stock:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener tipos de movimiento por afecta_stock',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async createTipoMovimiento(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { nombre, descripcion, afecta_stock }: TipoMovimientoCreateDTO = req.body;
      
      // Validación básica
      if (!nombre || nombre.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'El nombre del tipo de movimiento es requerido'
        });
      }
      
      if (nombre.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'El nombre del tipo de movimiento no puede exceder 50 caracteres'
        });
      }
      
      if (!afecta_stock) {
        return res.status(400).json({
          success: false,
          message: 'El campo afecta_stock es requerido'
        });
      }
      
      if (afecta_stock !== 'ENTRADA' && afecta_stock !== 'SALIDA') {
        return res.status(400).json({
          success: false,
          message: 'El campo afecta_stock debe ser ENTRADA o SALIDA'
        });
      }
      
      // Verificar si el tipo de movimiento ya existe
      const existingTipoMovimiento = await TipoMovimientoService.getTipoMovimientoByNombre(nombre.trim());
      if (existingTipoMovimiento) {
        return res.status(409).json({
          success: false,
          message: 'Ya existe un tipo de movimiento con ese nombre'
        });
      }
      
      const tipoMovimientoData: TipoMovimientoCreateDTO = {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || '',
        afecta_stock: afecta_stock
      };
      
      const newTipoMovimiento = await TipoMovimientoService.createTipoMovimiento(tipoMovimientoData);
      
      return res.status(201).json({
        success: true,
        data: newTipoMovimiento,
        message: 'Tipo de movimiento creado exitosamente'
      });
    } catch (error) {
      console.error('Error al crear tipo de movimiento:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al crear tipo de movimiento',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async updateTipoMovimiento(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const id = parseInt(req.params['id'] as string);
      const { nombre, descripcion, afecta_stock }: TipoMovimientoUpdateDTO = req.body;
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de tipo de movimiento inválido'
        });
      }
      
      // Validar que el tipo de movimiento existe
      const existingTipoMovimiento = await TipoMovimientoService.getTipoMovimientoById(id);
      if (!existingTipoMovimiento) {
        return res.status(404).json({
          success: false,
          message: 'Tipo de movimiento no encontrado'
        });
      }
      
      // Validar nombre si se está actualizando
      if (nombre !== undefined) {
        if (nombre.trim().length === 0) {
          return res.status(400).json({
            success: false,
            message: 'El nombre del tipo de movimiento no puede estar vacío'
          });
        }
        
        if (nombre.length > 50) {
          return res.status(400).json({
            success: false,
            message: 'El nombre del tipo de movimiento no puede exceder 50 caracteres'
          });
        }
        
        // Verificar si ya existe otro tipo de movimiento con ese nombre
        const tipoMovimientoWithSameName = await TipoMovimientoService.getTipoMovimientoByNombre(nombre.trim());
        if (tipoMovimientoWithSameName && tipoMovimientoWithSameName.id !== id) {
          return res.status(409).json({
            success: false,
            message: 'Ya existe otro tipo de movimiento con ese nombre'
          });
        }
      }
      
      // Validar afecta_stock si se está actualizando
      if (afecta_stock !== undefined) {
        if (afecta_stock !== 'ENTRADA' && afecta_stock !== 'SALIDA') {
          return res.status(400).json({
            success: false,
            message: 'El campo afecta_stock debe ser ENTRADA o SALIDA'
          });
        }
      }
      
      const tipoMovimientoData: TipoMovimientoUpdateDTO = {};
      if (nombre !== undefined) tipoMovimientoData.nombre = nombre.trim();
      if (descripcion !== undefined) tipoMovimientoData.descripcion = descripcion.trim() || '';
      if (afecta_stock !== undefined) tipoMovimientoData.afecta_stock = afecta_stock;
      
      const updatedTipoMovimiento = await TipoMovimientoService.updateTipoMovimiento(id, tipoMovimientoData);
      
      return res.json({
        success: true,
        data: updatedTipoMovimiento,
        message: 'Tipo de movimiento actualizado exitosamente'
      });
    } catch (error) {
      console.error('Error al actualizar tipo de movimiento:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar tipo de movimiento',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async deleteTipoMovimiento(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const id = parseInt(req.params['id'] as string);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de tipo de movimiento inválido'
        });
      }
      
      // Validar que el tipo de movimiento existe
      const existingTipoMovimiento = await TipoMovimientoService.getTipoMovimientoById(id);
      if (!existingTipoMovimiento) {
        return res.status(404).json({
          success: false,
          message: 'Tipo de movimiento no encontrado'
        });
      }
      
      const deleted = await TipoMovimientoService.deleteTipoMovimiento(id);
      
      if (!deleted) {
        return res.status(500).json({
          success: false,
          message: 'Error al eliminar tipo de movimiento'
        });
      }
      
      return res.json({
        success: true,
        message: 'Tipo de movimiento eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar tipo de movimiento:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar tipo de movimiento',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async getTipoMovimientoStats(_req: Request, res: Response): Promise<Response> {
    try {
      const totalTiposMovimiento = await TipoMovimientoService.countTiposMovimiento();
      const tiposEntrada = await TipoMovimientoService.countTiposMovimientoByAfectaStock('ENTRADA');
      const tiposSalida = await TipoMovimientoService.countTiposMovimientoByAfectaStock('SALIDA');
      
      return res.json({
        success: true,
        data: {
          totalTiposMovimiento,
          totalTiposEntrada: tiposEntrada,
          totalTiposSalida: tiposSalida
        },
        message: 'Estadísticas de tipos de movimiento obtenidas exitosamente'
      });
    } catch (error) {
      console.error('Error al obtener estadísticas de tipos de movimiento:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas de tipos de movimiento',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }
}