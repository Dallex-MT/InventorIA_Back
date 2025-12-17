import { Router } from 'express';
import { IAController } from '../controllers/IAController';
import { MotivationalMessageController } from '../controllers/MotivationalMessageController';
import { authenticateToken } from '../../../shared/middleware/auth';
import { upload } from '../../../shared/middleware/upload';

const router = Router();

router.use(authenticateToken);

// Ruta para procesar imágenes de facturas
router.post('/images/process', upload, IAController.processImage);

// Ruta para obtener el último mensaje motivacional generado
router.get('/motivational-message', MotivationalMessageController.getMotivationalMessage);

export default router;
