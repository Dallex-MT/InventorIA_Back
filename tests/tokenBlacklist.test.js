const { tokenBlacklist } = require('../src/utils/tokenBlacklist');
const { invalidateUserSessions } = require('../src/utils/tokenBlacklist');

// Mock del sistema de logging
const mockLogAppEvent = jest.fn();
jest.mock('../src/utils/logger', () => ({
  logAppEvent: (level, message, data) => mockLogAppEvent(level, message, data)
}));

describe('Token Blacklist and Session Management', () => {
  beforeEach(() => {
    // Limpiar el estado antes de cada prueba
    tokenBlacklist.blacklist.clear();
    tokenBlacklist.userTokens.clear();
    mockLogAppEvent.mockClear();
  });

  describe('Token Blacklist', () => {
    test('should add token to blacklist', () => {
      const token = 'test-token-123';
      const userId = 1;
      
      tokenBlacklist.addToken(token, userId);
      
      expect(tokenBlacklist.isTokenBlacklisted(token)).toBe(true);
      expect(mockLogAppEvent).toHaveBeenCalledWith('info', 'Token agregado a lista negra', {
        userId,
        tokenLength: token.length
      });
    });

    test('should not blacklist non-existent token', () => {
      const token = 'non-existent-token';
      
      expect(tokenBlacklist.isTokenBlacklisted(token)).toBe(false);
    });

    test('should track multiple tokens per user', () => {
      const userId = 1;
      const token1 = 'token-1';
      const token2 = 'token-2';
      const token3 = 'token-3';
      
      tokenBlacklist.addToken(token1, userId);
      tokenBlacklist.addToken(token2, userId);
      tokenBlacklist.addToken(token3, 2); // Different user
      
      expect(tokenBlacklist.isTokenBlacklisted(token1)).toBe(true);
      expect(tokenBlacklist.isTokenBlacklisted(token2)).toBe(true);
      expect(tokenBlacklist.isTokenBlacklisted(token3)).toBe(true);
      expect(tokenBlacklist.getStats().userTokenMaps).toBe(2);
    });
  });

  describe('Invalidate User Sessions', () => {
    test('should invalidate all tokens for a user', async () => {
      const userId = 1;
      const tokens = ['token-1', 'token-2', 'token-3'];
      
      // Agregar múltiples tokens para el usuario
      tokens.forEach(token => tokenBlacklist.addToken(token, userId));
      
      // Agregar token para otro usuario (no debería ser afectado)
      tokenBlacklist.addToken('other-user-token', 2);
      
      const invalidatedCount = await invalidateUserSessions(userId);
      
      expect(invalidatedCount).toBe(3);
      expect(tokenBlacklist.isTokenBlacklisted('token-1')).toBe(true);
      expect(tokenBlacklist.isTokenBlacklisted('token-2')).toBe(true);
      expect(tokenBlacklist.isTokenBlacklisted('token-3')).toBe(true);
      expect(tokenBlacklist.isTokenBlacklisted('other-user-token')).toBe(false);
      
      // Verificar que el registro del usuario fue limpiado
      expect(tokenBlacklist.userTokens.has(userId)).toBe(false);
      
      // Verificar log de auditoría
      expect(mockLogAppEvent).toHaveBeenCalledWith('security', 'Sesiones de usuario invalidadas', {
        userId,
        invalidatedTokens: 3,
        timestamp: expect.any(String),
        action: 'user_deactivation_session_cleanup'
      });
    });

    test('should handle user with no tokens', async () => {
      const userId = 1;
      
      const invalidatedCount = await invalidateUserSessions(userId);
      
      expect(invalidatedCount).toBe(0);
      expect(mockLogAppEvent).toHaveBeenCalledWith('info', 'No se encontraron tokens para invalidar', { userId });
    });

    test('should handle errors gracefully', async () => {
      const userId = 1;
      
      // Simular un error en el método invalidateAllUserTokens
      const originalMethod = tokenBlacklist.invalidateAllUserTokens;
      tokenBlacklist.invalidateAllUserTokens = jest.fn().mockImplementation(() => {
        throw new Error('Simulated error');
      });
      
      await expect(invalidateUserSessions(userId)).rejects.toThrow('Simulated error');
      
      expect(mockLogAppEvent).toHaveBeenCalledWith('error', 'Error al invalidar sesiones de usuario', {
        userId,
        error: 'Simulated error'
      });
      
      // Restaurar el método original
      tokenBlacklist.invalidateAllUserTokens = originalMethod;
    });
  });

  describe('Blacklist Statistics', () => {
    test('should provide accurate statistics', () => {
      tokenBlacklist.addToken('token-1', 1);
      tokenBlacklist.addToken('token-2', 1);
      tokenBlacklist.addToken('token-3', 2);
      
      const stats = tokenBlacklist.getStats();
      
      expect(stats.blacklistSize).toBe(3);
      expect(stats.userTokenMaps).toBe(2);
    });
  });

  describe('Cleanup Functionality', () => {
    test('should perform cleanup and log results', () => {
      tokenBlacklist.addToken('token-1', 1);
      tokenBlacklist.addToken('token-2', 2);
      
      const initialStats = tokenBlacklist.getStats();
      
      tokenBlacklist.cleanup();
      
      // En la implementación actual, cleanup no elimina tokens por seguridad
      const finalStats = tokenBlacklist.getStats();
      expect(finalStats.blacklistSize).toBe(initialStats.blacklistSize);
      expect(finalStats.userTokenMaps).toBe(initialStats.userTokenMaps);
      
      expect(mockLogAppEvent).toHaveBeenCalledWith('info', 'Limpieza de lista negra completada', {
        initialBlacklistSize: initialStats.blacklistSize,
        currentBlacklistSize: finalStats.blacklistSize,
        userTokenMaps: finalStats.userTokenMaps,
        removedTokens: 0
      });
    });
  });
});