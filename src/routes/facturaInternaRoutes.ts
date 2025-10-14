import { Router } from 'express';
import { FacturaInternaController } from '../controllers/FacturaInternaController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Rutas públicas (solo lectura) - Orden específico a general
router.get('/facturas-internas/stats', FacturaInternaController.getStats);
router.get('/facturas-internas/estado/:estado', FacturaInternaController.getFacturasByEstado);
router.get('/facturas-internas/tipo-movimiento/:tipo_movimiento_id', FacturaInternaController.getFacturasByTipoMovimiento);
router.get('/facturas-internas/:id', FacturaInternaController.getFacturaInternaById);
router.get('/facturas-internas', FacturaInternaController.getAllFacturasInternas);

// Rutas protegidas (requieren autenticación)
router.post('/facturas-internas', authenticateToken, FacturaInternaController.createFacturaInterna);
router.put('/facturas-internas/:id', authenticateToken, FacturaInternaController.updateFacturaInterna);
router.delete('/facturas-internas/:id', authenticateToken, FacturaInternaController.deleteFacturaInterna);
router.patch('/facturas-internas/:id/estado', authenticateToken, FacturaInternaController.updateEstado);

export default router;