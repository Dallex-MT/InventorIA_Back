import { Router } from 'express';
import { ImageController } from '../controllers/ImageController';
import { authenticateToken } from '../../../shared/middleware/auth';
import { upload } from '../../../shared/middleware/upload';

const router = Router();

// Ruta para procesar imágenes de facturas
router.post('/images/process', authenticateToken, upload, ImageController.processImage);

export default router;
