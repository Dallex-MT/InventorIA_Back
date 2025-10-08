import { pool } from '../utils/database';
import { Rol, RolCreateDTO, RolUpdateDTO } from '../models/Rol';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export class RolService {
  
  static async getAllRoles(): Promise<Rol[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM roles WHERE activo = 1 ORDER BY nombre'
    );
    return rows as Rol[];
  }

  static async getRoleById(id: number): Promise<Rol | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM roles WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    return rows[0] as Rol;
  }

  static async getRoleByNombre(nombre: string): Promise<Rol | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM roles WHERE nombre = ?',
      [nombre]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    return rows[0] as Rol;
  }

  static async createRole(roleData: RolCreateDTO): Promise<Rol> {
    const { nombre, descripcion, activo = true } = roleData;
    
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO roles (nombre, descripcion, activo) VALUES (?, ?, ?)',
      [nombre, descripcion || null, activo]
    );
    
    const newRole = await this.getRoleById(result.insertId);
    if (!newRole) {
      throw new Error('Error al crear el rol');
    }
    
    return newRole;
  }

  static async updateRole(id: number, roleData: RolUpdateDTO): Promise<Rol | null> {
    const fields: string[] = [];
    const values: any[] = [];
    
    if (roleData.nombre !== undefined) {
      fields.push('nombre = ?');
      values.push(roleData.nombre);
    }
    
    if (roleData.descripcion !== undefined) {
      fields.push('descripcion = ?');
      values.push(roleData.descripcion);
    }
    
    if (roleData.activo !== undefined) {
      fields.push('activo = ?');
      values.push(roleData.activo);
    }
    
    if (fields.length === 0) {
      return await this.getRoleById(id);
    }
    
    values.push(id);
    
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE roles SET ${fields.join(', ')}, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    
    if (result.affectedRows === 0) {
      return null;
    }
    
    return await this.getRoleById(id);
  }

  static async deleteRole(id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE roles SET activo = 0, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }

  static async hardDeleteRole(id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM roles WHERE id = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }

  static async countActiveRoles(): Promise<number> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM roles WHERE activo = 1'
    );
    
    return rows[0]?.['total'] || 0;
  }
}