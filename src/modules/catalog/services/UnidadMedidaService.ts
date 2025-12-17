import { pool } from '../../../shared/utils/database';
import { UnidadMedida, UnidadMedidaCreateDTO, UnidadMedidaUpdateDTO } from '../models/UnidadMedida';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export class UnidadMedidaService {

    static async getAllUnidadesMedida(activeOnly: boolean = false): Promise<UnidadMedida[]> {
        let query = 'SELECT id, nombre, abreviatura, descripcion, activo FROM unidades_medida';
        const params: any[] = [];

        if (activeOnly) {
            query += ' WHERE activo = 1';
        }

        query += ' ORDER BY nombre ASC';

        const [rows] = await pool.execute<RowDataPacket[]>(query, params);
        return rows as UnidadMedida[];
    }

    static async getUnidadMedidaById(id: number): Promise<UnidadMedida | null> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM unidades_medida WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return null;
        }

        return rows[0] as UnidadMedida;
    }

    static async getUnidadMedidaByNombre(nombre: string): Promise<UnidadMedida | null> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM unidades_medida WHERE nombre = ?',
            [nombre]
        );

        if (rows.length === 0) {
            return null;
        }

        return rows[0] as UnidadMedida;
    }

    static async getUnidadMedidaByAbreviatura(abreviatura: string): Promise<UnidadMedida | null> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM unidades_medida WHERE abreviatura = ?',
            [abreviatura]
        );

        if (rows.length === 0) {
            return null;
        }

        return rows[0] as UnidadMedida;
    }

    static async createUnidadMedida(data: UnidadMedidaCreateDTO): Promise<UnidadMedida> {
        const { nombre, abreviatura, descripcion, activo = true } = data;

        const [result] = await pool.execute<ResultSetHeader>(
            'INSERT INTO unidades_medida (nombre, abreviatura, descripcion, activo) VALUES (?, ?, ?, ?)',
            [nombre, abreviatura, descripcion || null, activo]
        );

        const newUnidad = await this.getUnidadMedidaById(result.insertId);
        if (!newUnidad) {
            throw new Error('Error al crear la unidad de medida');
        }

        return newUnidad;
    }

    static async updateUnidadMedida(id: number, data: UnidadMedidaUpdateDTO): Promise<UnidadMedida | null> {
        const fields: string[] = [];
        const values: any[] = [];

        if (data.nombre !== undefined) {
            fields.push('nombre = ?');
            values.push(data.nombre);
        }

        if (data.abreviatura !== undefined) {
            fields.push('abreviatura = ?');
            values.push(data.abreviatura);
        }

        if (data.descripcion !== undefined) {
            fields.push('descripcion = ?');
            values.push(data.descripcion);
        }

        if (data.activo !== undefined) {
            fields.push('activo = ?');
            values.push(data.activo);
        }

        if (fields.length === 0) {
            return await this.getUnidadMedidaById(id);
        }

        values.push(id);

        const [result] = await pool.execute<ResultSetHeader>(
            `UPDATE unidades_medida SET ${fields.join(', ')} WHERE id = ?`,
            values
        );

        if (result.affectedRows === 0) {
            return null;
        }

        return await this.getUnidadMedidaById(id);
    }

    static async deleteUnidadMedida(id: number): Promise<boolean> {
        const [result] = await pool.execute<ResultSetHeader>(
            'UPDATE unidades_medida SET activo = 0 WHERE id = ?',
            [id]
        );

        return result.affectedRows > 0;
    }
}
