import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { isValidImage } from '../utils/validation';

// Interface for response (simplified to avoid dependency on module models)
interface UploadResponse {
    success: boolean;
    message: string;
}

// Configurar multer para manejar archivos en memoria
const uploadConfig = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB límite
    },
    fileFilter: (_req, file, cb) => {
        if (isValidImage(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no válido. Solo se permiten imágenes (JPEG, PNG, GIF, WEBP)'));
        }
    }
});

// Middleware para manejar un solo archivo con el nombre 'image'
export const upload = (req: Request, res: Response, next: NextFunction): void => {
    uploadConfig.single('image')(req, res, (err: any) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    res.status(400).json({
                        success: false,
                        message: 'El archivo es demasiado grande. El tamaño máximo permitido es 10MB'
                    } as UploadResponse);
                    return;
                }
                res.status(400).json({
                    success: false,
                    message: `Error al subir el archivo: ${err.message}`
                } as UploadResponse);
                return;
            }
            // Error de validación de tipo de archivo
            res.status(400).json({
                success: false,
                message: err.message || 'Error al procesar el archivo'
            } as UploadResponse);
            return;
        }
        next();
    });
};
