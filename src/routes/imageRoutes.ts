import { Router } from 'express';
import { ImageController, uploadImage } from '../controllers/ImageController';

const router = Router();

// Ruta para procesar imágenes de facturas
router.post('/images/process', uploadImage, ImageController.processImage);

export default router;

