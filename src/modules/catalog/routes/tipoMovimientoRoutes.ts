import { Router } from 'express';
import { TipoMovimientoController } from '../controllers/TipoMovimientoController';
import { authenticateToken } from '../../../shared/middleware/auth';

const router = Router();

// Rutas públicas (lectura)
router.get('/tipos-movimiento/stats/count', TipoMovimientoController.getTipoMovimientoStats);
router.get('/tipos-movimiento/afecta-stock/:afectaStock', TipoMovimientoController.getTiposMovimientoByAfectaStock);
router.get('/tipos-movimiento/:id', TipoMovimientoController.getTipoMovimientoById);
router.get('/tipos-movimiento', TipoMovimientoController.getAllTiposMovimiento);

// Rutas protegidas (requieren autenticación)
router.post('/tipos-movimiento', authenticateToken, TipoMovimientoController.createTipoMovimiento);
router.put('/tipos-movimiento/:id', authenticateToken, TipoMovimientoController.updateTipoMovimiento);
router.delete('/tipos-movimiento/:id', authenticateToken, TipoMovimientoController.deleteTipoMovimiento);

export default router;