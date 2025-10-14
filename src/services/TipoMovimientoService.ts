import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../utils/database';
import { TipoMovimiento, TipoMovimientoCreateDTO, TipoMovimientoUpdateDTO } from '../models/TipoMovimiento';

export class TipoMovimientoService {
  
  static async getAllTiposMovimiento(): Promise<TipoMovimiento[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, nombre, descripcion, afecta_stock FROM tipos_movimiento ORDER BY nombre'
    );
    
    return rows.map(row => {
      const rowData = row as any;
      return {
        id: rowData.id,
        nombre: rowData.nombre,
        descripcion: rowData.descripcion,
        afecta_stock: rowData.afecta_stock,
        created_at: new Date(),
        updated_at: new Date()
      } as TipoMovimiento;
    });
  }

  static async getTipoMovimientoById(id: number): Promise<TipoMovimiento | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, nombre, descripcion, afecta_stock FROM tipos_movimiento WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    const row = rows[0] as any;
    return {
      id: row.id,
      nombre: row.nombre,
      descripcion: row.descripcion,
      afecta_stock: row.afecta_stock,
      created_at: new Date(),
      updated_at: new Date()
    } as TipoMovimiento;
  }

  static async getTipoMovimientoByNombre(nombre: string): Promise<TipoMovimiento | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, nombre, descripcion, afecta_stock FROM tipos_movimiento WHERE nombre = ?',
      [nombre]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    const row = rows[0] as any;
    return {
      id: row.id,
      nombre: row.nombre,
      descripcion: row.descripcion,
      afecta_stock: row.afecta_stock,
      created_at: new Date(),
      updated_at: new Date()
    } as TipoMovimiento;
  }

  static async getTiposMovimientoByAfectaStock(afecta_stock: 'ENTRADA' | 'SALIDA'): Promise<TipoMovimiento[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, nombre, descripcion, afecta_stock FROM tipos_movimiento WHERE afecta_stock = ? ORDER BY nombre',
      [afecta_stock]
    );
    
    return rows.map(row => {
      const rowData = row as any;
      return {
        id: rowData.id,
        nombre: rowData.nombre,
        descripcion: rowData.descripcion,
        afecta_stock: rowData.afecta_stock,
        created_at: new Date(),
        updated_at: new Date()
      } as TipoMovimiento;
    });
  }

  static async createTipoMovimiento(data: TipoMovimientoCreateDTO): Promise<TipoMovimiento> {
    const { nombre, descripcion, afecta_stock } = data;
    
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO tipos_movimiento (nombre, descripcion, afecta_stock) VALUES (?, ?, ?)',
      [nombre, descripcion || '', afecta_stock]
    );
    
    const newTipoMovimiento = await this.getTipoMovimientoById(result.insertId);
    if (!newTipoMovimiento) {
      throw new Error('Error al crear el tipo de movimiento');
    }
    
    return newTipoMovimiento;
  }

  static async updateTipoMovimiento(id: number, data: TipoMovimientoUpdateDTO): Promise<TipoMovimiento | null> {
    const fields: string[] = [];
    const values: any[] = [];
    
    if (data.nombre !== undefined) {
      fields.push('nombre = ?');
      values.push(data.nombre);
    }
    
    if (data.descripcion !== undefined) {
      fields.push('descripcion = ?');
      values.push(data.descripcion);
    }
    
    if (data.afecta_stock !== undefined) {
      fields.push('afecta_stock = ?');
      values.push(data.afecta_stock);
    }
    
    if (fields.length === 0) {
      return await this.getTipoMovimientoById(id);
    }
    
    values.push(id);
    
    const query = `UPDATE tipos_movimiento SET ${fields.join(', ')} WHERE id = ?`;
    
    const [result] = await pool.execute<ResultSetHeader>(query, values);
    
    if (result.affectedRows === 0) {
      return null;
    }
    
    return await this.getTipoMovimientoById(id);
  }

  static async deleteTipoMovimiento(id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM tipos_movimiento WHERE id = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }

  static async countTiposMovimiento(): Promise<number> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM tipos_movimiento'
    );
    
    return rows[0]?.['total'] || 0;
  }

  static async countTiposMovimientoByAfectaStock(afecta_stock: 'ENTRADA' | 'SALIDA'): Promise<number> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM tipos_movimiento WHERE afecta_stock = ?',
      [afecta_stock]
    );
    
    return rows[0]?.['total'] || 0;
  }
}