import { Router } from 'express';
import { CategoriaController } from '../controllers/CategoriaController';
import { authenticateToken } from '../../../shared/middleware/auth';

const router = Router();

// Rutas públicas (solo lectura) - Orden específico a general
router.get('/categorias/stats/count', CategoriaController.getCategoriaStats);
router.get('/categorias/:id', CategoriaController.getCategoriaById);
router.get('/categorias', CategoriaController.getAllCategorias);

// Rutas protegidas (requieren autenticación)
router.post('/categorias', authenticateToken, CategoriaController.createCategoria);
router.put('/categorias/:id', authenticateToken, CategoriaController.updateCategoria);
router.delete('/categorias/:id', authenticateToken, CategoriaController.deleteCategoria);

export default router;