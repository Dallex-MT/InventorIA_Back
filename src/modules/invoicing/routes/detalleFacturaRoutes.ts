import { Router } from 'express';
import { authenticateToken } from '../../../shared/middleware/auth';
import { DetalleFacturaController } from '../controllers/DetalleFacturaController';

const router = Router();

// Rutas públicas (solo lectura)
router.get('/detalles-factura', DetalleFacturaController.getAllDetallesFactura);
router.get('/detalles-factura/:id', DetalleFacturaController.getDetalleFacturaById);
router.get('/detalles-factura/factura/:factura_id', DetalleFacturaController.getDetallesByFacturaId);
router.get('/detalles-factura/producto/:producto_id', DetalleFacturaController.getDetallesByProductoId);

// Rutas protegidas (requieren autenticación)
router.post('/detalles-factura', authenticateToken, DetalleFacturaController.createDetalleFactura);
router.put('/detalles-factura/:id', authenticateToken, DetalleFacturaController.updateDetalleFactura);
router.delete('/detalles-factura/:id', authenticateToken, DetalleFacturaController.deleteDetalleFactura);

export default router;