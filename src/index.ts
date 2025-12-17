import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { testConnection } from './shared/utils/database';
import { httpLogger, logAppEvent } from './shared/utils/logger';
import { initWebSocketServer } from './shared/websocket/server';
import authRoutes from './modules/auth/routes/auth';
import rolRoutes from './modules/auth/routes/rolRoutes';
import categoriaRoutes from './modules/catalog/routes/categoriaRoutes';
import productoRoutes from './modules/catalog/routes/productoRoutes';
import tipoMovimientoRoutes from './modules/catalog/routes/tipoMovimientoRoutes';
import unidadMedidaRoutes from './modules/catalog/routes/unidadMedidaRoutes';
import facturaInternaRoutes from './modules/invoicing/routes/facturaInternaRoutes';
import detalleFacturaRoutes from './modules/invoicing/routes/detalleFacturaRoutes';
import iaRoutes from './modules/invoicing/routes/iaRoutes';
import { MotivationalMessageService } from './modules/invoicing/services/MotivationalMessageService';
import { setLastMotivationalMessage } from './modules/invoicing/controllers/MotivationalMessageController';

// Asegurarse de que existe el directorio de logs
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}
// ... (existing code)
dotenv.config();
const app = express();
const PORT = process.env['PORT'] || 3000;
app.use(helmet());
app.use(cors({
  origin: true, // Allow all origins in development, configure specific origins in production
  credentials: true // Allow cookies to be sent cross-site
}));
app.use(cookieParser());
// Implementar el nuevo sistema de logging
app.use(httpLogger);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.get('/health', (_req, res) => {
  logAppEvent('info', '🎯 Health check endpoint accessed');
  res.json({
    success: true,
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});
app.get('/test', (_req, res) => {
  logAppEvent('info', '🎯 Test endpoint accessed');
  res.json({
    success: true,
    message: 'Test route working'
  });
});

// Registro de rutas
logAppEvent('info', '📋 Registrando rutas...');
app.use('/api', authRoutes);
app.use('/api', rolRoutes);
app.use('/api', categoriaRoutes);
app.use('/api', productoRoutes);
app.use('/api', unidadMedidaRoutes);
app.use('/api', tipoMovimientoRoutes);
app.use('/api', facturaInternaRoutes);
app.use('/api', detalleFacturaRoutes);
app.use('/api', iaRoutes);

// Manejador de rutas no encontradas
app.use((req, res) => {
  logAppEvent('warn', `❌ Route not found: ${req.method} ${req.url}`);

  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// Manejador de errores global
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logAppEvent('error', 'Error no manejado', {
    error: err.message,
    stack: process.env['NODE_ENV'] === 'development' ? err.stack : undefined
  });

  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env['NODE_ENV'] === 'development' ? err.message : undefined
  });
});

// Variable para almacenar el temporizador de mensajes motivacionales
let motivationalMessageTimer: NodeJS.Timeout | null = null;

/**
 * Genera un mensaje motivacional y maneja errores con reconexión
 */
const generateMotivationalMessage = async (): Promise<void> => {
  try {
    const message = await MotivationalMessageService.generateMotivationalMessage();
    setLastMotivationalMessage(message);
  } catch (error) {
    logAppEvent('error', '❌ Error al generar mensaje motivacional:', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    });

    setTimeout(async () => {
      try {
        await MotivationalMessageService.initializeOllama();
        await generateMotivationalMessage();
      } catch (reconnectError) {
        logAppEvent('error', '❌ Error en reconexión con Ollama:', {
          error: reconnectError instanceof Error ? reconnectError.message : 'Error desconocido'
        });
      }
    }, 30000); // 30 segundos
  }
};

/**
 * Inicia el temporizador para generar mensajes motivacionales cada 4 minutos
 */
const startMotivationalMessageTimer = (): void => {
  const INTERVAL_MS = 4 * 60 * 1000; // 4 minutos en milisegundos

  generateMotivationalMessage();

  // Configurar el intervalo para generar mensajes cada 4 minutos
  motivationalMessageTimer = setInterval(() => {
    generateMotivationalMessage();
  }, INTERVAL_MS);
};

/**
 * Detiene el temporizador de mensajes motivacionales
 */
const stopMotivationalMessageTimer = (): void => {
  if (motivationalMessageTimer) {
    clearInterval(motivationalMessageTimer);
    motivationalMessageTimer = null;
    logAppEvent('info', '⏹️ Temporizador de mensajes motivacionales detenido');
  }
};

const startServer = async () => {
  try {
    logAppEvent('info', '🚀 Iniciando servidor...');

    // Inicializar Ollama de manera sincronizada antes de iniciar el servidor
    // Cargar ambos modelos simultáneamente: procesamiento de imágenes y mensajes motivacionales
    logAppEvent('info', '🤖 Inicializando servidor de Ollama con modelos...');

    // Inicializar ambos modelos en paralelo para carga simultánea
    const [ollamaInitialized] = await Promise.all([
      MotivationalMessageService.initializeOllama().catch(error => {
        logAppEvent('error', '❌ Error crítico al inicializar modelo de mensajes motivacionales:', {
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
        // Este modelo es crítico para la funcionalidad de mensajes motivacionales
        throw error;
      })
    ]);

    if (ollamaInitialized) {
      console.log('✅ Servidor de Ollama inicializado correctamente');
    } else {
      console.log('❌ Error al inicializar servidor de Ollama');
    }

    logAppEvent('info', '🔍 Probando conexión a base de datos...');
    await testConnection();
    logAppEvent('info', '✅ Conexión a base de datos exitosa');

    logAppEvent('info', '🔌 Inicializando servidor WebSocket...');
    initWebSocketServer();
    logAppEvent('info', '✅ Servidor WebSocket iniciado');

    // Iniciar el temporizador de mensajes motivacionales
    startMotivationalMessageTimer();

    app.listen(PORT, () => {
      logAppEvent('info', '🌐 Servidor iniciado', {
        port: PORT,
        environment: process.env['NODE_ENV'] || 'development',
        jwtConfigured: !!process.env['JWT_SECRET']
      });
    });
  } catch (error) {
    logAppEvent('error', '❌ Error al iniciar el servidor', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
  }
};

// Manejar cierre graceful del servidor
process.on('SIGTERM', () => {
  logAppEvent('info', '🛑 SIGTERM recibido, cerrando servidor...');
  stopMotivationalMessageTimer();
  process.exit(0);
});

process.on('SIGINT', () => {
  logAppEvent('info', '🛑 SIGINT recibido, cerrando servidor...');
  stopMotivationalMessageTimer();
  process.exit(0);
});

if (require.main === module) {
  startServer();
}

export default app;