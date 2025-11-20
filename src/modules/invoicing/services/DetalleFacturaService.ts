import { pool } from '../../../shared/utils/database';
import { DetalleFactura, DetalleFacturaCreateDTO, DetalleFacturaUpdateDTO } from '../models/DetalleFactura';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export class DetalleFacturaService {

  static async getAllDetallesFactura(page: number = 1, limit: number = 10): Promise<{ detalles: DetalleFactura[], total: number, page: number, totalPages: number }> {
    const offset = (page - 1) * limit;

    // Obtener el total de registros
    const [countResult] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM detalle_facturas'
    );
    const total = countResult[0]?.['total'] || 0;

    // Obtener los registros paginados
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM detalle_facturas ORDER BY id LIMIT ? OFFSET ?',
      [limit.toString(), offset.toString()]
    );

    const totalPages = Math.ceil(total / limit);

    return {
      detalles: rows as DetalleFactura[],
      total,
      page,
      totalPages
    };
  }

  static async getDetalleFacturaById(id: number): Promise<DetalleFactura | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM detalle_facturas WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0] as DetalleFactura;
  }

  static async getDetallesByFacturaId(factura_id: number): Promise<DetalleFactura[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM detalle_facturas WHERE factura_id = ? ORDER BY id',
      [factura_id]
    );

    return rows as DetalleFactura[];
  }

  static async getDetallesByProductoId(producto_id: number): Promise<DetalleFactura[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM detalle_facturas WHERE producto_id = ? ORDER BY id',
      [producto_id]
    );

    return rows as DetalleFactura[];
  }

  static async getDetalleByFacturaAndProducto(factura_id: number, producto_id: number): Promise<DetalleFactura | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM detalle_facturas WHERE factura_id = ? AND producto_id = ?',
      [factura_id, producto_id]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0] as DetalleFactura;
  }

  static async createDetalleFactura(detalleData: DetalleFacturaCreateDTO): Promise<DetalleFactura> {
    const { factura_id, producto_id, cantidad, precio_unitario } = detalleData;

    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO detalle_facturas (factura_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
      [factura_id, producto_id, cantidad, precio_unitario]
    );

    const newDetalle = await this.getDetalleFacturaById(result.insertId);
    if (!newDetalle) {
      throw new Error('Error al crear el detalle de factura');
    }

    return newDetalle;
  }

  static async updateDetalleFactura(id: number, detalleData: DetalleFacturaUpdateDTO): Promise<DetalleFactura | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (detalleData.factura_id !== undefined) {
      fields.push('factura_id = ?');
      values.push(detalleData.factura_id);
    }

    if (detalleData.producto_id !== undefined) {
      fields.push('producto_id = ?');
      values.push(detalleData.producto_id);
    }

    if (detalleData.cantidad !== undefined) {
      fields.push('cantidad = ?');
      values.push(detalleData.cantidad);
    }

    if (detalleData.precio_unitario !== undefined) {
      fields.push('precio_unitario = ?');
      values.push(detalleData.precio_unitario);
    }

    if (fields.length === 0) {
      return await this.getDetalleFacturaById(id);
    }

    values.push(id);

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE detalle_facturas SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return null;
    }

    return await this.getDetalleFacturaById(id);
  }

  static async deleteDetalleFactura(id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM detalle_facturas WHERE id = ?',
      [id]
    );

    return result.affectedRows > 0;
  }

  static async deleteDetallesByFacturaId(factura_id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM detalle_facturas WHERE factura_id = ?',
      [factura_id]
    );

    return result.affectedRows > 0;
  }

  static async getTotalByFactura(factura_id: number): Promise<number> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT SUM(subtotal) as total FROM detalle_facturas WHERE factura_id = ?',
      [factura_id]
    );

    return parseFloat(rows[0]?.['total'] || '0');
  }
}