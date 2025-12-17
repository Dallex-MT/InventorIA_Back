import { Router } from 'express';
import { UnidadMedidaController } from '../controllers/UnidadMedidaController';
import { authenticateToken } from '../../../shared/middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/unidad-medida', UnidadMedidaController.getAllUnidadesMedida);
router.get('/unidad-medida/:id', UnidadMedidaController.getUnidadMedidaById);
router.post('/unidad-medida', UnidadMedidaController.createUnidadMedida);
router.put('/unidad-medida/:id', UnidadMedidaController.updateUnidadMedida);
router.delete('/unidad-medida/:id', UnidadMedidaController.deleteUnidadMedida);

export default router;
