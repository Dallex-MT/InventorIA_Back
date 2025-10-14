import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { testConnection } from './utils/database';
import authRoutes from './routes/auth';
import rolRoutes from './routes/rolRoutes';
import categoriaRoutes from './routes/categoriaRoutes';
import productoRoutes from './routes/productoRoutes';
import tipoMovimientoRoutes from './routes/tipoMovimientoRoutes';
import facturaInternaRoutes from './routes/facturaInternaRoutes';
import detalleFacturaRoutes from './routes/detalleFacturaRoutes';

dotenv.config();

const app = express();
const PORT = process.env['PORT'] || 3000;

app.use(helmet());
app.use(cors({
  origin: true, // Allow all origins in development, configure specific origins in production
  credentials: true // Allow cookies to be sent cross-site
}));
app.use(morgan('combined'));
app.use(cookieParser());

// Middleware de depuración para loggear todas las peticiones
app.use((req, _res, next) => {
  const logMessage = `📥 ${req.method} ${req.url} - ${new Date().toISOString()}`;
  console.log(logMessage);
  console.log(`📋 Request headers: ${JSON.stringify(req.headers)}`);
  
  // Also write to a file for debugging
  const fs = require('fs');
  fs.appendFileSync('debug.log', logMessage + '\n');
  
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
    console.log('🎯 HEALTH ROUTE HIT!');
    res.json({
        success: true,
        message: 'Servidor funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

app.get('/test', (_req, res) => {
    console.log('🎯 TEST ROUTE HIT!');
    res.json({
        success: true,
        message: 'Test route working'
    });
});

console.log('📋 Registering auth routes...');
app.use('/api/auth', authRoutes);

console.log('📋 Registering role routes...');
app.use('/api', rolRoutes);

console.log('📋 Registering category routes...');
app.use('/api', categoriaRoutes);

console.log('📋 Registering product routes...');
app.use('/api', productoRoutes);

console.log('📋 Registering tipo movimiento routes...');
app.use('/api', tipoMovimientoRoutes);

console.log('📋 Registering factura interna routes...');
app.use('/api', facturaInternaRoutes);

console.log('📋 Registering detalle factura routes...');
app.use('/api', detalleFacturaRoutes);

app.use((req, res) => {
  console.log(`❌ 404 ERROR: ${req.method} ${req.url} - No route matched`);
  
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error no manejado:', err);
  
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env['NODE_ENV'] === 'development' ? err.message : undefined
  });
});

const startServer = async () => {
  try {
    console.log('🚀 Iniciando servidor...');
    
    console.log('🔍 Probando conexión a base de datos...');
    await testConnection();
    console.log('✅ Conexión a base de datos exitosa');
    
    app.listen(PORT, () => {
      console.log(`🌐 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📊 Entorno: ${process.env['NODE_ENV'] || 'development'}`);
      console.log(`🔑 JWT Secret: ${process.env['JWT_SECRET'] ? 'Configurado' : 'No configurado'}`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();

export default app;