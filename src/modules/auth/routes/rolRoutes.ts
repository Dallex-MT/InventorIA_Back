import { Router } from 'express';
import { RolController } from '../controllers/RolController';
import { authenticateToken, requireAdmin } from '../../../shared/middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/permisos', RolController.getAllPermisos);
router.get('/roles/stats/count', RolController.getRoleStats);
router.get('/roles/:id', RolController.getRoleById);
router.get('/roles', RolController.getAllRoles);
router.post('/roles', requireAdmin, RolController.createRole);
router.put('/roles/:id', requireAdmin, RolController.updateRole);
router.delete('/roles/:id', requireAdmin, RolController.deleteRole);

export default router;