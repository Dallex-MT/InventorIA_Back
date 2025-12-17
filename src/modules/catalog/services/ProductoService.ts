import { pool } from '../../../shared/utils/database';
import { Producto, ProductoCreateDTO, ProductoUpdateDTO } from '../models/Producto';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { publishProductoChange } from '../../../shared/websocket/server';
import { logAppEvent } from '../../../shared/utils/logger';

export class ProductoService {

  static async getAllProducts(
    page: number = 1,
    limit: number = 10,
    activeFilter?: boolean,
    categoriaId?: number,
    unidadMedidaId?: number,
    searchText?: string
  ): Promise<{ products: Producto[]; total: number; page: number; totalPages: number; }> {
    try {
      // Calcular offset para paginación
      const offset = (page - 1) * limit;

      // Construir query base con filtros avanzados
      const conditions: string[] = [];
      const queryParams: any[] = [];

      // Filtro por estado activo
      if (activeFilter !== undefined) {
        conditions.push('p.activo = ?');
        queryParams.push(activeFilter);
      }

      // Filtro por categoría
      if (categoriaId !== undefined) {
        conditions.push('p.categoria_id = ?');
        queryParams.push(categoriaId);
      }

      // Filtro por unidad de medida
      if (unidadMedidaId !== undefined) {
        conditions.push('p.unidad_medida_id = ?');
        queryParams.push(unidadMedidaId);
      }

      // Filtro de búsqueda por texto (nombre y descripción)
      if (searchText !== undefined && searchText.trim() !== '') {
        conditions.push('(LOWER(p.nombre) LIKE LOWER(?) OR LOWER(p.descripcion) LIKE LOWER(?))');
        const searchPattern = `%${searchText.trim()}%`;
        queryParams.push(searchPattern, searchPattern);
      }

      // Construir la cláusula WHERE
      let whereClause = '';
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }

      // Query para obtener el total de registros
      const countQuery = `SELECT COUNT(*) as total FROM productos p ${whereClause}`;

      // Asegurarnos de que los parámetros del count sean del tipo correcto
      const countParams = queryParams.map(param => param === 'true' ? 1 : (param === 'false' ? 0 : param));
      const [countRows] = await pool.execute<RowDataPacket[]>(countQuery, countParams);
      const total = countRows[0]?.['total'] || 0;

      // Query para obtener los productos con paginación
      // MySQL requiere que LIMIT y OFFSET sean valores literales, no parámetros preparados
      const productsQuery = `
        SELECT p.*, 
               um.id as um_id, um.nombre as um_nombre, um.abreviatura as um_abreviatura, um.activo as um_activo
        FROM productos p
        INNER JOIN unidades_medida um ON p.unidad_medida_id = um.id
        ${whereClause}
        ORDER BY p.nombre ASC 
        LIMIT ${parseInt(limit.toString())} OFFSET ${parseInt(offset.toString())}
      `;

      const [rows] = await pool.execute<RowDataPacket[]>(productsQuery, queryParams);

      const products = rows.map((row: any) => {
        const product = { ...row } as Producto;
        product.unidad_medida = {
          id: row.um_id,
          nombre: row.um_nombre,
          abreviatura: row.um_abreviatura,
          descripcion: null, // No necesitamos traer todo
          activo: row.um_activo,
          fecha_creacion: new Date(), // Placeholder
          fecha_actualizacion: new Date() // Placeholder
        };
        // Limpiar campos extra del join plano si es necesario, aunque TS lo ignorará si no está en la interfaz
        return product;
      });

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
      `SELECT p.*, 
              um.id as um_id, um.nombre as um_nombre, um.abreviatura as um_abreviatura, um.activo as um_activo
       FROM productos p
       INNER JOIN unidades_medida um ON p.unidad_medida_id = um.id
       WHERE p.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0] as any;
    const product = { ...row } as Producto;
    product.unidad_medida = {
      id: row.um_id,
      nombre: row.um_nombre,
      abreviatura: row.um_abreviatura,
      descripcion: null,
      activo: row.um_activo,
      fecha_creacion: new Date(),
      fecha_actualizacion: new Date()
    };

    return product;
  }

  static async getProductByNombre(nombre: string): Promise<Producto | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.*, 
              um.id as um_id, um.nombre as um_nombre, um.abreviatura as um_abreviatura, um.activo as um_activo
       FROM productos p
       INNER JOIN unidades_medida um ON p.unidad_medida_id = um.id
       WHERE p.nombre = ?`,
      [nombre]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0] as any;
    const product = { ...row } as Producto;
    product.unidad_medida = {
      id: row.um_id,
      nombre: row.um_nombre,
      abreviatura: row.um_abreviatura,
      descripcion: null,
      activo: row.um_activo,
      fecha_creacion: new Date(),
      fecha_actualizacion: new Date()
    };

    return product;
  }

  static async getProductsByCategoria(categoriaId: number): Promise<Producto[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.*, 
              um.id as um_id, um.nombre as um_nombre, um.abreviatura as um_abreviatura, um.activo as um_activo
       FROM productos p
       INNER JOIN unidades_medida um ON p.unidad_medida_id = um.id
       WHERE p.categoria_id = ? AND p.activo = 1 
       ORDER BY p.nombre`,
      [categoriaId]
    );

    return rows.map((row: any) => {
      const product = { ...row } as Producto;
      product.unidad_medida = {
        id: row.um_id,
        nombre: row.um_nombre,
        abreviatura: row.um_abreviatura,
        descripcion: null,
        activo: row.um_activo,
        fecha_creacion: new Date(),
        fecha_actualizacion: new Date()
      };
      return product;
    });
  }

  static async createProduct(productData: ProductoCreateDTO): Promise<Producto> {
    const {
      nombre,
      descripcion,
      categoria_id,
      unidad_medida_id,
      stock_actual = 0,
      stock_minimo = 0,
      precio_referencia = 0,
      activo = true
    } = productData;

    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO productos (nombre, descripcion, categoria_id, unidad_medida_id, stock_actual, stock_minimo, precio_referencia, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [nombre, descripcion || null, categoria_id, unidad_medida_id, stock_actual, stock_minimo, precio_referencia, activo]
    );

    const newProduct = await this.getProductById(result.insertId);
    if (!newProduct) {
      throw new Error('Error al crear el producto');
    }

    // Notificar creación vía WebSocket
    try {
      publishProductoChange('created', newProduct);
      logAppEvent('info', 'producto_created_published', { id: newProduct.id });
    } catch (wsError) {
      logAppEvent('error', 'producto_created_publish_error', {
        error: wsError instanceof Error ? wsError.message : String(wsError)
      });
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

    if (productData.unidad_medida_id !== undefined) {
      fields.push('unidad_medida_id = ?');
      values.push(productData.unidad_medida_id);
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
      `UPDATE productos SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return null;
    }

    const updatedProduct = await this.getProductById(id);

    // Notificar actualización vía WebSocket
    if (updatedProduct) {
      try {
        publishProductoChange('updated', updatedProduct);
        logAppEvent('info', 'producto_updated_published', { id: updatedProduct.id });
      } catch (wsError) {
        logAppEvent('error', 'producto_updated_publish_error', {
          error: wsError instanceof Error ? wsError.message : String(wsError)
        });
      }
    }

    return updatedProduct;
  }

  static async deleteProduct(id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE productos SET activo = 0 WHERE id = ?',
      [id]
    );

    const wasDeleted = result.affectedRows > 0;

    // Notificar eliminación vía WebSocket
    if (wasDeleted) {
      try {
        publishProductoChange('deleted', { id });
        logAppEvent('info', 'producto_deleted_published', { id });
      } catch (wsError) {
        logAppEvent('error', 'producto_deleted_publish_error', {
          error: wsError instanceof Error ? wsError.message : String(wsError)
        });
      }
    }

    return wasDeleted;
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

  static async updateStockAndPrice(
    id: number, 
    quantityDelta: number, 
    newPrice?: number,
    connection?: any // Optional connection for transaction support
  ): Promise<void> {
    const conn = connection || pool;
    
    // Validar que no quede stock negativo si estamos restando
    if (quantityDelta < 0) {
      const [rows] = await conn.execute(
        'SELECT stock_actual, nombre FROM productos WHERE id = ?',
        [id]
      );
      
      if (rows.length === 0) throw new Error(`Producto con ID ${id} no encontrado`);
      
      const currentStock = parseFloat(rows[0].stock_actual);
      if (currentStock + quantityDelta < 0) {
        throw new Error(`Stock insuficiente para el producto "${rows[0].nombre}". Stock actual: ${currentStock}, Intento de resta: ${Math.abs(quantityDelta)}`);
      }
    }

    const fields: string[] = ['stock_actual = stock_actual + ?'];
    const values: any[] = [quantityDelta];

    if (newPrice !== undefined && newPrice > 0) {
      fields.push('precio_referencia = ?');
      values.push(newPrice);
    }

    values.push(id);

    await conn.execute(
      `UPDATE productos SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }
}