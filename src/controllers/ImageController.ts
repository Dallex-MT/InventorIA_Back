import { Request, Response } from 'express';
import multer from 'multer';
import { ImageProcessingService } from '../services/ImageProcessingService';
import { FacturaProcesadaResponse } from '../models/FacturaProcesada';

// Configurar multer para manejar archivos en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB límite
  },
  fileFilter: (_req, file, cb) => {
    if (ImageProcessingService.isValidImage(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no válido. Solo se permiten imágenes (JPEG, PNG, GIF, WEBP)'));
    }
  }
});

// Middleware para manejar un solo archivo con el nombre 'image'
export const uploadImage = (req: Request, res: Response, next: any): void => {
  upload.single('image')(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({
            success: false,
            message: 'El archivo es demasiado grande. El tamaño máximo permitido es 10MB'
          } as FacturaProcesadaResponse);
          return;
        }
        res.status(400).json({
          success: false,
          message: `Error al subir el archivo: ${err.message}`
        } as FacturaProcesadaResponse);
        return;
      }
      // Error de validación de tipo de archivo
      res.status(400).json({
        success: false,
        message: err.message || 'Error al procesar el archivo'
      } as FacturaProcesadaResponse);
      return;
    }
    next();
  });
};

export class ImageController {
  /**
   * Procesa una imagen de factura y extrae la información estructurada
   */
  static async processImage(req: Request, res: Response): Promise<Response> {
    let tempFilePath: string | null = null;

    try {
      // Verificar que se haya subido un archivo
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionó ninguna imagen. Por favor, envía un archivo con el nombre "image"'
        } as FacturaProcesadaResponse);
      }

      const file = req.file;

      // Validar tipo de archivo
      if (!ImageProcessingService.isValidImage(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de archivo no válido. Solo se permiten imágenes (JPEG, PNG, GIF, WEBP)'
        } as FacturaProcesadaResponse);
      }

      // Validar tamaño del archivo
      if (file.size === 0) {
        return res.status(400).json({
          success: false,
          message: 'El archivo está vacío'
        } as FacturaProcesadaResponse);
      }

      console.log(`Procesando imagen: ${file.originalname} (${file.size} bytes, ${file.mimetype})`);

      // Guardar archivo temporalmente
      tempFilePath = await ImageProcessingService.saveTemporaryFile(
        file.buffer,
        file.originalname
      );

      console.log(`Imagen guardada temporalmente en: ${tempFilePath}`);

      // Procesar la imagen con Ollama
      const facturaData = await ImageProcessingService.processInvoiceImage(tempFilePath);

      // Eliminar archivo temporal después del procesamiento exitoso
      await ImageProcessingService.deleteTemporaryFile(tempFilePath);
      tempFilePath = null;

      // Retornar respuesta exitosa
      return res.json({
        success: true,
        data: facturaData,
        message: 'Factura procesada exitosamente'
      } as FacturaProcesadaResponse);

    } catch (error) {
      // Asegurar que el archivo temporal se elimine en caso de error
      if (tempFilePath) {
        await ImageProcessingService.deleteTemporaryFile(tempFilePath);
      }

      console.error('Error al procesar imagen:', error);

      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al procesar la imagen';

      // Determinar código de estado apropiado
      let statusCode = 500;
      if (errorMessage.includes('No se proporcionó') || 
          errorMessage.includes('no válido') || 
          errorMessage.includes('vacío')) {
        statusCode = 400;
      } else if (errorMessage.includes('no existe')) {
        statusCode = 404;
      }

      return res.status(statusCode).json({
        success: false,
        message: 'Error al procesar la imagen de la factura',
        error: process.env['NODE_ENV'] === 'development' ? errorMessage : undefined
      } as FacturaProcesadaResponse);
    }
  }
}

