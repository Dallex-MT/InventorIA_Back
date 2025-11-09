import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2/promise';
import { ProductoService } from '../services/ProductoService';
import { ProductoCreateDTO, ProductoUpdateDTO } from '../models/Producto';
import { AuthenticatedRequest } from '../middleware/auth';
import { pool } from '../utils/database';

export class ProductoController {
  
  static async getAllProducts(req: Request, res: Response): Promise<Response> {
    try {
      // Obtener parámetros de consulta
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 10;
      const activeFilter = req.query['active'] !== undefined ? 
        (req.query['active'] === 'true' ? true : req.query['active'] === 'false' ? false : undefined) : 
        undefined;

      // Validar parámetros
      if (page < 1 || limit < 1 || limit > 100) {
        return res.status(400).json({
          success: false,
          message: 'Parámetros de paginación inválidos. La página debe ser >= 1 y el límite debe estar entre 1 y 100'
        });
      }

      // Obtener productos con paginación y filtro
      const result = await ProductoService.getAllProducts(page, limit, activeFilter);
      
      return res.json({
        success: true,
        message: 'Productos obtenidos exitosamente',
        data: {
          products: result.products,
          pagination: {
            total: result.total,
            page: result.page,
            totalPages: result.totalPages,
            limit: limit
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener productos:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener productos',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async getProductById(req: Request, res: Response): Promise<Response> {
    try {
      const id = parseInt(req.params['id'] as string);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de producto inválido'
        });
      }
      
      const product = await ProductoService.getProductById(id);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }
      
      return res.json({
        success: true,
        data: product,
        message: 'Producto obtenido exitosamente'
      });
    } catch (error) {
      console.error('Error al obtener producto:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener producto',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async getProductsByCategoria(req: Request, res: Response): Promise<Response> {
    try {
      const categoriaId = parseInt(req.params['categoriaId'] as string);
      
      if (isNaN(categoriaId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de categoría inválido'
        });
      }
      
      const products = await ProductoService.getProductsByCategoria(categoriaId);
      
      return res.json({
        success: true,
        data: products,
        message: 'Productos por categoría obtenidos exitosamente'
      });
    } catch (error) {
      console.error('Error al obtener productos por categoría:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener productos por categoría',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async createProduct(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { 
        nombre, 
        descripcion, 
        categoria_id, 
        unidad_medida, 
        stock_actual, 
        stock_minimo, 
        precio_referencia, 
        activo 
      }: ProductoCreateDTO = req.body;
      
      // Validación básica
      if (!nombre || nombre.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'El nombre del producto es requerido'
        });
      }
      
      if (nombre.length > 200) {
        return res.status(400).json({
          success: false,
          message: 'El nombre del producto no puede exceder 200 caracteres'
        });
      }
      
      if (!categoria_id) {
        return res.status(400).json({
          success: false,
          message: 'La categoría del producto es requerida'
        });
      }
      
      if (!unidad_medida || unidad_medida.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'La unidad de medida del producto es requerida'
        });
      }
      
      if (unidad_medida.length > 20) {
        return res.status(400).json({
          success: false,
          message: 'La unidad de medida no puede exceder 20 caracteres'
        });
      }
      
      // Validar que la categoría existe
      const [categoriaRows] = await pool.execute<RowDataPacket[]>(
        'SELECT id FROM categorias_producto WHERE id = ? AND activo = 1',
        [categoria_id]
      );
      
      if (categoriaRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'La categoría especificada no existe o está inactiva'
        });
      }
      
      // Verificar si el producto ya existe
      const existingProduct = await ProductoService.getProductByNombre(nombre.trim());
      if (existingProduct) {
        return res.status(409).json({
          success: false,
          message: 'Ya existe un producto con ese nombre'
        });
      }
      
      const productData: ProductoCreateDTO = {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || '',
        categoria_id: categoria_id,
        unidad_medida: unidad_medida.trim(),
        stock_actual: stock_actual !== undefined ? stock_actual : 0,
        stock_minimo: stock_minimo !== undefined ? stock_minimo : 0,
        precio_referencia: precio_referencia !== undefined ? precio_referencia : 0,
        activo: activo !== undefined ? activo : true
      };
      
      const newProduct = await ProductoService.createProduct(productData);
      
      return res.status(201).json({
        success: true,
        data: newProduct,
        message: 'Producto creado exitosamente'
      });
    } catch (error) {
      console.error('Error al crear producto:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al crear producto',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async updateProduct(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const id = parseInt(req.params['id'] as string);
      const { 
        nombre, 
        descripcion, 
        categoria_id, 
        unidad_medida, 
        stock_actual, 
        stock_minimo, 
        precio_referencia, 
        activo 
      }: ProductoUpdateDTO = req.body;
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de producto inválido'
        });
      }
      
      // Validar que el producto existe
      const existingProduct = await ProductoService.getProductById(id);
      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }
      
      // Validar nombre si se está actualizando
      if (nombre !== undefined) {
        if (nombre.trim().length === 0) {
          return res.status(400).json({
            success: false,
            message: 'El nombre del producto no puede estar vacío'
          });
        }
        
        if (nombre.length > 200) {
          return res.status(400).json({
            success: false,
            message: 'El nombre del producto no puede exceder 200 caracteres'
          });
        }
        
        // Verificar si ya existe otro producto con ese nombre
        const productWithSameName = await ProductoService.getProductByNombre(nombre.trim());
        if (productWithSameName && productWithSameName.id !== id) {
          return res.status(409).json({
            success: false,
            message: 'Ya existe otro producto con ese nombre'
          });
        }
      }
      
      // Validar unidad de medida si se está actualizando
      if (unidad_medida !== undefined) {
        if (unidad_medida.trim().length === 0) {
          return res.status(400).json({
            success: false,
            message: 'La unidad de medida del producto no puede estar vacía'
          });
        }
        
        if (unidad_medida.length > 20) {
          return res.status(400).json({
            success: false,
            message: 'La unidad de medida no puede exceder 20 caracteres'
          });
        }
      }
      
      // Validar categoría si se está actualizando
      if (categoria_id !== undefined) {
        const [categoriaRows] = await pool.execute<RowDataPacket[]>(
          'SELECT id FROM categorias_producto WHERE id = ? AND activo = 1',
          [categoria_id]
        );
        
        if (categoriaRows.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'La categoría especificada no existe o está inactiva'
          });
        }
      }
      
      const productData: ProductoUpdateDTO = {};
      if (nombre !== undefined) productData.nombre = nombre.trim();
      if (descripcion !== undefined) productData.descripcion = descripcion.trim() || '';
      if (categoria_id !== undefined) productData.categoria_id = categoria_id;
      if (unidad_medida !== undefined) productData.unidad_medida = unidad_medida.trim();
      if (stock_actual !== undefined) productData.stock_actual = stock_actual;
      if (stock_minimo !== undefined) productData.stock_minimo = stock_minimo;
      if (precio_referencia !== undefined) productData.precio_referencia = precio_referencia;
      if (activo !== undefined) productData.activo = activo;
      
      const updatedProduct = await ProductoService.updateProduct(id, productData);
      
      return res.json({
        success: true,
        data: updatedProduct,
        message: 'Producto actualizado exitosamente'
      });
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar producto',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async deleteProduct(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const id = parseInt(req.params['id'] as string);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de producto inválido'
        });
      }
      
      // Validar que el producto existe
      const existingProduct = await ProductoService.getProductById(id);
      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }
      
      const deleted = await ProductoService.deleteProduct(id);
      
      if (!deleted) {
        return res.status(500).json({
          success: false,
          message: 'Error al eliminar producto'
        });
      }
      
      return res.json({
        success: true,
        message: 'Producto eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar producto',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }

  static async getProductStats(_req: Request, res: Response): Promise<Response> {
    try {
      const totalProducts = await ProductoService.countActiveProducts();
      const lowStockProducts = await ProductoService.countLowStockProducts();
      
      return res.json({
        success: true,
        data: {
          totalProductosActivos: totalProducts,
          totalProductosBajoStock: lowStockProducts
        },
        message: 'Estadísticas de productos obtenidas exitosamente'
      });
    } catch (error) {
      console.error('Error al obtener estadísticas de productos:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas de productos',
        error: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
      });
    }
  }
}