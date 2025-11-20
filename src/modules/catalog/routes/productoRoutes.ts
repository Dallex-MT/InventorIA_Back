import { Router } from 'express';
import { ProductoController } from '../controllers/ProductoController';
import { authenticateToken } from '../../../shared/middleware/auth';

const router = Router();

// Rutas públicas (lectura)
router.get('/productos/stats/count', ProductoController.getProductStats);
router.get('/productos/categoria/:categoriaId', ProductoController.getProductsByCategoria);
router.get('/productos/:id', ProductoController.getProductById);
router.get('/productos', ProductoController.getAllProducts);

// Rutas protegidas (requieren autenticación)
router.post('/productos', authenticateToken, ProductoController.createProduct);
router.put('/productos/:id', authenticateToken, ProductoController.updateProduct);
router.delete('/productos/:id', authenticateToken, ProductoController.deleteProduct);

export default router;