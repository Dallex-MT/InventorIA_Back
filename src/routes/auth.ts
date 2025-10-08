import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.get('/me', authenticateToken, (req, res) => authController.me(req, res));
router.post('/logout', authenticateToken, (req, res) => authController.logout(req, res));
router.put('/profile', authenticateToken, (req, res) => authController.updateProfile(req, res));

export default router;