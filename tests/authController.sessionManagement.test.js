const { AuthController } = require('../src/controllers/AuthController');
const { UsuarioService } = require('../src/services/UsuarioService');
const { invalidateUserSessions } = require('../src/utils/tokenBlacklist');
const { clearTokens } = require('../src/utils/jwt');

// Mock de dependencias
jest.mock('../src/services/UsuarioService');
jest.mock('../src/utils/tokenBlacklist');
jest.mock('../src/utils/jwt');
jest.mock('../src/utils/password', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
  comparePassword: jest.fn().mockResolvedValue(true)
}));

// Mock del sistema de logging
const mockLogAppEvent = jest.fn();
jest.mock('../src/utils/logger', () => ({
  logAppEvent: (level, message, data) => mockLogAppEvent(level, message, data)
}));

describe('AuthController - deactivateUser with Session Management', () => {
  let authController;
  let mockUsuarioService;
  let mockRequest;
  let mockResponse;

  beforeEach(() => {
    // Limpiar mocks
    jest.clearAllMocks();
    
    // Crear instancias mock
    mockUsuarioService = new UsuarioService();
    authController = new AuthController();
    authController.usuarioService = mockUsuarioService;
    
    // Mock de respuesta HTTP
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis()
    };
    
    // Configurar mocks por defecto
    invalidateUserSessions.mockResolvedValue(2); // 2 tokens invalidados
    clearTokens.mockImplementation(() => {});
  });

  describe('User Self-Deactivation with Session Management', () => {
    test('should deactivate own account and invalidate sessions', async () => {
      // Configurar request para auto-desactivación
      mockRequest = {
        user: { userId: 1, rol_id: 2 }, // Usuario normal
        params: { userId: '1' } // Mismo ID
      };
      
      // Mock del usuario encontrado
      mockUsuarioService.findById.mockResolvedValue({
        id: 1,
        rol_id: 2
      });
      
      // Mock de desactivación exitosa
      mockUsuarioService.softDelete.mockResolvedValue({
        id: 1,
        nombre: 'Test User',
        email: 'test@example.com',
        activo: false
      });
      
      mockUsuarioService.toSafeUser.mockReturnValue({
        id: 1,
        nombre: 'Test User',
        email: 'test@example.com',
        activo: false
      });
      
      // Ejecutar
      await authController.deactivateUser(mockRequest, mockResponse);
      
      // Verificar que se invalidaron las sesiones
      expect(invalidateUserSessions).toHaveBeenCalledWith(1);
      expect(clearTokens).toHaveBeenCalledWith(mockResponse);
      
      // Verificar logs de auditoría
      expect(console.log).toHaveBeenCalledWith('[SESION] Iniciando limpieza de sesiones para usuario 1');
      expect(console.log).toHaveBeenCalledWith('[SESION] 2 tokens invalidados para usuario 1');
      expect(console.log).toHaveBeenCalledWith('[SESION] Cookies de tokens limpiadas para usuario 1');
      expect(console.log).toHaveBeenCalledWith('[AUDITORIA] Usuario 1 desactivó su cuenta - sesiones cerradas forzosamente');
      
      // Verificar respuesta exitosa
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Usuario desactivado exitosamente',
        user: {
          id: 1,
          nombre: 'Test User',
          email: 'test@example.com',
          activo: false
        }
      });
    });
    
    test('should continue deactivation even if session cleanup fails', async () => {
      // Configurar request
      mockRequest = {
        user: { userId: 1, rol_id: 2 },
        params: { userId: '1' }
      };
      
      // Simular error en la limpieza de sesiones
      invalidateUserSessions.mockRejectedValue(new Error('Session cleanup failed'));
      
      mockUsuarioService.findById.mockResolvedValue({
        id: 1,
        rol_id: 2
      });
      
      mockUsuarioService.softDelete.mockResolvedValue({
        id: 1,
        nombre: 'Test User',
        email: 'test@example.com',
        activo: false
      });
      
      mockUsuarioService.toSafeUser.mockReturnValue({
        id: 1,
        nombre: 'Test User',
        email: 'test@example.com',
        activo: false
      });
      
      // Ejecutar
      await authController.deactivateUser(mockRequest, mockResponse);
      
      // Verificar que se intentó la limpieza
      expect(invalidateUserSessions).toHaveBeenCalledWith(1);
      
      // Verificar que se logueó el error pero se continuó
      expect(console.error).toHaveBeenCalledWith(
        '[ERROR] Error al limpiar sesiones para usuario 1:',
        expect.any(Error)
      );
      
      // Verificar que la desactivación se completó
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Usuario desactivado exitosamente',
        user: expect.any(Object)
      });
    });
  });
  
  describe('Admin Deactivation (No Session Management)', () => {
    test('should deactivate other user without affecting sessions', async () => {
      // Configurar request para desactivación por admin
      mockRequest = {
        user: { userId: 1, rol_id: 1 }, // Administrador
        params: { userId: '2' } // Otro usuario
      };
      
      // Mock del usuario administrador
      mockUsuarioService.findById.mockResolvedValue({
        id: 1,
        rol_id: 1
      });
      
      // Mock de desactivación exitosa
      mockUsuarioService.softDelete.mockResolvedValue({
        id: 2,
        nombre: 'Other User',
        email: 'other@example.com',
        activo: false
      });
      
      mockUsuarioService.toSafeUser.mockReturnValue({
        id: 2,
        nombre: 'Other User',
        email: 'other@example.com',
        activo: false
      });
      
      // Ejecutar
      await authController.deactivateUser(mockRequest, mockResponse);
      
      // Verificar que NO se invalidaron sesiones para otros usuarios
      expect(invalidateUserSessions).not.toHaveBeenCalled();
      expect(clearTokens).not.toHaveBeenCalled();
      
      // Verificar respuesta exitosa
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Usuario desactivado exitosamente',
        user: expect.any(Object)
      });
    });
  });
  
  describe('Authorization Tests', () => {
    test('should reject non-admin trying to deactivate other user', async () => {
      // Configurar request para usuario normal intentando desactivar a otro
      mockRequest = {
        user: { userId: 2, rol_id: 2 }, // Usuario normal
        params: { userId: '3' } // Otro usuario
      };
      
      // Mock del usuario solicitante
      mockUsuarioService.findById.mockResolvedValue({
        id: 2,
        rol_id: 2 // No es admin
      });
      
      // Ejecutar
      await authController.deactivateUser(mockRequest, mockResponse);
      
      // Verificar que no se intentó limpieza de sesiones
      expect(invalidateUserSessions).not.toHaveBeenCalled();
      expect(clearTokens).not.toHaveBeenCalled();
      
      // Verificar respuesta de error
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'No tienes permisos para realizar esta acción'
      });
    });
  });
  
  describe('Error Handling', () => {
    test('should handle unauthenticated requests', async () => {
      mockRequest = {
        user: null, // Sin usuario autenticado
        params: { userId: '1' }
      };
      
      await authController.deactivateUser(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Usuario no autenticado'
      });
    });
    
    test('should handle invalid user ID', async () => {
      mockRequest = {
        user: { userId: 1, rol_id: 1 },
        params: { userId: 'invalid' }
      };
      
      await authController.deactivateUser(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'ID de usuario inválido'
      });
    });
  });
});