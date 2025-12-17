import ollama from 'ollama';
import { logAppEvent } from '../../../shared/utils/logger';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 segundos

export class MotivationalMessageService {
  // Modelo para generación de texto (chat)
  // Puede ser configurado mediante variable de entorno
  private static readonly MODEL_NAME = process.env['OLLAMA_CHAT_MODEL']??'';
  
  private static readonly PROMPT = `Genera un mensaje de motivación corto y positivo (máximo 150 caracteres). 
El mensaje debe ser inspirador, alentador y apropiado para un entorno laboral. 
Responde SOLO con el mensaje, sin explicaciones adicionales, sin comillas, sin formato especial.`;

  /**
   * Genera un mensaje de motivación usando Ollama
   * @returns Mensaje de motivación generado
   */
  static async generateMotivationalMessage(): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {

        // Llamar a Ollama para generar el mensaje
        const response = await ollama.chat({
          model: this.MODEL_NAME,
          messages: [
            {
              role: 'user',
              content: this.PROMPT
            }
          ]
        });

        // Extraer el contenido de la respuesta
        const content = response.message.content;

        if (!content) {
          throw new Error('La respuesta de Ollama está vacía');
        }

        // Limpiar el contenido (eliminar comillas, espacios extra, etc.)
        let message = content.trim();
        
        // Eliminar comillas si están al inicio y final
        if ((message.startsWith('"') && message.endsWith('"')) ||
            (message.startsWith("'") && message.endsWith("'"))) {
          message = message.slice(1, -1).trim();
        }

        // Limitar a 150 caracteres si excede
        if (message.length > 150) {
          message = message.substring(0, 147) + '...';
        }
        return message;

      } catch (error) {
        lastError = error as Error;
        logAppEvent('error', `Error al generar mensaje motivacional (intento ${attempt}):`, {
          error: error instanceof Error ? error.message : 'Error desconocido'
        });

        // Si no es el último intento, esperar antes de reintentar
        if (attempt < MAX_RETRIES) {
          await this.delay(RETRY_DELAY);
        }
      }
    }

    // Si todos los intentos fallaron, lanzar el último error
    throw new Error(
      `Error al generar mensaje motivacional después de ${MAX_RETRIES} intentos: ${lastError?.message || 'Error desconocido'}`
    );
  }

  /**
   * Verifica la conexión con Ollama y carga el modelo si es necesario
   * @returns true si la conexión es exitosa
   */
  static async initializeOllama(): Promise<boolean> {
    try {
      const response = await ollama.chat({
        model: this.MODEL_NAME,
        messages: [
          {
            role: 'user',
            content: 'Hola'
          }
        ]
      });

      if (response && response.message) {
        return true;
      }

      throw new Error('Respuesta inválida de Ollama');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Utilidad para esperar un tiempo determinado
   * @param ms Milisegundos a esperar
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

