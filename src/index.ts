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
import facturaInternaRoutes from './modules/invoicing/routes/facturaInternaRoutes';
import detalleFacturaRoutes from './modules/invoicing/routes/detalleFacturaRoutes';
import imageRoutes from './modules/invoicing/routes/imageRoutes';

// Asegurarse de que existe el directorio de logs
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

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
app.use('/api', tipoMovimientoRoutes);
app.use('/api', facturaInternaRoutes);
app.use('/api', detalleFacturaRoutes);
app.use('/api', imageRoutes);

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

const startServer = async () => {
  try {
    logAppEvent('info', '🚀 Iniciando servidor...');

    logAppEvent('info', '🔍 Probando conexión a base de datos...');
    await testConnection();
    logAppEvent('info', '✅ Conexión a base de datos exitosa');

    logAppEvent('info', '🔌 Inicializando servidor WebSocket...');
    initWebSocketServer();
    logAppEvent('info', '✅ Servidor WebSocket iniciado');

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

startServer();

export default app;