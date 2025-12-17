import { Request, Response } from 'express';
import { ImageProcessingService } from '../services/IAService';
import { ProductoEnrichmentService } from '../services/ProductoEnrichmentService';
import { FacturaInternaService } from '../services/FacturaInternaService';
import { logAppEvent } from '../../../shared/utils/logger';
import { FacturaProcesadaResponse } from '../models/FacturaProcesada';

export class IAController {
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

      const processedCodigo = facturaData.codigo_interno.replace(/[-_]/g, '');
      const exists = await FacturaInternaService.existsCodigoInternoCaseSensitive(processedCodigo);
      if (exists) {
        logAppEvent('warn', 'Código interno existente', { codigo_interno: processedCodigo });
        if (tempFilePath) {
          await ImageProcessingService.deleteTemporaryFile(tempFilePath);
          tempFilePath = null;
        }
        return res.status(409).json({
          success: false,
          message: 'El registro ya existe'
        } as FacturaProcesadaResponse);
      }
      logAppEvent('info', 'Código interno nuevo', { codigo_interno: processedCodigo });
      facturaData.codigo_interno = processedCodigo;

      const enrichedData = await ProductoEnrichmentService.enrichFactura(facturaData);

      // Eliminar archivo temporal después del procesamiento exitoso
      await ImageProcessingService.deleteTemporaryFile(tempFilePath);
      tempFilePath = null;

      // Retornar respuesta exitosa
      return res.json({
        success: true,
        data: enrichedData,
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
