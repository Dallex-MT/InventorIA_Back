import winston from 'winston';
import 'winston-daily-rotate-file';
import { Request, Response } from 'express';

// Configuración de formatos personalizados
const { combine, timestamp, printf, colorize } = winston.format;

// Función para sanitizar datos sensibles
const sanitizeData = (obj: any): any => {
  const sensitiveFields = ['password', 'token', 'authorization', 'cookie', 'cedula', 'correo'];
  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeData(sanitized[key]);
    } else if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
};

// Formato personalizado para los logs
const customFormat = printf(({ level, message, timestamp, ...metadata }) => {
  const metadataStr = Object.keys(metadata).length
    ? `\n${JSON.stringify(metadata, null, 2)}`
    : '';
  
  return `${timestamp} [${level.toUpperCase()}]: ${message}${metadataStr}`;
});

// Configuración de los transportes
const fileTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '30d',
  maxSize: '20m',
  format: combine(
    timestamp(),
    customFormat
  )
});

const accessLogTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/access-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '30d',
  maxSize: '20m',
  format: combine(
    timestamp(),
    customFormat
  )
});

const errorLogTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '30d',
  maxSize: '20m',
  level: 'error',
  format: combine(
    timestamp(),
    customFormat
  )
});

// Configuración del logger principal
export const logger = winston.createLogger({
  level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp(),
    customFormat
  ),
  transports: [
    fileTransport,
    errorLogTransport,
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp(),
        customFormat
      )
    })
  ]
});

// Logger específico para accesos HTTP
export const accessLogger = winston.createLogger({
  format: combine(
    timestamp(),
    customFormat
  ),
  transports: [
    accessLogTransport,
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp(),
        customFormat
      )
    })
  ]
});

// Middleware para logging de acceso HTTP
export const httpLogger = (req: Request, res: Response, next: Function) => {
  // Captura el tiempo de inicio
  const start = Date.now();

  // Cuando la respuesta termine
  res.on('finish', () => {
    // Calcula la duración
    const duration = Date.now() - start;

    // Sanitiza los headers y query params
    const sanitizedHeaders = sanitizeData(req.headers);
    const sanitizedQuery = sanitizeData(req.query);

    // Crea el log de acceso
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent') || 'unknown',
      query: sanitizedQuery,
      headers: sanitizedHeaders
    };

    // Log el acceso
    accessLogger.info('HTTP Access', logData);
  });

  next();
};

// Función helper para logs de aplicación
export const logAppEvent = (
  level: string,
  message: string,
  metadata?: any
) => {
  const sanitizedMetadata = metadata ? sanitizeData(metadata) : {};
  logger.log(level, message, sanitizedMetadata);
};