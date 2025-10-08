import { executeQuery } from '../utils/database';
import { Usuario, UsuarioRegistroDTO, UsuarioSeguro } from '../models/Usuario';
import { hashPassword } from '../utils/password';
import { sanitizeInput } from '../utils/validation';

export class UsuarioService {
  
  async findByCedula(cedula: string): Promise<Usuario | null> {
    try {
      const sanitizedCedula = sanitizeInput(cedula);
      const query = 'SELECT * FROM usuarios WHERE cedula = ? LIMIT 1';
      const results = await executeQuery(query, [sanitizedCedula]);
      
      if (Array.isArray(results) && results.length > 0) {
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
      const results = await executeQuery(query, [sanitizedEmail]);
      
      if (Array.isArray(results) && results.length > 0) {
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
      const results = await executeQuery(query, [id]);
      
      if (Array.isArray(results) && results.length > 0) {
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
      const { nombre_usuario, correo, password, rol_id } = usuarioData;
      
      const sanitizedNombre = sanitizeInput(nombre_usuario);
      const sanitizedCorreo = sanitizeInput(correo);
      
      const passwordHash = await hashPassword(password);
      
      // Generate a default cedula based on timestamp to satisfy database constraint
      const defaultCedula = `TEMP${Date.now()}`;
      
      const query = `
        INSERT INTO usuarios (cedula, nombre_usuario, correo, password_hash, rol_id, activo, fecha_creacion, fecha_actualizacion)
        VALUES (?, ?, ?, ?, ?, true, NOW(), NOW())
      `;
      
      const result = await executeQuery(query, [
        defaultCedula,
        sanitizedNombre,
        sanitizedCorreo,
        passwordHash,
        rol_id
      ]);
      
      const insertId = (result as any).insertId;
      
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
      await executeQuery(query, [userId]);
    } catch (error) {
      console.error('Error al actualizar último acceso:', error);
    }
  }

  async update(userId: number, updateData: Partial<{ nombre_usuario: string; correo: string }>): Promise<Usuario | null> {
    try {
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

      if (fields.length === 0) {
        return null;
      }

      fields.push('fecha_actualizacion = NOW()');
      values.push(userId);

      const query = `UPDATE usuarios SET ${fields.join(', ')} WHERE id = ?`;
      await executeQuery(query, values);

      return await this.findById(userId);
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      throw new Error('Error al actualizar usuario');
    }
  }

  toSafeUser(usuario: Usuario): UsuarioSeguro {
    const { password_hash, ...safeUser } = usuario;
    return safeUser;
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
}