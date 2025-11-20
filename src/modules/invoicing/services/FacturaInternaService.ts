import { pool } from '../../../shared/utils/database';
import { FacturaInterna, FacturaInternaCreateDTO, FacturaInternaUpdateDTO } from '../models/FacturaInterna';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export class FacturaInternaService {

  static async getAllFacturasInternas(page: number = 1, limit: number = 10, estadoFilter?: 'BORRADOR' | 'CONFIRMADA' | 'ANULADA'):
    Promise<{ facturas: FacturaInterna[]; total: number; page: number; totalPages: number; }> {
    try {
      // Calcular offset para paginación
      const offset = (page - 1) * limit;

      // Construir query base
      let whereClause = '';
      const queryParams: any[] = [];

      if (estadoFilter !== undefined) {
        whereClause = 'WHERE fi.estado = ?';
        queryParams.push(estadoFilter);
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
       SET ${fields.join(', ')}, fecha_actualizacion = NOW() 
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
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE facturas_internas SET estado = ?, fecha_actualizacion = NOW() WHERE id = ?',
      [estado, id]
    );

    if (result.affectedRows === 0) {
      return null;
    }

    return await this.getFacturaInternaById(id);
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