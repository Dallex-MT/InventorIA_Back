import { pool } from '../../../shared/utils/database';
import { Usuario, UsuarioRegistroDTO, UsuarioSeguro } from '../models/Usuario';
import { hashPassword } from '../../../shared/utils/password';
import { sanitizeInput } from '../../../shared/utils/validation';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export class UsuarioService {

  async findByCedula(cedula: string): Promise<Usuario | null> {
    try {
      const sanitizedCedula = sanitizeInput(cedula);
      const query = 'SELECT * FROM usuarios WHERE cedula = ? LIMIT 1';
      const [results] = await pool.execute<RowDataPacket[]>(query, [sanitizedCedula]);

      if (results.length > 0) {
        return results[0] as Usuario;
      }

      return null;
    } catch (error) {
      console.error('Error al buscar usuario por cédula:', error);
      throw new Error('Error al buscar usuario');
    }
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    try {
      const sanitizedEmail = sanitizeInput(email);
      const query = 'SELECT * FROM usuarios WHERE correo = ? LIMIT 1';
      const [results] = await pool.execute<RowDataPacket[]>(query, [sanitizedEmail]);

      if (results.length > 0) {
        return results[0] as Usuario;
      }

      return null;
    } catch (error) {
      console.error('Error al buscar usuario por email:', error);
      throw new Error('Error al buscar usuario');
    }
  }

  async findById(id: number): Promise<Usuario | null> {
    try {
      const query = 'SELECT * FROM usuarios WHERE id = ? LIMIT 1';
      const [results] = await pool.execute<RowDataPacket[]>(query, [id]);

      if (results.length > 0) {
        return results[0] as Usuario;
      }

      return null;
    } catch (error) {
      console.error('Error al buscar usuario por ID:', error);
      throw new Error('Error al buscar usuario');
    }
  }

  async create(usuarioData: UsuarioRegistroDTO): Promise<Usuario> {
    try {
      const { cedula, nombre_usuario, correo, password, rol_id } = usuarioData;

      const sanitizedNombre = sanitizeInput(nombre_usuario);
      const sanitizedCorreo = sanitizeInput(correo);

      const passwordHash = await hashPassword(password);


      const query = `
        INSERT INTO usuarios (cedula, nombre_usuario, correo, password_hash, rol_id, activo)
        VALUES (?, ?, ?, ?, ?, true)
      `;

      const [result] = await pool.execute<ResultSetHeader>(query, [
        cedula,
        sanitizedNombre,
        sanitizedCorreo,
        passwordHash,
        rol_id
      ]);

      const insertId = result.insertId;

      const newUser = await this.findById(insertId);
      if (!newUser) {
        throw new Error('Error al crear usuario');
      }

      return newUser;
    } catch (error) {
      console.error('Error al crear usuario:', error);
      throw new Error('Error al crear usuario');
    }
  }

  async updateLastAccess(userId: number): Promise<void> {
    try {
      const query = 'UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?';
      await pool.execute(query, [userId]);
    } catch (error) {
      console.error('Error al actualizar último acceso:', error);
      // No lanzamos error aquí para no interrumpir el flujo de login
    }
  }

  async update(requestingUserId: number, targetUserId: number, updateData: Partial<{ activo: boolean; nombre_usuario: string; correo: string; cedula: string }>): Promise<Usuario | null> {
    try {
      // Verificar que el usuario solicitante tenga permisos
      const requestingUser = await this.findById(requestingUserId);
      if (!requestingUser) {
        throw new Error('Usuario solicitante no encontrado');
      }

      // Verificar que el usuario objetivo exista
      const targetUser = await this.findById(targetUserId);
      if (!targetUser) {
        throw new Error('Usuario a editar no encontrado');
      }

      // Validar permisos: solo puede editar su propio perfil o ser administrador
      if (requestingUserId !== targetUserId && requestingUser.rol_id !== 1) {
        throw new Error('No tienes permisos para editar este usuario');
      }

      // Logging para auditoría
      const isAdminEditingAnother = requestingUserId !== targetUserId && requestingUser.rol_id === 1;
      if (isAdminEditingAnother) {
        console.log(`[AUDIT] Administrador ${requestingUser.nombre_usuario} (ID: ${requestingUserId}) está modificando al usuario ${targetUser.nombre_usuario} (ID: ${targetUserId})`);
      } else if (requestingUserId === targetUserId) {
        console.log(`[AUDIT] Usuario ${requestingUser.nombre_usuario} (ID: ${requestingUserId}) está modificando su propio perfil`);
      }

      const fields: string[] = [];
      const values: any[] = [];

      if (updateData.nombre_usuario !== undefined) {
        fields.push('nombre_usuario = ?');
        values.push(sanitizeInput(updateData.nombre_usuario));
      }

      if (updateData.correo !== undefined) {
        fields.push('correo = ?');
        values.push(sanitizeInput(updateData.correo));
      }

      if (updateData.cedula !== undefined) {
        fields.push('cedula = ?');
        values.push(sanitizeInput(updateData.cedula));
      }

      if (updateData.activo !== undefined) {
        fields.push('activo = ?');
        values.push(updateData.activo);
      }

      if (fields.length === 0) {
        return null;
      }

      const query = `UPDATE usuarios SET ${fields.join(', ')} WHERE id = ?`;

      // Logging de la query para debugging (sin valores sensibles)
      console.log(`[UPDATE] Ejecutando update para usuario ID: ${targetUserId}, campos: ${fields.join(', ')}`);

      await pool.execute(query, [...values, targetUserId]);

      const updatedUser = await this.findById(targetUserId);

      // Logging de éxito
      if (updatedUser) {
        console.log(`[SUCCESS] Usuario ${targetUserId} actualizado exitosamente por ${requestingUserId}`);
      }

      return updatedUser;
    } catch (error) {
      console.error(`[ERROR] Error al actualizar usuario ${targetUserId} por ${requestingUserId}:`, error);
      throw error;
    }
  }

  toSafeUser(usuario: Usuario): UsuarioSeguro {
    const { password_hash, ...safeUser } = usuario;
    return safeUser;
  }

  async checkIfCedulaExists(cedula: string): Promise<{ exists: boolean; field: string }> {
    try {
      const userByCedula = await this.findByCedula(cedula);
      if (userByCedula) {
        return { exists: true, field: 'cedula' };
      }

      return { exists: false, field: '' };
    } catch (error) {
      console.error('Error al verificar existencia de usuario:', error);
      throw new Error('Error al verificar usuario');
    }
  }

  async checkIfUserExists(correo: string): Promise<{ exists: boolean; field: string }> {
    try {
      const userByEmail = await this.findByEmail(correo);
      if (userByEmail) {
        return { exists: true, field: 'correo' };
      }

      return { exists: false, field: '' };
    } catch (error) {
      console.error('Error al verificar existencia de usuario:', error);
      throw new Error('Error al verificar usuario');
    }
  }

  async softDelete(userId: number): Promise<Usuario | null> {
    try {
      // Verificar que el usuario exista
      const existingUser = await this.findById(userId);
      if (!existingUser) {
        throw new Error('Usuario no encontrado');
      }

      // Verificar que el usuario esté activo
      if (!existingUser.activo) {
        throw new Error('El usuario ya está desactivado');
      }

      const query = 'UPDATE usuarios SET activo = false WHERE id = ?';
      await pool.execute(query, [userId]);

      // Retornar el usuario actualizado
      return await this.findById(userId);
    } catch (error) {
      console.error('Error al desactivar usuario:', error);
      throw error;
    }
  }

  async listUsers(page: number = 1, limit: number = 10, activeFilter?: boolean):
    Promise<{ users: UsuarioSeguro[]; total: number; page: number; totalPages: number; }> {
    try {

      // Calcular offset para paginación
      const offset = (page - 1) * limit;

      // Construir query base
      let whereClause = '';
      const queryParams: any[] = [];

      if (activeFilter !== undefined) {
        whereClause = 'WHERE activo = ?';
        queryParams.push(activeFilter);
      }

      // Query para obtener el total de registros
      const countQuery = `SELECT COUNT(*) as total FROM usuarios ${whereClause}`;

      // Asegurarnos de que los parámetros del count sean del tipo correcto
      const countParams = queryParams.map(param => param === 'true' ? 1 : (param === 'false' ? 0 : param));
      const [countResult] = await pool.execute<RowDataPacket[]>(countQuery, countParams);
      const total = countResult[0] ? countResult[0]['total'] : 0;

      // Query para obtener los usuarios con paginación
      // MySQL requiere que LIMIT y OFFSET sean valores literales, no parámetros preparados
      const usersQuery = `
        SELECT * FROM usuarios 
        ${whereClause}
        ORDER BY fecha_creacion DESC 
        LIMIT ${parseInt(limit.toString())} OFFSET ${parseInt(offset.toString())}
      `;

      const [users] = await pool.execute<RowDataPacket[]>(usersQuery, queryParams);

      // Convertir a usuarios seguros (sin password_hash)
      const safeUsers = (users as Usuario[]).map(user => this.toSafeUser(user));

      const totalPages = Math.ceil(total / limit);

      return {
        users: safeUsers,
        total,
        page,
        totalPages
      };
    } catch (error) {
      console.error('Error al listar usuarios:', error);
      throw error;
    }
  }

  async updatePassword(userId: number, newPasswordHash: string): Promise<void> {
    try {
      const query = 'UPDATE usuarios SET password_hash = ? WHERE id = ?';
      await pool.execute(query, [newPasswordHash, userId]);

      console.log(`[AUDIT] Contraseña actualizada para usuario ID: ${userId}`);
    } catch (error) {
      console.error(`Error al actualizar contraseña para usuario ${userId}:`, error);
      throw new Error('Error al actualizar la contraseña');
    }
  }

}