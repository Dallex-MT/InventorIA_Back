import { Request, Response } from 'express';
import { MotivationalMessageService } from '../services/MotivationalMessageService';

// Variable global para almacenar el último mensaje generado
let lastMotivationalMessage: string | null = null;
let lastMessageTimestamp: Date | null = null;

/**
 * Establece el último mensaje motivacional generado
 * @param message Mensaje a almacenar
 */
export function setLastMotivationalMessage(message: string): void {
  lastMotivationalMessage = message;
  lastMessageTimestamp = new Date();
}

/**
 * Obtiene el último mensaje motivacional generado
 * @returns Objeto con el mensaje y timestamp, o null si no hay mensaje
 */
export function getLastMotivationalMessage(): { message: string; timestamp: Date } | null {
  if (!lastMotivationalMessage || !lastMessageTimestamp) {
    return null;
  }
  return {
    message: lastMotivationalMessage,
    timestamp: lastMessageTimestamp
  };
}

export class MotivationalMessageController {
  /**
   * Obtiene el último mensaje motivacional generado
   */
  static async getMotivationalMessage(_req: Request, res: Response): Promise<Response> {
    try {
      const lastMessage = getLastMotivationalMessage();

      if (!lastMessage) {
        return res.status(404).json({
          success: false,
          message: 'Aún no se ha generado ningún mensaje motivacional'
        });
      }

      return res.json({
        success: true,
        data: {
          message: lastMessage.message,
          timestamp: lastMessage.timestamp.toISOString()
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al obtener el mensaje motivacional',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Genera un nuevo mensaje motivacional manualmente (opcional, para testing)
   */
  static async generateMotivationalMessage(_req: Request, res: Response): Promise<Response> {
    try {
      const message = await MotivationalMessageService.generateMotivationalMessage();
      setLastMotivationalMessage(message);

      return res.json({
        success: true,
        data: {
          message: message,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al generar el mensaje motivacional',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
}

