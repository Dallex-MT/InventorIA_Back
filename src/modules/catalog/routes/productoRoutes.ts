import { Router } from 'express';
import { ProductoController } from '../controllers/ProductoController';
import { authenticateToken } from '../../../shared/middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/productos/stats/count', ProductoController.getProductStats);
router.get('/productos/categoria/:categoriaId', ProductoController.getProductsByCategoria);
router.get('/productos/:id', ProductoController.getProductById);
router.get('/productos', ProductoController.getAllProducts);
router.post('/productos', ProductoController.createProduct);
router.put('/productos/:id', ProductoController.updateProduct);
router.delete('/productos/:id', ProductoController.deleteProduct);

export default router;