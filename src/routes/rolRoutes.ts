import { Router } from 'express';
import { RolController } from '../controllers/RolController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Rutas públicas (solo lectura) - Orden específico a general
router.get('/roles/stats/count', RolController.getRoleStats);
router.get('/roles/:id', RolController.getRoleById);
router.get('/roles', RolController.getAllRoles);

// Rutas protegidas (requieren autenticación)
router.post('/roles', authenticateToken, RolController.createRole);
router.put('/roles/:id', authenticateToken, RolController.updateRole);
router.delete('/roles/:id', authenticateToken, RolController.deleteRole);

export default router;