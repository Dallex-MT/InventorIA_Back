import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2/promise';
import { DetalleFacturaService } from '../services/DetalleFacturaService';
import { DetalleFacturaCreateDTO, DetalleFacturaUpdateDTO } from '../models/DetalleFactura';
import { AuthenticatedRequest } from '../middleware/auth';
import { pool } from '../utils/database';

export class DetalleFacturaController {
  
  static async getAllDetallesFactura(_req: Request, res: Response): Promise<Response> {
    try {
      const detalles = await DetalleFacturaService.getAllDetallesFactura();
      
      return res.json({
        success: true,
        data: detalles,
        message: 'Detalles de factura obtenidos exitosamente'
      });
    } catch (error) {
      console.error('Error al obtener detalles de factura:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener detalles de factura',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async getDetalleFacturaById(req: Request, res: Response): Promise<Response> {
    try {
      const id = parseInt(req.params['id'] as string);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de detalle de factura inválido'
        });
      }
      
      const detalle = await DetalleFacturaService.getDetalleFacturaById(id);
      
      if (!detalle) {
        return res.status(404).json({
          success: false,
          message: 'Detalle de factura no encontrado'
        });
      }
      
      return res.json({
        success: true,
        data: detalle,
        message: 'Detalle de factura obtenido exitosamente'
      });
    } catch (error) {
      console.error('Error al obtener detalle de factura:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener detalle de factura',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async getDetallesByFacturaId(req: Request, res: Response): Promise<Response> {
    try {
      const factura_id = parseInt(req.params['factura_id'] as string);
      
      if (isNaN(factura_id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de factura inválido'
        });
      }
      
      const detalles = await DetalleFacturaService.getDetallesByFacturaId(factura_id);
      
      return res.json({
        success: true,
        data: detalles,
        message: `Detalles de factura para la factura ${factura_id} obtenidos exitosamente`
      });
    } catch (error) {
      console.error('Error al obtener detalles por factura:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener detalles por factura',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async getDetallesByProductoId(req: Request, res: Response): Promise<Response> {
    try {
      const producto_id = parseInt(req.params['producto_id'] as string);
      
      if (isNaN(producto_id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de producto inválido'
        });
      }
      
      const detalles = await DetalleFacturaService.getDetallesByProductoId(producto_id);
      
      return res.json({
        success: true,
        data: detalles,
        message: `Detalles de factura para el producto ${producto_id} obtenidos exitosamente`
      });
    } catch (error) {
      console.error('Error al obtener detalles por producto:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener detalles por producto',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async createDetalleFactura(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { factura_id, producto_id, cantidad, precio_unitario }: DetalleFacturaCreateDTO = req.body;
      
      // Validación básica
      if (!factura_id || !producto_id || !cantidad || !precio_unitario) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos: factura_id, producto_id, cantidad, precio_unitario'
        });
      }
      
      if (cantidad <= 0) {
        return res.status(400).json({
          success: false,
          message: 'La cantidad debe ser mayor que 0'
        });
      }
      
      if (precio_unitario < 0) {
        return res.status(400).json({
          success: false,
          message: 'El precio unitario debe ser mayor o igual que 0'
        });
      }
      
      // Verificar si ya existe un detalle para la misma factura y producto
      const existingDetalle = await DetalleFacturaService.getDetalleByFacturaAndProducto(factura_id, producto_id);
      if (existingDetalle) {
        return res.status(409).json({
          success: false,
          message: 'Ya existe un detalle para esta factura y producto'
        });
      }
      
      // Verificar que la factura existe
      const [facturaRows] = await pool.execute<RowDataPacket[]>(
        'SELECT id FROM facturas_internas WHERE id = ?',
        [factura_id]
      );
      
      if (facturaRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'La factura especificada no existe'
        });
      }
      
      // Verificar que el producto existe
      const [productoRows] = await pool.execute<RowDataPacket[]>(
        'SELECT id FROM productos WHERE id = ?',
        [producto_id]
      );
      
      if (productoRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'El producto especificado no existe'
        });
      }
      
      const detalleData: DetalleFacturaCreateDTO = {
        factura_id,
        producto_id,
        cantidad,
        precio_unitario
      };
      
      const newDetalle = await DetalleFacturaService.createDetalleFactura(detalleData);
      
      return res.status(201).json({
        success: true,
        data: newDetalle,
        message: 'Detalle de factura creado exitosamente'
      });
    } catch (error) {
      console.error('Error al crear detalle de factura:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al crear detalle de factura',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async updateDetalleFactura(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const id = parseInt(req.params['id'] as string);
      const { factura_id, producto_id, cantidad, precio_unitario }: DetalleFacturaUpdateDTO = req.body;
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de detalle de factura inválido'
        });
      }
      
      // Validar que el detalle existe
      const existingDetalle = await DetalleFacturaService.getDetalleFacturaById(id);
      if (!existingDetalle) {
        return res.status(404).json({
          success: false,
          message: 'Detalle de factura no encontrado'
        });
      }
      
      // Validaciones de campos si se están actualizando
      if (cantidad !== undefined && cantidad <= 0) {
        return res.status(400).json({
          success: false,
          message: 'La cantidad debe ser mayor que 0'
        });
      }
      
      if (precio_unitario !== undefined && precio_unitario < 0) {
        return res.status(400).json({
          success: false,
          message: 'El precio unitario debe ser mayor o igual que 0'
        });
      }
      
      // Si se están cambiando factura y producto, verificar que no exista duplicado
      if (factura_id !== undefined && producto_id !== undefined) {
        const duplicateDetalle = await DetalleFacturaService.getDetalleByFacturaAndProducto(factura_id, producto_id);
        if (duplicateDetalle && duplicateDetalle.id !== id) {
          return res.status(409).json({
            success: false,
            message: 'Ya existe un detalle para esta factura y producto'
          });
        }
      } else if (factura_id !== undefined) {
        // Si solo se cambia la factura, verificar duplicado con el producto actual
        const duplicateDetalle = await DetalleFacturaService.getDetalleByFacturaAndProducto(factura_id, existingDetalle.producto_id);
        if (duplicateDetalle && duplicateDetalle.id !== id) {
          return res.status(409).json({
            success: false,
            message: 'Ya existe un detalle para esta factura y producto'
          });
        }
      } else if (producto_id !== undefined) {
        // Si solo se cambia el producto, verificar duplicado con la factura actual
        const duplicateDetalle = await DetalleFacturaService.getDetalleByFacturaAndProducto(existingDetalle.factura_id, producto_id);
        if (duplicateDetalle && duplicateDetalle.id !== id) {
          return res.status(409).json({
            success: false,
            message: 'Ya existe un detalle para esta factura y producto'
          });
        }
      }
      
      // Verificar que la factura existe si se está actualizando
      if (factura_id !== undefined) {
        const [facturaRows] = await pool.execute<RowDataPacket[]>(
          'SELECT id FROM facturas_internas WHERE id = ?',
          [factura_id]
        );
        
        if (facturaRows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'La factura especificada no existe'
          });
        }
      }
      
      // Verificar que el producto existe si se está actualizando
      if (producto_id !== undefined) {
        const [productoRows] = await pool.execute<RowDataPacket[]>(
          'SELECT id FROM productos WHERE id = ?',
          [producto_id]
        );
        
        if (productoRows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'El producto especificado no existe'
          });
        }
      }
      
      const detalleData: DetalleFacturaUpdateDTO = {};
      if (factura_id !== undefined) detalleData.factura_id = factura_id;
      if (producto_id !== undefined) detalleData.producto_id = producto_id;
      if (cantidad !== undefined) detalleData.cantidad = cantidad;
      if (precio_unitario !== undefined) detalleData.precio_unitario = precio_unitario;
      
      const updatedDetalle = await DetalleFacturaService.updateDetalleFactura(id, detalleData);
      
      return res.json({
        success: true,
        data: updatedDetalle,
        message: 'Detalle de factura actualizado exitosamente'
      });
    } catch (error) {
      console.error('Error al actualizar detalle de factura:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar detalle de factura',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async deleteDetalleFactura(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const id = parseInt(req.params['id'] as string);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de detalle de factura inválido'
        });
      }
      
      // Validar que el detalle existe
      const existingDetalle = await DetalleFacturaService.getDetalleFacturaById(id);
      if (!existingDetalle) {
        return res.status(404).json({
          success: false,
          message: 'Detalle de factura no encontrado'
        });
      }
      
      const deleted = await DetalleFacturaService.deleteDetalleFactura(id);
      
      if (!deleted) {
        return res.status(500).json({
          success: false,
          message: 'Error al eliminar el detalle de factura'
        });
      }
      
      return res.json({
        success: true,
        message: 'Detalle de factura eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar detalle de factura:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar detalle de factura',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }
}