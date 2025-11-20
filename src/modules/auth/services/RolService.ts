import { pool } from '../../../shared/utils/database';
import { Rol, RolCreateDTO, RolUpdateDTO } from '../models/Rol';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export class RolService {

  static async getAllRoles(page: number = 1, limit: number = 10, active?: boolean): Promise<{
    roles: Rol[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      // Calcular offset para paginación
      const offset = (page - 1) * limit;

      // Construir query base
      let whereClause = '';
      const queryParams: any[] = [];

      if (active !== undefined) {
        whereClause = 'WHERE activo = ?';
        queryParams.push(active);
      }

      // Query para obtener el total de registros
      const countQuery = `SELECT COUNT(*) as total FROM roles ${whereClause}`;
      const [countResult] = await pool.execute<RowDataPacket[]>(countQuery, queryParams);
      const total = countResult[0] ? countResult[0]['total'] : 0;

      // Query para obtener los roles con paginación
      // MySQL requiere que LIMIT y OFFSET sean valores literales, no parámetros preparados
      const rolesQuery = `
        SELECT * FROM roles 
        ${whereClause}
        ORDER BY nombre ASC 
        LIMIT ${parseInt(limit.toString())} OFFSET ${parseInt(offset.toString())}
      `;

      const [rolesResult] = await pool.execute<RowDataPacket[]>(rolesQuery, queryParams);
      const roles = rolesResult as Rol[];

      const totalPages = Math.ceil(total / limit);

      return {
        roles,
        total,
        page,
        totalPages
      };
    } catch (error) {
      console.error('Error al obtener roles:', error);
      throw error;
    }
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