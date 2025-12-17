import { pool } from '../../../shared/utils/database';
import { FacturaInterna, FacturaInternaCreateDTO, FacturaInternaUpdateDTO } from '../models/FacturaInterna';
import { DetalleFacturaCreateDTO } from '../models/DetalleFactura';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { ProductoService } from '../../catalog/services/ProductoService';
import { logAppEvent } from '../../../shared/utils/logger';

export class FacturaInternaService {

  static async getAllFacturasInternas(
    page: number = 1, 
    limit: number = 10, 
    estadoFilter?: 'BORRADOR' | 'CONFIRMADA' | 'ANULADA',
    searchText?: string,
    fechaInicio?: string,
    fechaFin?: string
  ): Promise<{ facturas: FacturaInterna[]; total: number; page: number; totalPages: number; }> {
    try {
      // Calcular offset para paginación
      const offset = (page - 1) * limit;

      // Construir query base
      let whereClause = '';
      const queryParams: any[] = [];
      const conditions: string[] = [];

      // Filtro por estado
      if (estadoFilter !== undefined) {
        conditions.push('fi.estado = ?');
        queryParams.push(estadoFilter);
      }

      // Filtro de búsqueda por texto (código interno o concepto)
      if (searchText && searchText.trim().length > 0) {
        // Escapar caracteres especiales para prevenir SQL injection
        const escapedSearchText = searchText.replace(/[%_]/g, '\\$&');
        conditions.push('(LOWER(fi.codigo_interno) LIKE LOWER(?) OR LOWER(fi.concepto) LIKE LOWER(?))');
        queryParams.push(`%${escapedSearchText}%`, `%${escapedSearchText}%`);
      }

      // Filtro por rango de fechas
      if (fechaInicio || fechaFin) {
        // Validar formatos de fecha (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        
        if (fechaInicio && !dateRegex.test(fechaInicio)) {
          throw new Error('Formato de fecha de inicio inválido. Use YYYY-MM-DD');
        }
        
        if (fechaFin && !dateRegex.test(fechaFin)) {
          throw new Error('Formato de fecha de fin inválido. Use YYYY-MM-DD');
        }

        // Validar lógica de fechas
        if (fechaInicio && fechaFin && new Date(fechaInicio) > new Date(fechaFin)) {
          throw new Error('La fecha de inicio debe ser menor o igual a la fecha de fin');
        }

        // Aplicar filtros de fecha
        if (fechaInicio && fechaFin) {
          conditions.push('DATE(fi.fecha_movimiento) BETWEEN ? AND ?');
          queryParams.push(fechaInicio, fechaFin);
        } else if (fechaInicio) {
          conditions.push('DATE(fi.fecha_movimiento) >= ?');
          queryParams.push(fechaInicio);
        } else if (fechaFin) {
          conditions.push('DATE(fi.fecha_movimiento) <= ?');
          queryParams.push(fechaFin);
        }
      }

      // Construir cláusula WHERE
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }

      // Query para obtener el total de registros
      const countQuery = `SELECT COUNT(*) as total FROM facturas_internas fi ${whereClause}`;

      // Asegurarnos de que los parámetros del count sean del tipo correcto
      const countParams = [...queryParams];
      const [countRows] = await pool.execute<RowDataPacket[]>(countQuery, countParams);
      const total = countRows[0]?.['total'] || 0;

      // Query para obtener las facturas con paginación
      // MySQL requiere que LIMIT y OFFSET sean valores literales, no parámetros preparados
      const facturasQuery = `
        SELECT fi.*, tm.nombre as tipo_movimiento_nombre, tm.afecta_stock, 
               u.nombre_usuario, u.correo 
        FROM facturas_internas fi
        INNER JOIN tipos_movimiento tm ON fi.tipo_movimiento_id = tm.id
        INNER JOIN usuarios u ON fi.usuario_responsable_id = u.id
        ${whereClause}
        ORDER BY fi.fecha_creacion DESC 
        LIMIT ${parseInt(limit.toString())} OFFSET ${parseInt(offset.toString())}
      `;

      const [rows] = await pool.execute<RowDataPacket[]>(facturasQuery, queryParams);
      const facturas = rows as FacturaInterna[];

      const totalPages = Math.ceil(total / limit);

      return {
        facturas,
        total,
        page,
        totalPages
      };
    } catch (error) {
      console.error('Error al obtener facturas internas:', error);
      throw error;
    }
  }

  static async getFacturaInternaById(id: number): Promise<FacturaInterna | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT fi.*, tm.nombre as tipo_movimiento_nombre, tm.afecta_stock, 
              u.nombre_usuario, u.correo 
       FROM facturas_internas fi
       INNER JOIN tipos_movimiento tm ON fi.tipo_movimiento_id = tm.id
       INNER JOIN usuarios u ON fi.usuario_responsable_id = u.id
       WHERE fi.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0] as FacturaInterna;
  }

  static async getFacturaInternaByCodigo(codigo_interno: string): Promise<FacturaInterna | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT fi.*, tm.nombre as tipo_movimiento_nombre, tm.afecta_stock, 
              u.nombre_usuario, u.correo 
       FROM facturas_internas fi
       INNER JOIN tipos_movimiento tm ON fi.tipo_movimiento_id = tm.id
       INNER JOIN usuarios u ON fi.usuario_responsable_id = u.id
       WHERE fi.codigo_interno = ?`,
      [codigo_interno]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0] as FacturaInterna;
  }

  static async existsCodigoInternoCaseSensitive(codigo_interno: string): Promise<boolean> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT 1 FROM facturas_internas WHERE BINARY codigo_interno = ? LIMIT 1',
      [codigo_interno]
    );
    return rows.length > 0;
  }

  static async getFacturasByEstado(estado: 'BORRADOR' | 'CONFIRMADA' | 'ANULADA'): Promise<FacturaInterna[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT fi.*, tm.nombre as tipo_movimiento_nombre, tm.afecta_stock, 
              u.nombre_usuario, u.correo 
       FROM facturas_internas fi
       INNER JOIN tipos_movimiento tm ON fi.tipo_movimiento_id = tm.id
       INNER JOIN usuarios u ON fi.usuario_responsable_id = u.id
       WHERE fi.estado = ?
       ORDER BY fi.fecha_creacion DESC`,
      [estado]
    );
    return rows as FacturaInterna[];
  }

  static async getFacturasByTipoMovimiento(tipo_movimiento_id: number): Promise<FacturaInterna[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT fi.*, tm.nombre as tipo_movimiento_nombre, tm.afecta_stock, 
              u.nombre_usuario, u.correo 
       FROM facturas_internas fi
       INNER JOIN tipos_movimiento tm ON fi.tipo_movimiento_id = tm.id
       INNER JOIN usuarios u ON fi.usuario_responsable_id = u.id
       WHERE fi.tipo_movimiento_id = ?
       ORDER BY fi.fecha_creacion DESC`,
      [tipo_movimiento_id]
    );
    return rows as FacturaInterna[];
  }

  static async createFacturaInterna(facturaData: FacturaInternaCreateDTO): Promise<FacturaInterna> {
    const {
      codigo_interno,
      tipo_movimiento_id,
      concepto,
      usuario_responsable_id,
      fecha_movimiento,
      total = 0,
      observaciones = '',
      estado = 'BORRADOR'
    } = facturaData;

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO facturas_internas 
       (codigo_interno, tipo_movimiento_id, concepto, usuario_responsable_id, 
        fecha_movimiento, total, observaciones, estado) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [codigo_interno, tipo_movimiento_id, concepto, usuario_responsable_id,
        fecha_movimiento, total, observaciones, estado]
    );

    const newFactura = await this.getFacturaInternaById(result.insertId);
    if (!newFactura) {
      throw new Error('Error al crear la factura interna');
    }

    return newFactura;
  }

  static async createFacturaWithDetails(
    facturaData: FacturaInternaCreateDTO,
    detalles: Omit<DetalleFacturaCreateDTO, 'factura_id'>[]
  ): Promise<{ factura: FacturaInterna; detallesCount: number }> {
    const connection = await pool.getConnection();
    try {
      await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
      await connection.beginTransaction();
      
      // 1. Insert Header
      const {
        codigo_interno,
        tipo_movimiento_id,
        concepto,
        usuario_responsable_id,
        fecha_movimiento,
        total = 0,
        observaciones = '',
        estado = 'BORRADOR'
      } = facturaData;

      const [headerResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO facturas_internas 
         (codigo_interno, tipo_movimiento_id, concepto, usuario_responsable_id, 
          fecha_movimiento, total, observaciones, estado) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [codigo_interno, tipo_movimiento_id, concepto, usuario_responsable_id,
          fecha_movimiento, total, observaciones, estado]
      );

      const facturaId = headerResult.insertId;

      // 2. Insert Details
      if (detalles.length > 0) {
        // Prepare bulk insert
        const query = `INSERT INTO detalle_facturas (factura_id, producto_id, cantidad, precio_unitario) VALUES ?`;
        
        const values = detalles.map(d => [
          facturaId,
          d.producto_id,
          d.cantidad,
          d.precio_unitario
        ]);

        await connection.query(query, [values]);

        // 3. Actualizar inventario si el estado es CONFIRMADA
        if (estado === 'CONFIRMADA') {
          for (const d of detalles) {
            await ProductoService.updateStockAndPrice(
              d.producto_id,
              d.cantidad, // Sumar cantidad
              d.precio_unitario,
              connection
            );
          }
          logAppEvent('info', 'Inventario actualizado (Suma) por creación de factura confirmada', { 
            factura_id: facturaId, 
            usuario_id: usuario_responsable_id 
          });
        }
      }

      await connection.commit();

      // Retrieve the created invoice
      // We can't use getFacturaInternaById inside the transaction with the pool directly if we want to be 100% sure of isolation, 
      // but since we committed, it's fine to use the static method which uses the pool.
      const newFactura = await this.getFacturaInternaById(facturaId);
      
      if (!newFactura) {
        throw new Error('Error al recuperar la factura creada');
      }

      return {
        factura: newFactura,
        detallesCount: detalles.length
      };

    } catch (error) {
      await connection.rollback();
      console.error('Error en transacción de facturación:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  static async updateFacturaWithDetails(
    id: number,
    facturaData: FacturaInternaUpdateDTO,
    detalles?: Omit<DetalleFacturaCreateDTO, 'factura_id'>[]
  ): Promise<{ factura: FacturaInterna | null; detallesCount: number }> {
    const connection = await pool.getConnection();
    try {
      await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
      await connection.beginTransaction();

      // 0. Obtener estado actual (Bloqueo pesimista para evitar condiciones de carrera)
      const [currentRows] = await connection.execute<RowDataPacket[]>(
        'SELECT estado, usuario_responsable_id FROM facturas_internas WHERE id = ? FOR UPDATE', 
        [id]
      );
      
      if (currentRows.length === 0) {
         await connection.rollback();
         return { factura: null, detallesCount: 0 };
      }
      
      const currentRow = currentRows[0] as any;
      const oldEstado = currentRow.estado;
      const newEstado = facturaData.estado || oldEstado;

      // 1. Obtener detalles actuales
      const [currentDetallesRows] = await connection.execute<RowDataPacket[]>(
        'SELECT id, producto_id, cantidad, precio_unitario FROM detalle_facturas WHERE factura_id = ?', 
        [id]
      );
      const oldDetalles = currentDetallesRows as { id: number, producto_id: number, cantidad: number, precio_unitario: number }[];

      // 2. Update Header
      const fields: string[] = [];
      const values: any[] = [];

      if (facturaData.codigo_interno !== undefined) {
        fields.push('codigo_interno = ?');
        values.push(facturaData.codigo_interno);
      }
      if (facturaData.tipo_movimiento_id !== undefined) {
        fields.push('tipo_movimiento_id = ?');
        values.push(facturaData.tipo_movimiento_id);
      }
      if (facturaData.concepto !== undefined) {
        fields.push('concepto = ?');
        values.push(facturaData.concepto);
      }
      if (facturaData.usuario_responsable_id !== undefined) {
        fields.push('usuario_responsable_id = ?');
        values.push(facturaData.usuario_responsable_id);
      }
      if (facturaData.fecha_movimiento !== undefined) {
        fields.push('fecha_movimiento = ?');
        values.push(facturaData.fecha_movimiento);
      }
      if (facturaData.total !== undefined) {
        fields.push('total = ?');
        values.push(facturaData.total);
      }
      if (facturaData.observaciones !== undefined) {
        fields.push('observaciones = ?');
        values.push(facturaData.observaciones);
      }
      if (facturaData.estado !== undefined) {
        fields.push('estado = ?');
        values.push(facturaData.estado);
      }

      if (fields.length > 0) {
        values.push(id);
        await connection.execute(
          `UPDATE facturas_internas SET ${fields.join(', ')} WHERE id = ?`,
          values
        );
      }

      // 3. Update Details and Inventory (Incremental)
      let detallesCount = oldDetalles.length;

      if (detalles !== undefined) {
        const oldMap = new Map(oldDetalles.map(d => [d.producto_id, d]));
        const newMap = new Map(detalles.map(d => [d.producto_id, d]));
        
        const toRemove = oldDetalles.filter(d => !newMap.has(d.producto_id));
        const toAdd = detalles.filter(d => !oldMap.has(d.producto_id));
        const toUpdate = detalles.filter(d => oldMap.has(d.producto_id));
        
        detallesCount = detalles.length;

        // A. Handle Removals
        for (const item of toRemove) {
          // DB: Delete
          await connection.execute('DELETE FROM detalle_facturas WHERE id = ?', [item.id]);
          
          // Inventory: Revert if was CONFIRMADA
          if (oldEstado === 'CONFIRMADA') {
            await ProductoService.updateStockAndPrice(
              item.producto_id,
              -item.cantidad, // Revert stock
              undefined, 
              connection
            );
          }
        }

        // B. Handle Additions
        for (const item of toAdd) {
          // DB: Insert
          await connection.execute(
            'INSERT INTO detalle_facturas (factura_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
            [id, item.producto_id, item.cantidad, item.precio_unitario]
          );

          // Inventory: Apply if becomes/is CONFIRMADA
          if (newEstado === 'CONFIRMADA') {
            await ProductoService.updateStockAndPrice(
              item.producto_id,
              item.cantidad, // Add stock
              item.precio_unitario,
              connection
            );
          }
        }

        // C. Handle Updates
        for (const newItem of toUpdate) {
          const oldItem = oldMap.get(newItem.producto_id)!;
          
          // Check for changes
          const quantityChanged = newItem.cantidad !== oldItem.cantidad;
          const priceChanged = newItem.precio_unitario !== oldItem.precio_unitario;

          if (quantityChanged || priceChanged) {
            // DB: Update
            await connection.execute(
              'UPDATE detalle_facturas SET cantidad = ?, precio_unitario = ? WHERE id = ?',
              [newItem.cantidad, newItem.precio_unitario, oldItem.id]
            );

            // Inventory: Apply Delta if CONFIRMADA
            if (newEstado === 'CONFIRMADA') {
              // If it was already CONFIRMADA, apply delta
              if (oldEstado === 'CONFIRMADA') {
                const delta = newItem.cantidad - oldItem.cantidad;
                await ProductoService.updateStockAndPrice(
                  newItem.producto_id,
                  delta,
                  newItem.precio_unitario,
                  connection
                );
              } else {
                // If it WAS NOT CONFIRMADA, it is now becoming CONFIRMADA
                // So we just apply the full new quantity (treated as addition in effect, but logic below handles state transition globally? No, we need to handle it here)
                // Wait, if oldEstado != CONFIRMADA, we haven't applied anything yet.
                // So for "toUpdate" items (which exist in both lists), we need to apply the FULL new quantity.
                await ProductoService.updateStockAndPrice(
                  newItem.producto_id,
                  newItem.cantidad,
                  newItem.precio_unitario,
                  connection
                );
              }
            } else {
               // newEstado is NOT CONFIRMADA.
               // If oldEstado WAS CONFIRMADA, we need to Revert the OLD quantity.
               if (oldEstado === 'CONFIRMADA') {
                 await ProductoService.updateStockAndPrice(
                   oldItem.producto_id,
                   -oldItem.cantidad,
                   undefined,
                   connection
                 );
               }
            }
          } else {
            // No change in details, but State might have changed
             if (newEstado === 'CONFIRMADA' && oldEstado !== 'CONFIRMADA') {
                await ProductoService.updateStockAndPrice(
                  newItem.producto_id,
                  newItem.cantidad,
                  newItem.precio_unitario,
                  connection
                );
             } else if (newEstado !== 'CONFIRMADA' && oldEstado === 'CONFIRMADA') {
                await ProductoService.updateStockAndPrice(
                  oldItem.producto_id,
                  -oldItem.cantidad,
                  undefined,
                  connection
                );
             }
          }
        }
      } else {
        // Detalles parameter was undefined (no change in details list requested)
        // But State might have changed
        if (oldEstado !== newEstado) {
          if (newEstado === 'CONFIRMADA') {
            // Apply all existing details
            for (const d of oldDetalles) {
               await ProductoService.updateStockAndPrice(
                 d.producto_id,
                 d.cantidad,
                 d.precio_unitario,
                 connection
               );
            }
          } else if (oldEstado === 'CONFIRMADA') {
            // Revert all existing details
            for (const d of oldDetalles) {
               await ProductoService.updateStockAndPrice(
                 d.producto_id,
                 -d.cantidad,
                 undefined,
                 connection
               );
            }
          }
        }
      }

      // Log
      if (oldEstado !== newEstado || (newEstado === 'CONFIRMADA' && detalles !== undefined)) {
         logAppEvent('info', 'Actualización de factura e inventario', { 
            factura_id: id, 
            old_estado: oldEstado, 
            new_estado: newEstado,
            usuario_id: facturaData.usuario_responsable_id || currentRow.usuario_responsable_id
          });
      }

      await connection.commit();

      const updatedFactura = await this.getFacturaInternaById(id);
      return { factura: updatedFactura, detallesCount };

    } catch (error) {
      await connection.rollback();
      console.error('Error en transacción de actualización de facturación:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  static async updateFacturaInterna(id: number, facturaData: FacturaInternaUpdateDTO): Promise<FacturaInterna | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (facturaData.codigo_interno !== undefined) {
      fields.push('codigo_interno = ?');
      values.push(facturaData.codigo_interno);
    }

    if (facturaData.tipo_movimiento_id !== undefined) {
      fields.push('tipo_movimiento_id = ?');
      values.push(facturaData.tipo_movimiento_id);
    }

    if (facturaData.concepto !== undefined) {
      fields.push('concepto = ?');
      values.push(facturaData.concepto);
    }

    if (facturaData.usuario_responsable_id !== undefined) {
      fields.push('usuario_responsable_id = ?');
      values.push(facturaData.usuario_responsable_id);
    }

    if (facturaData.fecha_movimiento !== undefined) {
      fields.push('fecha_movimiento = ?');
      values.push(facturaData.fecha_movimiento);
    }

    if (facturaData.total !== undefined) {
      fields.push('total = ?');
      values.push(facturaData.total);
    }

    if (facturaData.observaciones !== undefined) {
      fields.push('observaciones = ?');
      values.push(facturaData.observaciones);
    }

    if (facturaData.estado !== undefined) {
      fields.push('estado = ?');
      values.push(facturaData.estado);
    }

    if (fields.length === 0) {
      return await this.getFacturaInternaById(id);
    }

    values.push(id);

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE facturas_internas 
       SET ${fields.join(', ')}
       WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return null;
    }

    return await this.getFacturaInternaById(id);
  }

  static async deleteFacturaInterna(id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM facturas_internas WHERE id = ?',
      [id]
    );

    return result.affectedRows > 0;
  }

  static async updateEstado(id: number, estado: 'BORRADOR' | 'CONFIRMADA' | 'ANULADA'): Promise<FacturaInterna | null> {
    const result = await this.updateFacturaWithDetails(id, { estado });
    return result.factura;
  }

  static async getStats(): Promise<{
    totalFacturas: number;
    facturasBorrador: number;
    facturasConfirmadas: number;
    facturasAnuladas: number;
    totalMonto: number;
  }> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
         COUNT(*) as totalFacturas,
         COUNT(CASE WHEN estado = 'BORRADOR' THEN 1 END) as facturasBorrador,
         COUNT(CASE WHEN estado = 'CONFIRMADA' THEN 1 END) as facturasConfirmadas,
         COUNT(CASE WHEN estado = 'ANULADA' THEN 1 END) as facturasAnuladas,
         COALESCE(SUM(total), 0) as totalMonto
       FROM facturas_internas`
    );

    const stats = rows[0] as any;
    return {
      totalFacturas: stats?.totalFacturas || 0,
      facturasBorrador: stats?.facturasBorrador || 0,
      facturasConfirmadas: stats?.facturasConfirmadas || 0,
      facturasAnuladas: stats?.facturasAnuladas || 0,
      totalMonto: parseFloat(stats?.totalMonto || '0')
    };
  }
}
