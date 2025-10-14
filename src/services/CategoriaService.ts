import { pool } from '../utils/database';
import { Categoria, CategoriaCreateDTO, CategoriaUpdateDTO } from '../models/Categoria';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export class CategoriaService {
  
  static async getAllCategorias(): Promise<Categoria[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM categorias_producto WHERE activo = 1 ORDER BY nombre'
    );
    return rows as Categoria[];
  }

  static async getCategoriaById(id: number): Promise<Categoria | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM categorias_producto WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    return rows[0] as Categoria;
  }

  static async getCategoriaByNombre(nombre: string): Promise<Categoria | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM categorias_producto WHERE nombre = ?',
      [nombre]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    return rows[0] as Categoria;
  }

  static async createCategoria(categoriaData: CategoriaCreateDTO): Promise<Categoria> {
    const { nombre, descripcion, activo = true } = categoriaData;
    
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO categorias_producto (nombre, descripcion, activo, fecha_creacion) VALUES (?, ?, ?, NOW())',
      [nombre, descripcion || null, activo]
    );
    
    const newCategoria = await this.getCategoriaById(result.insertId);
    if (!newCategoria) {
      throw new Error('Error al crear la categoría');
    }
    
    return newCategoria;
  }

  static async updateCategoria(id: number, categoriaData: CategoriaUpdateDTO): Promise<Categoria | null> {
    const fields: string[] = [];
    const values: any[] = [];
    
    if (categoriaData.nombre !== undefined) {
      fields.push('nombre = ?');
      values.push(categoriaData.nombre);
    }
    
    if (categoriaData.descripcion !== undefined) {
      fields.push('descripcion = ?');
      values.push(categoriaData.descripcion);
    }
    
    if (categoriaData.activo !== undefined) {
      fields.push('activo = ?');
      values.push(categoriaData.activo);
    }
    
    if (fields.length === 0) {
      return await this.getCategoriaById(id);
    }
    
    values.push(id);
    
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE categorias_producto SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    if (result.affectedRows === 0) {
      return null;
    }
    
    return await this.getCategoriaById(id);
  }

  static async deleteCategoria(id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE categorias_producto SET activo = 0 WHERE id = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }

  static async hardDeleteCategoria(id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM categorias_producto WHERE id = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }

  static async countActiveCategorias(): Promise<number> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM categorias_producto WHERE activo = 1'
    );
    
    return rows[0]?.['total'] || 0;
  }
}