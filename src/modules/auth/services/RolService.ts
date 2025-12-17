import { pool } from '../../../shared/utils/database';
import { Rol, Permiso, RolCreateDTO, RolUpdateDTO } from '../models/Rol';
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
        whereClause = 'WHERE r.activo = ?';
        queryParams.push(active);
      }

      // Query para obtener el total de registros
      const countQuery = `SELECT COUNT(DISTINCT r.id) as total FROM roles r ${whereClause}`;
      const [countResult] = await pool.execute<RowDataPacket[]>(countQuery, queryParams);
      const total = countResult[0] ? countResult[0]['total'] : 0;

      // Query para obtener los roles con sus permisos
      const rolesQuery = `
        SELECT 
          r.id,
          r.nombre,
          r.descripcion,
          r.activo,
          p.id as permiso_id,
          p.nombre as permiso_nombre
        FROM roles r
        LEFT JOIN rol_permisos rp ON r.id = rp.rol_id
        LEFT JOIN permisos p ON rp.permiso_id = p.id
        ${whereClause}
        ORDER BY r.nombre ASC, p.id ASC
        LIMIT ${parseInt(limit.toString())} OFFSET ${parseInt(offset.toString())}
      `;

      const [rows] = await pool.execute<RowDataPacket[]>(rolesQuery, queryParams);
      
      // Agrupar los resultados por rol
      const rolesMap = new Map<number, Rol>();
      
      for (const row of rows) {
        const rolId = row['id'];
        
        if (!rolesMap.has(rolId)) {
          rolesMap.set(rolId, {
            id: rolId,
            nombre: row['nombre'],
            descripcion: row['descripcion'],
            activo: row['activo'],
            permisos: []
          });
        }
        
        // Agregar permiso si existe
        if (row['permiso_id'] && row['permiso_nombre']) {
          const rol = rolesMap.get(rolId)!;
          if (!rol.permisos.some(p => p.id === row['permiso_id'])) {
            rol.permisos.push({
              id: row['permiso_id'],
              nombre: row['permiso_nombre']
            });
          }
        }
      }

      const roles = Array.from(rolesMap.values());
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

  static async getAllPermisos(): Promise<Permiso[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, nombre FROM permisos WHERE activo = 1 ORDER BY id ASC'
    );

    return rows as Permiso[];
  }

  static async getRoleById(id: number): Promise<Rol | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        r.id,
        r.nombre,
        r.descripcion,
        r.activo,
        p.id as permiso_id,
        p.nombre as permiso_nombre
      FROM roles r
      LEFT JOIN rol_permisos rp ON r.id = rp.rol_id
      LEFT JOIN permisos p ON rp.permiso_id = p.id
      WHERE r.id = ?
      ORDER BY p.nombre ASC`,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    // Agrupar los resultados
    const rol: Rol = {
      id: rows[0]!['id'],
      nombre: rows[0]!['nombre'],
      descripcion: rows[0]!['descripcion'],
      activo: rows[0]!['activo'],
      permisos: []
    };

    // Agregar permisos si existen
    for (const row of rows) {
      if (row['permiso_id'] && row['permiso_nombre']) {
        if (!rol.permisos.some(p => p.id === row['permiso_id'])) {
          rol.permisos.push({
            id: row['permiso_id'],
            nombre: row['permiso_nombre']
          });
        }
      }
    }

    return rol;
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
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const { nombre, descripcion, activo = true, permisos_ids = [] } = roleData;

      // Validar que los permisos existan si se proporcionan
      if (permisos_ids.length > 0) {
        const placeholders = permisos_ids.map(() => '?').join(', ');
        const [existingPermisos] = await connection.execute<RowDataPacket[]>(
          `SELECT id FROM permisos WHERE id IN (${placeholders}) AND activo = 1`,
          permisos_ids
        );
        
        if (existingPermisos.length !== permisos_ids.length) {
          throw new Error('Algunos permisos no existen o no están activos');
        }
      }

      // Crear el rol
      const [result] = await connection.execute<ResultSetHeader>(
        'INSERT INTO roles (nombre, descripcion, activo) VALUES (?, ?, ?)',
        [nombre, descripcion || null, activo]
      );

      const newRoleId = result.insertId;

      // Insertar los permisos asociados si se proporcionan
      if (permisos_ids.length > 0) {
        const permisosValues = permisos_ids.map(permisoId => [newRoleId, permisoId]);
        const placeholders = permisosValues.map(() => '(?, ?)').join(', ');
        const flatValues = permisosValues.flat();
        await connection.execute<ResultSetHeader>(
          `INSERT INTO rol_permisos (rol_id, permiso_id) VALUES ${placeholders}`,
          flatValues
        );
      }

      await connection.commit();

      // Obtener el rol creado con sus permisos
      const newRole = await this.getRoleById(newRoleId);
      if (!newRole) {
        throw new Error('Error al obtener el rol creado');
      }

      return newRole;
    } catch (error) {
      await connection.rollback();
      console.error('Error al crear rol:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  static async updateRole(id: number, roleData: RolUpdateDTO): Promise<Rol | null> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
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

      // Actualizar datos básicos del rol si hay cambios
      if (fields.length > 0) {
        values.push(id);
        const [result] = await connection.execute<ResultSetHeader>(
          `UPDATE roles SET ${fields.join(', ')} WHERE id = ?`,
          values
        );

        if (result.affectedRows === 0) {
          await connection.rollback();
          return null;
        }
      }

      // Manejar permisos si se proporcionan
      if (roleData.permisos_ids !== undefined) {
        const permisos_ids = roleData.permisos_ids;

        // Validar que los permisos existan si se proporcionan
        if (permisos_ids.length > 0) {
          const placeholders = permisos_ids.map(() => '?').join(', ');
          const [existingPermisos] = await connection.execute<RowDataPacket[]>(
            `SELECT id FROM permisos WHERE id IN (${placeholders}) AND activo = 1`,
            permisos_ids
          );
          
          if (existingPermisos.length !== permisos_ids.length) {
            throw new Error('Algunos permisos no existen o no están activos');
          }
        }

        // Eliminar permisos existentes
        await connection.execute<ResultSetHeader>(
          'DELETE FROM rol_permisos WHERE rol_id = ?',
          [id]
        );

        // Insertar nuevos permisos
        if (permisos_ids.length > 0) {
          const permisosValues = permisos_ids.map(permisoId => [id, permisoId]);
          const placeholders = permisosValues.map(() => '(?, ?)').join(', ');
          const flatValues = permisosValues.flat();
          await connection.execute<ResultSetHeader>(
            `INSERT INTO rol_permisos (rol_id, permiso_id) VALUES ${placeholders}`,
            flatValues
          );
        }
      }

      await connection.commit();

      // Obtener el rol actualizado con sus permisos
      return await this.getRoleById(id);
    } catch (error) {
      await connection.rollback();
      console.error('Error al actualizar rol:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  static async deleteRole(id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE roles SET activo = 0 WHERE id = ?',
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