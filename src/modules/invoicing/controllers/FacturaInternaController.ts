import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2/promise';
import { FacturaInternaService } from '../services/FacturaInternaService';
import { FacturaInternaCreateDTO, FacturaInternaUpdateDTO } from '../models/FacturaInterna';
import { DetalleFacturaCreateDTO } from '../models/DetalleFactura';
import { AuthenticatedRequest } from '../../../shared/middleware/auth';
import { pool } from '../../../shared/utils/database';

export class FacturaInternaController {

  static async getAllFacturasInternas(req: Request, res: Response): Promise<Response> {
    try {
      // Obtener parámetros de consulta
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 10;
      const estadoFilter = req.query['estado'] as 'BORRADOR' | 'CONFIRMADA' | 'ANULADA' | undefined;
      const searchText = req.query['search'] as string | undefined;
      const fechaInicio = req.query['fecha_inicio'] as string | undefined;
      const fechaFin = req.query['fecha_fin'] as string | undefined;

      // Validar parámetros
      // if (page < 1 || limit < 1 || limit > 1000) {
      //   return res.status(400).json({
      //     success: false,
      //     message: 'Parámetros de paginación inválidos. La página debe ser >= 1 y el límite debe estar entre 1 y 1000'
      //   });
      // }

      // Validar estado si se proporciona
      if (estadoFilter && !['BORRADOR', 'CONFIRMADA', 'ANULADA'].includes(estadoFilter)) {
        return res.status(400).json({
          success: false,
          message: 'Estado inválido. Debe ser BORRADOR, CONFIRMADA o ANULADA'
        });
      }

      // Obtener facturas con paginación y filtros
      const result = await FacturaInternaService.getAllFacturasInternas(
        page, 
        limit, 
        estadoFilter,
        searchText,
        fechaInicio,
        fechaFin
      );

      return res.json({
        success: true,
        data: {
          invoices: result.facturas,
          pagination: {
            total: result.total,
            page: result.page,
            totalPages: result.totalPages,
            limit: limit
          }
        },
        message: 'Facturas internas obtenidas exitosamente'
      });
    } catch (error) {
      console.error('Error al obtener facturas internas:', error);
      
      // Manejar errores de validación de fecha
      if (error instanceof Error && error.message.includes('Formato de fecha')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      // Manejar error de lógica de fechas
      if (error instanceof Error && error.message.includes('fecha de inicio debe ser menor')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Error al obtener facturas internas',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async getFacturaInternaById(req: Request, res: Response): Promise<Response> {
    try {
      const id = parseInt(req.params['id'] as string);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de factura interna inválido'
        });
      }

      const factura = await FacturaInternaService.getFacturaInternaById(id);

      if (!factura) {
        return res.status(404).json({
          success: false,
          message: 'Factura interna no encontrada'
        });
      }

      return res.json({
        success: true,
        data: factura,
        message: 'Factura interna obtenida exitosamente'
      });
    } catch (error) {
      console.error('Error al obtener factura interna:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener factura interna',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async getFacturasByEstado(req: Request, res: Response): Promise<Response> {
    try {
      const estado = req.params['estado'] as 'BORRADOR' | 'CONFIRMADA' | 'ANULADA';

      if (!['BORRADOR', 'CONFIRMADA', 'ANULADA'].includes(estado)) {
        return res.status(400).json({
          success: false,
          message: 'Estado inválido. Debe ser BORRADOR, CONFIRMADA o ANULADA'
        });
      }

      const facturas = await FacturaInternaService.getFacturasByEstado(estado);

      return res.json({
        success: true,
        data: facturas,
        message: `Facturas ${estado.toLowerCase()} obtenidas exitosamente`
      });
    } catch (error) {
      console.error('Error al obtener facturas por estado:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener facturas por estado',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async getFacturasByTipoMovimiento(req: Request, res: Response): Promise<Response> {
    try {
      const tipo_movimiento_id = parseInt(req.params['tipo_movimiento_id'] as string);

      if (isNaN(tipo_movimiento_id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de tipo de movimiento inválido'
        });
      }

      const facturas = await FacturaInternaService.getFacturasByTipoMovimiento(tipo_movimiento_id);

      return res.json({
        success: true,
        data: facturas,
        message: 'Facturas por tipo de movimiento obtenidas exitosamente'
      });
    } catch (error) {
      console.error('Error al obtener facturas por tipo de movimiento:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener facturas por tipo de movimiento',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async createFacturaInterna(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const {
        codigo_interno,
        tipo_movimiento_id,
        concepto,
        usuario_responsable_id,
        fecha_movimiento,
        total,
        observaciones,
        estado,
        detalles
      }: FacturaInternaCreateDTO & { detalles?: Omit<DetalleFacturaCreateDTO, 'factura_id'>[] } = req.body;

      // Validación básica
      if (!codigo_interno || codigo_interno.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'El código interno es requerido'
        });
      }

      if (codigo_interno.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'El código interno no puede exceder 50 caracteres'
        });
      }

      if (!concepto || concepto.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'El concepto es requerido'
        });
      }

      if (!tipo_movimiento_id || isNaN(tipo_movimiento_id)) {
        return res.status(400).json({
          success: false,
          message: 'El tipo de movimiento es requerido y debe ser un número válido'
        });
      }

      if (!usuario_responsable_id || isNaN(usuario_responsable_id)) {
        return res.status(400).json({
          success: false,
          message: 'El usuario responsable es requerido y debe ser un número válido'
        });
      }

      if (!fecha_movimiento) {
        return res.status(400).json({
          success: false,
          message: 'La fecha de movimiento es requerida'
        });
      }

      // Validar detalles
      if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere un array de detalles de factura con al menos un ítem'
        });
      }

      for (const detalle of detalles) {
        if (!detalle.producto_id || detalle.cantidad === undefined || detalle.precio_unitario === undefined) {
          return res.status(400).json({
            success: false,
            message: 'Cada detalle debe tener producto_id, cantidad y precio_unitario'
          });
        }
        if (detalle.cantidad <= 0) {
          return res.status(400).json({
            success: false,
            message: 'La cantidad debe ser mayor a 0'
          });
        }
        if (detalle.precio_unitario < 0) {
          return res.status(400).json({
            success: false,
            message: 'El precio unitario no puede ser negativo'
          });
        }
      }

      // Validar que el código interno no exista
      const existingFactura = await FacturaInternaService.getFacturaInternaByCodigo(codigo_interno.trim());
      if (existingFactura) {
        return res.status(409).json({
          success: false,
          message: 'Ya existe una factura interna con ese código'
        });
      }

      // Validar que el tipo de movimiento exista
      const [tipoMovimiento] = await pool.execute<RowDataPacket[]>(
        'SELECT id FROM tipos_movimiento WHERE id = ?',
        [tipo_movimiento_id]
      );

      if (tipoMovimiento.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'El tipo de movimiento especificado no existe'
        });
      }

      // Validar que el usuario exista
      const [usuario] = await pool.execute<RowDataPacket[]>(
        'SELECT id FROM usuarios WHERE id = ?',
        [usuario_responsable_id]
      );

      if (usuario.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'El usuario responsable especificado no existe'
        });
      }

      // Validar estado
      if (estado && !['BORRADOR', 'CONFIRMADA', 'ANULADA'].includes(estado)) {
        return res.status(400).json({
          success: false,
          message: 'Estado inválido. Debe ser BORRADOR, CONFIRMADA o ANULADA'
        });
      }

      const facturaData: FacturaInternaCreateDTO = {
        codigo_interno: codigo_interno.trim(),
        tipo_movimiento_id,
        concepto: concepto.trim(),
        usuario_responsable_id,
        fecha_movimiento,
        total: total !== undefined ? total : 0,
        observaciones: observaciones?.trim() || '',
        estado: estado || 'BORRADOR'
      };

      const result = await FacturaInternaService.createFacturaWithDetails(facturaData, detalles);

      return res.status(201).json({
        success: true,
        data: result.factura,
        detallesProcessed: result.detallesCount,
        message: 'Factura interna creada exitosamente con sus detalles'
      });
    } catch (error) {
      console.error('Error al crear factura interna:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al crear factura interna',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  /**
   * @swagger
   * /facturas-internas/{id}:
   *   put:
   *     summary: Actualiza una factura interna existente y sus detalles
   *     tags: [Facturas Internas]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID de la factura interna
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               codigo_interno:
   *                 type: string
   *               tipo_movimiento_id:
   *                 type: integer
   *               concepto:
   *                 type: string
   *               usuario_responsable_id:
   *                 type: integer
   *               fecha_movimiento:
   *                 type: string
   *                 format: date
   *               total:
   *                 type: number
   *               observaciones:
   *                 type: string
   *               estado:
   *                 type: string
   *                 enum: [BORRADOR, CONFIRMADA, ANULADA]
   *               detalles:
   *                 type: array
   *                 items:
   *                   type: object
   *                   required:
   *                     - producto_id
   *                     - cantidad
   *                     - precio_unitario
   *                   properties:
   *                     producto_id:
   *                       type: integer
   *                     cantidad:
   *                       type: number
   *                     precio_unitario:
   *                       type: number
   *     responses:
   *       200:
   *         description: Factura actualizada exitosamente
   *       400:
   *         description: Datos inválidos
   *       404:
   *         description: Factura no encontrada
   *       409:
   *         description: Código interno ya existe
   *       500:
   *         description: Error del servidor
   */
  static async updateFacturaInterna(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const id = parseInt(req.params['id'] as string);
      const {
        codigo_interno,
        tipo_movimiento_id,
        concepto,
        usuario_responsable_id,
        fecha_movimiento,
        total,
        observaciones,
        estado,
        detalles
      }: FacturaInternaUpdateDTO & { detalles?: Omit<DetalleFacturaCreateDTO, 'factura_id'>[] } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de factura interna inválido'
        });
      }

      // Validar que la factura existe
      const existingFactura = await FacturaInternaService.getFacturaInternaById(id);
      if (!existingFactura) {
        return res.status(404).json({
          success: false,
          message: 'Factura interna no encontrada'
        });
      }

      // Validaciones de campos si se están actualizando
      if (codigo_interno !== undefined) {
        if (codigo_interno.trim().length === 0) {
          return res.status(400).json({
            success: false,
            message: 'El código interno no puede estar vacío'
          });
        }

        if (codigo_interno.length > 50) {
          return res.status(400).json({
            success: false,
            message: 'El código interno no puede exceder 50 caracteres'
          });
        }

        // Verificar si ya existe otra factura con ese código
        const facturaWithSameCode = await FacturaInternaService.getFacturaInternaByCodigo(codigo_interno.trim());
        if (facturaWithSameCode && facturaWithSameCode.id !== id) {
          return res.status(409).json({
            success: false,
            message: 'Ya existe otra factura interna con ese código'
          });
        }
      }

      if (concepto !== undefined && concepto.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'El concepto no puede estar vacío'
        });
      }

      if (tipo_movimiento_id !== undefined) {
        if (isNaN(tipo_movimiento_id)) {
          return res.status(400).json({
            success: false,
            message: 'El tipo de movimiento debe ser un número válido'
          });
        }

        // Validar que el tipo de movimiento exista
        const [tipoMovimiento] = await pool.execute<RowDataPacket[]>(
          'SELECT id FROM tipos_movimiento WHERE id = ?',
          [tipo_movimiento_id]
        );

        if (tipoMovimiento.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'El tipo de movimiento especificado no existe'
          });
        }
      }

      if (usuario_responsable_id !== undefined) {
        if (isNaN(usuario_responsable_id)) {
          return res.status(400).json({
            success: false,
            message: 'El usuario responsable debe ser un número válido'
          });
        }

        // Validar que el usuario exista
        const [usuario] = await pool.execute<RowDataPacket[]>(
          'SELECT id FROM usuarios WHERE id = ?',
          [usuario_responsable_id]
        );

        if (usuario.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'El usuario responsable especificado no existe'
          });
        }
      }

      if (estado !== undefined && !['BORRADOR', 'CONFIRMADA', 'ANULADA'].includes(estado)) {
        return res.status(400).json({
          success: false,
          message: 'Estado inválido. Debe ser BORRADOR, CONFIRMADA o ANULADA'
        });
      }

      // Validar detalles si se proporcionan
      if (detalles !== undefined) {
        if (!Array.isArray(detalles)) {
           return res.status(400).json({
             success: false,
             message: 'Los detalles deben ser un array'
           });
        }
        for (const detalle of detalles) {
          if (!detalle.producto_id || detalle.cantidad === undefined || detalle.precio_unitario === undefined) {
            return res.status(400).json({
              success: false,
              message: 'Cada detalle debe tener producto_id, cantidad y precio_unitario'
            });
          }
          if (detalle.cantidad <= 0) {
            return res.status(400).json({
              success: false,
              message: 'La cantidad debe ser mayor a 0'
            });
          }
          if (detalle.precio_unitario < 0) {
            return res.status(400).json({
              success: false,
              message: 'El precio unitario no puede ser negativo'
            });
          }
        }
      }

      const facturaData: FacturaInternaUpdateDTO = {};
      if (codigo_interno !== undefined) facturaData.codigo_interno = codigo_interno.trim();
      if (tipo_movimiento_id !== undefined) facturaData.tipo_movimiento_id = tipo_movimiento_id;
      if (concepto !== undefined) facturaData.concepto = concepto.trim();
      if (usuario_responsable_id !== undefined) facturaData.usuario_responsable_id = usuario_responsable_id;
      if (fecha_movimiento !== undefined) facturaData.fecha_movimiento = fecha_movimiento;
      if (total !== undefined) facturaData.total = total;
      if (observaciones !== undefined) facturaData.observaciones = observaciones.trim();
      if (estado !== undefined) facturaData.estado = estado;

      const result = await FacturaInternaService.updateFacturaWithDetails(id, facturaData, detalles);

      if (!result.factura) {
        // Esto no debería ocurrir si pasamos la validación inicial, pero por si acaso
        return res.status(404).json({
          success: false,
          message: 'Factura no encontrada durante la actualización'
        });
      }

      return res.json({
        success: true,
        data: result.factura,
        detallesProcessed: result.detallesCount,
        message: 'Factura interna actualizada exitosamente'
      });
    } catch (error) {
      console.error('Error al actualizar factura interna:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar factura interna',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async deleteFacturaInterna(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const id = parseInt(req.params['id'] as string);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de factura interna inválido'
        });
      }

      // Validar que la factura existe
      const existingFactura = await FacturaInternaService.getFacturaInternaById(id);
      if (!existingFactura) {
        return res.status(404).json({
          success: false,
          message: 'Factura interna no encontrada'
        });
      }

      const deleted = await FacturaInternaService.deleteFacturaInterna(id);

      if (!deleted) {
        return res.status(500).json({
          success: false,
          message: 'Error al eliminar la factura interna'
        });
      }

      return res.json({
        success: true,
        message: 'Factura interna eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar factura interna:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar factura interna',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async updateEstado(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const id = parseInt(req.params['id'] as string);
      const { estado } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de factura interna inválido'
        });
      }

      if (!['BORRADOR', 'CONFIRMADA', 'ANULADA'].includes(estado)) {
        return res.status(400).json({
          success: false,
          message: 'Estado inválido. Debe ser BORRADOR, CONFIRMADA o ANULADA'
        });
      }

      // Validar que la factura existe
      const existingFactura = await FacturaInternaService.getFacturaInternaById(id);
      if (!existingFactura) {
        return res.status(404).json({
          success: false,
          message: 'Factura interna no encontrada'
        });
      }

      const updatedFactura = await FacturaInternaService.updateEstado(id, estado);

      return res.json({
        success: true,
        data: updatedFactura,
        message: `Estado de factura actualizado a ${estado.toLowerCase()} exitosamente`
      });
    } catch (error) {
      console.error('Error al actualizar estado de factura interna:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar estado de factura interna',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async getStats(_req: Request, res: Response): Promise<Response> {
    try {
      const stats = await FacturaInternaService.getStats();

      return res.json({
        success: true,
        data: stats,
        message: 'Estadísticas de facturas internas obtenidas exitosamente'
      });
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }
}