import { Router } from 'express';
import { TipoMovimientoController } from '../controllers/TipoMovimientoController';
import { authenticateToken } from '../../../shared/middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/tipos-movimiento/stats/count', TipoMovimientoController.getTipoMovimientoStats);
router.get('/tipos-movimiento/afecta-stock/:afectaStock', TipoMovimientoController.getTiposMovimientoByAfectaStock);
router.get('/tipos-movimiento/:id', TipoMovimientoController.getTipoMovimientoById);
router.get('/tipos-movimiento', TipoMovimientoController.getAllTiposMovimiento);
router.post('/tipos-movimiento', TipoMovimientoController.createTipoMovimiento);
router.put('/tipos-movimiento/:id', TipoMovimientoController.updateTipoMovimiento);
router.delete('/tipos-movimiento/:id', TipoMovimientoController.deleteTipoMovimiento);

export default router;