import ollama from 'ollama';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { FacturaProcesada } from '../models/FacturaProcesada';

// Schema de validación para la respuesta de la factura
const facturaSchema = z.object({
  codigo_interno: z.string(),
  concepto: z.enum(['materiales', 'equipos', 'servicios', 'otros']),
  fecha_movimiento: z.string().regex(/^\d{2}-\d{2}-\d{4}$/), // DD-MM-YYYY
  total: z.number(),
  observaciones: z.string().max(100),
  productos: z.array(
    z.object({
      nombre: z.string(),
      unidad_medida: z.string(),
      cantidad: z.number().int(),
      precio_unitario: z.number()
    })
  )
});

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 segundos

export class ImageProcessingService {
  private static readonly MODEL_NAME = process.env['OLLAMA_CHAT_MODEL']??'';
  private static readonly PROMPT = `Analiza únicamente la información contenida en la factura visible en la imagen y devuelve SOLO un objeto JSON válido, sin texto adicional, sin explicaciones, sin comentarios, sin markdown.
Reglas estrictas:
- codigo_interno: concatena el nombre de la empresa emisora en MAYÚSCULAS, sin tildes ni caracteres especiales + todo el número de factura COMPLETO (ejemplo: EMPRESASINESPACIO-0001-11212-212).
- concepto: clasifica en UNA categoría: "materiales", "equipos", "servicios", "otros".
- fecha_movimiento: usa la fecha principal de emisión o transacción en formato DD-MM-YYYY.
- total: monto total a pagar como número (usa punto como separador decimal).
- observaciones: descripción breve de la factura (máx. 200 caracteres).
- productos: lista de ítems en un array. Cada ítem debe contener:
- nombre: el nombre completo del producto/servicio es el DETALLE O DESCRIPCIÓN (Sin tildes ni letras especiales). Si no existe, usa el código del producto.
- unidad_medida: tipo de unidad (ejemplo: "kg", "unidad").
- cantidad: número entero, calculado dividiendo el valor/precio total del producto entre el precio unitario para asegurar precisión.
- precio_unitario: número con 2 decimales.
Formato JSON esperado:
{
  "codigo_interno": "string",
  "concepto": "materiales|equipos|servicios|otros",
  "fecha_movimiento": "DD-MM-YYYY",
  "total": 0.00,
  "observaciones": "string",
  "productos": [
    {
      "nombre": "string",
      "unidad_medida": "string",
      "cantidad": 0,
      "precio_unitario": 0.00
    }
  ]
}
Responde ÚNICAMENTE con el JSON válido.`;

  /**
   * Procesa una imagen de factura y extrae la información estructurada
   * @param imagePath Ruta temporal de la imagen
   * @returns Datos de la factura procesada
   */
  static async processInvoiceImage(imagePath: string): Promise<FacturaProcesada> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`Intento ${attempt} de ${MAX_RETRIES} para procesar la imagen`);

        // Verificar que el archivo existe
        if (!fs.existsSync(imagePath)) {
          throw new Error(`La imagen no existe en la ruta: ${imagePath}`);
        }

        // Convertir la imagen a base64 para enviarla a Ollama
        const imageBuffer = fs.readFileSync(imagePath);
        const imageBase64 = imageBuffer.toString('base64');

        // Llamar a Ollama con el modelo de visión (sin formato estructurado para evitar errores de vocabulario)
        const response = await ollama.chat({
          model: this.MODEL_NAME,
          messages: [
            {
              role: 'user',
              content: this.PROMPT,
              images: [imageBase64]
            }
          ]
          // No usar format para evitar el error "failed to load model vocabulary required for format"
        });

        // Extraer el contenido de la respuesta
        const content = response.message.content;

        if (!content) {
          throw new Error('La respuesta de Ollama está vacía');
        }

        // Intentar parsear el JSON (puede venir con markdown o texto adicional)
        let jsonContent = content.trim();

        // Eliminar markdown code blocks si existen
        if (jsonContent.startsWith('```json')) {
          jsonContent = jsonContent.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
        } else if (jsonContent.startsWith('```')) {
          jsonContent = jsonContent.replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
        }

        // Intentar extraer JSON si está embebido en texto
        const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonContent = jsonMatch[0];
        }

        // Parsear el JSON
        let parsedData: any;
        try {
          parsedData = JSON.parse(jsonContent);
        } catch (parseError) {
          throw new Error(`Error al parsear JSON: ${parseError instanceof Error ? parseError.message : 'Error desconocido'}. Contenido recibido: ${jsonContent.substring(0, 200)}`);
        }

        // Validar con Zod
        const validatedData = facturaSchema.parse(parsedData);

        console.log(`Imagen procesada exitosamente en el intento ${attempt}`);
        return validatedData;

      } catch (error) {
        lastError = error as Error;
        console.error(`Error en intento ${attempt}:`, error);

        // Si no es el último intento, esperar antes de reintentar
        if (attempt < MAX_RETRIES) {
          console.log(`Esperando ${RETRY_DELAY}ms antes del siguiente intento...`);
          await this.delay(RETRY_DELAY);
        }
      }
    }

    // Si todos los intentos fallaron, lanzar el último error
    throw new Error(
      `Error al procesar la imagen después de ${MAX_RETRIES} intentos: ${lastError?.message || 'Error desconocido'}`
    );
  }

  /**
   * Guarda temporalmente un archivo en el directorio /tmp
   * @param fileBuffer Buffer del archivo
   * @param originalName Nombre original del archivo
   * @returns Ruta del archivo guardado
   */
  static async saveTemporaryFile(fileBuffer: Buffer, originalName: string): Promise<string> {
    // Asegurar que el directorio tmp existe
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    // Generar un nombre único para el archivo temporal
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(originalName) || '.jpg';
    const fileName = `invoice_${timestamp}_${randomString}${extension}`;
    const filePath = path.join(tmpDir, fileName);

    // Guardar el archivo
    fs.writeFileSync(filePath, fileBuffer);

    return filePath;
  }

  /**
   * Elimina un archivo temporal
   * @param filePath Ruta del archivo a eliminar
   */
  static async deleteTemporaryFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Archivo temporal eliminado: ${filePath}`);
      }
    } catch (error) {
      console.error(`Error al eliminar archivo temporal ${filePath}:`, error);
      // No lanzar error, solo registrar
    }
  }

  /**
   * Valida que un archivo sea una imagen válida
   * @param mimetype Tipo MIME del archivo
   * @returns true si es una imagen válida
   */
  static isValidImage(mimetype: string): boolean {
    const validMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    return validMimeTypes.includes(mimetype.toLowerCase());
  }

  /**
   * Utilidad para esperar un tiempo determinado
   * @param ms Milisegundos a esperar
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

