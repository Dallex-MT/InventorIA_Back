import { Router } from 'express';
import { FacturaInternaController } from '../controllers/FacturaInternaController';
import { authenticateToken } from '../../../shared/middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/facturas-internas/stats', FacturaInternaController.getStats);
router.get('/facturas-internas/estado/:estado', FacturaInternaController.getFacturasByEstado);
router.get('/facturas-internas/tipo-movimiento/:tipo_movimiento_id', FacturaInternaController.getFacturasByTipoMovimiento);
router.get('/facturas-internas/:id', FacturaInternaController.getFacturaInternaById);
router.get('/facturas-internas', FacturaInternaController.getAllFacturasInternas);
router.post('/facturas-internas', FacturaInternaController.createFacturaInterna);
router.put('/facturas-internas/:id', FacturaInternaController.updateFacturaInterna);
router.delete('/facturas-internas/:id', FacturaInternaController.deleteFacturaInterna);
router.patch('/facturas-internas/:id/estado', FacturaInternaController.updateEstado);

export default router;