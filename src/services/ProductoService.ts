import { pool } from '../utils/database';
import { Producto, ProductoCreateDTO, ProductoUpdateDTO } from '../models/Producto';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export class ProductoService {
  
  static async getAllProducts(page: number = 1, limit: number = 10, activeFilter?: boolean):
    Promise<{ products: Producto[]; total: number; page: number; totalPages: number; }> {
    try {
      // Calcular offset para paginación
      const offset = (page - 1) * limit;

      // Construir query base
      let whereClause = '';
      const queryParams: any[] = [];

      if (activeFilter !== undefined) {
        whereClause = 'WHERE activo = ?';
        queryParams.push(activeFilter);
      }

      // Query para obtener el total de registros
      const countQuery = `SELECT COUNT(*) as total FROM productos ${whereClause}`;
      
      // Asegurarnos de que los parámetros del count sean del tipo correcto
      const countParams = queryParams.map(param => param === 'true' ? 1 : (param === 'false' ? 0 : param));
      const [countRows] = await pool.execute<RowDataPacket[]>(countQuery, countParams);
      const total = countRows[0]?.['total'] || 0;

      // Query para obtener los productos con paginación
      // MySQL requiere que LIMIT y OFFSET sean valores literales, no parámetros preparados
      const productsQuery = `
        SELECT * FROM productos 
        ${whereClause}
        ORDER BY nombre ASC 
        LIMIT ${parseInt(limit.toString())} OFFSET ${parseInt(offset.toString())}
      `;

      const [rows] = await pool.execute<RowDataPacket[]>(productsQuery, queryParams);
      const products = rows as Producto[];

      const totalPages = Math.ceil(total / limit);

      return {
        products,
        total,
        page,
        totalPages
      };
    } catch (error) {
      console.error('Error al obtener productos:', error);
      throw error;
    }
  }

  static async getProductById(id: number): Promise<Producto | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM productos WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    return rows[0] as Producto;
  }

  static async getProductByNombre(nombre: string): Promise<Producto | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM productos WHERE nombre = ?',
      [nombre]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    return rows[0] as Producto;
  }

  static async getProductsByCategoria(categoriaId: number): Promise<Producto[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM productos WHERE categoria_id = ? AND activo = 1 ORDER BY nombre',
      [categoriaId]
    );
    
    return rows as Producto[];
  }

  static async createProduct(productData: ProductoCreateDTO): Promise<Producto> {
    const { 
      nombre, 
      descripcion, 
      categoria_id, 
      unidad_medida, 
      stock_actual = 0, 
      stock_minimo = 0, 
      precio_referencia = 0, 
      activo = true 
    } = productData;
    
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO productos (nombre, descripcion, categoria_id, unidad_medida, stock_actual, stock_minimo, precio_referencia, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [nombre, descripcion || null, categoria_id, unidad_medida, stock_actual, stock_minimo, precio_referencia, activo]
    );
    
    const newProduct = await this.getProductById(result.insertId);
    if (!newProduct) {
      throw new Error('Error al crear el producto');
    }
    
    return newProduct;
  }

  static async updateProduct(id: number, productData: ProductoUpdateDTO): Promise<Producto | null> {
    const fields: string[] = [];
    const values: any[] = [];
    
    if (productData.nombre !== undefined) {
      fields.push('nombre = ?');
      values.push(productData.nombre);
    }
    
    if (productData.descripcion !== undefined) {
      fields.push('descripcion = ?');
      values.push(productData.descripcion);
    }
    
    if (productData.categoria_id !== undefined) {
      fields.push('categoria_id = ?');
      values.push(productData.categoria_id);
    }
    
    if (productData.unidad_medida !== undefined) {
      fields.push('unidad_medida = ?');
      values.push(productData.unidad_medida);
    }
    
    if (productData.stock_actual !== undefined) {
      fields.push('stock_actual = ?');
      values.push(productData.stock_actual);
    }
    
    if (productData.stock_minimo !== undefined) {
      fields.push('stock_minimo = ?');
      values.push(productData.stock_minimo);
    }
    
    if (productData.precio_referencia !== undefined) {
      fields.push('precio_referencia = ?');
      values.push(productData.precio_referencia);
    }
    
    if (productData.activo !== undefined) {
      fields.push('activo = ?');
      values.push(productData.activo);
    }
    
    if (fields.length === 0) {
      return await this.getProductById(id);
    }
    
    values.push(id);
    
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE productos SET ${fields.join(', ')}, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    
    if (result.affectedRows === 0) {
      return null;
    }
    
    return await this.getProductById(id);
  }

  static async deleteProduct(id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE productos SET activo = 0, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }

  static async hardDeleteProduct(id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM productos WHERE id = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }

  static async countActiveProducts(): Promise<number> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM productos WHERE activo = 1'
    );
    
    return rows[0]?.['total'] || 0;
  }

  static async countLowStockProducts(): Promise<number> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM productos WHERE activo = 1 AND stock_actual <= stock_minimo'
    );
    
    return rows[0]?.['total'] || 0;
  }
}