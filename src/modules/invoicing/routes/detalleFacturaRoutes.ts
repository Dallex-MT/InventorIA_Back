import { Router } from 'express';
import { authenticateToken } from '../../../shared/middleware/auth';
import { DetalleFacturaController } from '../controllers/DetalleFacturaController';

const router = Router();

router.use(authenticateToken);

router.get('/detalles-factura', DetalleFacturaController.getAllDetallesFactura);
router.get('/detalles-factura/:id', DetalleFacturaController.getDetalleFacturaById);
router.get('/detalles-factura/factura/:factura_id', DetalleFacturaController.getDetallesByFacturaId);
router.get('/detalles-factura/producto/:producto_id', DetalleFacturaController.getDetallesByProductoId);
router.post('/detalles-factura', DetalleFacturaController.createDetalleFactura);
router.put('/detalles-factura/:id', DetalleFacturaController.updateDetalleFactura);
router.delete('/detalles-factura/:id', DetalleFacturaController.deleteDetalleFactura);

export default router;