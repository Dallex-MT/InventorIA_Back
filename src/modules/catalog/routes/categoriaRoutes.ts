import { Router } from 'express';
import { CategoriaController } from '../controllers/CategoriaController';
import { authenticateToken } from '../../../shared/middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/categorias/stats/count', CategoriaController.getCategoriaStats);
router.get('/categorias/:id', CategoriaController.getCategoriaById);
router.get('/categorias', CategoriaController.getAllCategorias);
router.post('/categorias', CategoriaController.createCategoria);
router.put('/categorias/:id', CategoriaController.updateCategoria);
router.delete('/categorias/:id', CategoriaController.deleteCategoria);

export default router;