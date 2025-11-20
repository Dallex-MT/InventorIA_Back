import { logAppEvent } from './logger';

/**
 * Sistema de lista negra de tokens para invalidar sesiones activas
 * En producción, esto debería usar Redis o una base de datos para persistencia
 */
class TokenBlacklist {
  private blacklist: Set<string> = new Set();
  private userTokens: Map<number, Set<string>> = new Map();

  /**
   * Agrega un token a la lista negra
   */
  addToken(token: string, userId: number): void {
    this.blacklist.add(token);
    
    // Mantener registro de tokens por usuario para invalidación masiva
    if (!this.userTokens.has(userId)) {
      this.userTokens.set(userId, new Set());
    }
    this.userTokens.get(userId)!.add(token);
    
    logAppEvent('info', 'Token agregado a lista negra', { userId, tokenLength: token.length });
  }

  /**
   * Invalida todos los tokens de un usuario específico
   */
  invalidateAllUserTokens(userId: number): number {
    const userTokenSet = this.userTokens.get(userId);
    if (!userTokenSet) {
      logAppEvent('info', 'No se encontraron tokens para invalidar', { userId });
      return 0;
    }

    let invalidatedCount = 0;
    for (const token of userTokenSet) {
      this.blacklist.add(token);
      invalidatedCount++;
    }

    // Limpiar el registro del usuario
    this.userTokens.delete(userId);
    
    logAppEvent('info', 'Tokens de usuario invalidados', { 
      userId, 
      invalidatedCount,
      action: 'mass_invalidation' 
    });

    return invalidatedCount;
  }

  /**
   * Verifica si un token está en la lista negra
   */
  isTokenBlacklisted(token: string): boolean {
    return this.blacklist.has(token);
  }

  /**
   * Limpia tokens antiguos (para prevenir crecimiento de memoria)
   * En producción, esto debería ejecutarse periódicamente
   */
  cleanup(): void {
    const initialSize = this.blacklist.size;
    const userTokenCount = this.userTokens.size;
    
    // En producción, aquí se implementaría lógica más sofisticada
    // Por ahora, mantenemos todos los tokens para máxima seguridad
    
    logAppEvent('info', 'Limpieza de lista negra completada', {
      initialBlacklistSize: initialSize,
      currentBlacklistSize: this.blacklist.size,
      userTokenMaps: userTokenCount,
      removedTokens: initialSize - this.blacklist.size
    });
  }

  /**
   * Obtiene estadísticas de la lista negra
   */
  getStats(): { blacklistSize: number; userTokenMaps: number } {
    return {
      blacklistSize: this.blacklist.size,
      userTokenMaps: this.userTokens.size
    };
  }
}

// Exportar instancia singleton
export const tokenBlacklist = new TokenBlacklist();

/**
 * Función auxiliar para invalidar todas las sesiones de un usuario
 * Esta función se usa cuando un usuario se desactiva o cambia su contraseña
 */
export async function invalidateUserSessions(userId: number): Promise<number> {
  try {
    const invalidatedTokens = tokenBlacklist.invalidateAllUserTokens(userId);
    
    logAppEvent('security', 'Sesiones de usuario invalidadas', {
      userId,
      invalidatedTokens,
      timestamp: new Date().toISOString(),
      action: 'user_deactivation_session_cleanup'
    });

    return invalidatedTokens;
  } catch (error) {
    logAppEvent('error', 'Error al invalidar sesiones de usuario', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}