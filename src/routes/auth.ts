import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

// Rutas públicas
router.post('/auth/login', (req, res) => authController.login(req, res));

// Rutas que requieren autenticación
router.get('/auth/me', authenticateToken, (req, res) => authController.me(req, res));
router.post('/auth/logout', authenticateToken, (req, res) => authController.logout(req, res));
router.put('/profile', authenticateToken, (req, res) => authController.updateProfile(req, res));
router.put('/update-password', authenticateToken, (req, res) => authController.updatePassword(req, res));
router.delete('/users/:userId', authenticateToken, (req, res) => authController.deactivateUser(req, res));

// Rutas que requieren autenticación y rol de administrador
router.post('/register' , authenticateToken, requireAdmin, (req, res) => authController.register(req, res));
router.get('/users', authenticateToken, requireAdmin, (req, res) => authController.listUsers(req, res));

export default router;