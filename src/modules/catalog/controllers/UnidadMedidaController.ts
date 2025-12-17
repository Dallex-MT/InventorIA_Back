import { Request, Response } from 'express';
import { UnidadMedidaService } from '../services/UnidadMedidaService';
import { UnidadMedidaCreateDTO, UnidadMedidaUpdateDTO } from '../models/UnidadMedida';
import { AuthenticatedRequest } from '../../../shared/middleware/auth';

export class UnidadMedidaController {

    static async getAllUnidadesMedida(req: Request, res: Response): Promise<Response> {
        try {
            const activeOnly = req.query['active'] === 'true';
            const unidades = await UnidadMedidaService.getAllUnidadesMedida(activeOnly);

            return res.json({
                success: true,
                data: unidades,
                message: 'Unidades de medida obtenidas exitosamente'
            });
        } catch (error) {
            console.error('Error al obtener unidades de medida:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener unidades de medida',
            });
        }
    }

    static async getUnidadMedidaById(req: Request, res: Response): Promise<Response> {
        try {
            const id = parseInt(req.params['id'] as string);

            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de unidad de medida inválido'
                });
            }

            const unidad = await UnidadMedidaService.getUnidadMedidaById(id);

            if (!unidad) {
                return res.status(404).json({
                    success: false,
                    message: 'Unidad de medida no encontrada'
                });
            }

            return res.json({
                success: true,
                data: unidad,
                message: 'Unidad de medida obtenida exitosamente'
            });
        } catch (error) {
            console.error('Error al obtener unidad de medida:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener unidad de medida',
            });
        }
    }

    static async createUnidadMedida(req: AuthenticatedRequest, res: Response): Promise<Response> {
        try {
            const { nombre, abreviatura, descripcion, activo }: UnidadMedidaCreateDTO = req.body;

            if (!nombre || nombre.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre es requerido'
                });
            }

            if (!abreviatura || abreviatura.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'La abreviatura es requerida'
                });
            }

            // Verificar duplicados
            const existingNombre = await UnidadMedidaService.getUnidadMedidaByNombre(nombre.trim());
            if (existingNombre) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe una unidad de medida con ese nombre'
                });
            }

            const existingAbreviatura = await UnidadMedidaService.getUnidadMedidaByAbreviatura(abreviatura.trim());
            if (existingAbreviatura) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe una unidad de medida con esa abreviatura'
                });
            }

            const newUnidad = await UnidadMedidaService.createUnidadMedida({
                nombre: nombre.trim(),
                abreviatura: abreviatura.trim(),
                descripcion: descripcion?.trim(),
                activo
            });

            return res.status(201).json({
                success: true,
                data: newUnidad,
                message: 'Unidad de medida creada exitosamente'
            });
        } catch (error) {
            console.error('Error al crear unidad de medida:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al crear unidad de medida'
            });
        }
    }

    static async updateUnidadMedida(req: AuthenticatedRequest, res: Response): Promise<Response> {
        try {
            const id = parseInt(req.params['id'] as string);
            const { nombre, abreviatura, descripcion, activo }: UnidadMedidaUpdateDTO = req.body;

            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de unidad de medida inválido'
                });
            }

            const existingUnidad = await UnidadMedidaService.getUnidadMedidaById(id);
            if (!existingUnidad) {
                return res.status(404).json({
                    success: false,
                    message: 'Unidad de medida no encontrada'
                });
            }

            // Validar duplicados si se actualizan campos únicos
            if (nombre) {
                const existingNombre = await UnidadMedidaService.getUnidadMedidaByNombre(nombre.trim());
                if (existingNombre && existingNombre.id !== id) {
                    return res.status(409).json({
                        success: false,
                        message: 'Ya existe otra unidad de medida con ese nombre'
                    });
                }
            }

            if (abreviatura) {
                const existingAbreviatura = await UnidadMedidaService.getUnidadMedidaByAbreviatura(abreviatura.trim());
                if (existingAbreviatura && existingAbreviatura.id !== id) {
                    return res.status(409).json({
                        success: false,
                        message: 'Ya existe otra unidad de medida con esa abreviatura'
                    });
                }
            }

            const updatedUnidad = await UnidadMedidaService.updateUnidadMedida(id, {
                nombre: nombre?.trim(),
                abreviatura: abreviatura?.trim(),
                descripcion: descripcion?.trim(),
                activo
            });

            return res.json({
                success: true,
                data: updatedUnidad,
                message: 'Unidad de medida actualizada exitosamente'
            });
        } catch (error) {
            console.error('Error al actualizar unidad de medida:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al actualizar unidad de medida'
            });
        }
    }

    static async deleteUnidadMedida(req: AuthenticatedRequest, res: Response): Promise<Response> {
        try {
            const id = parseInt(req.params['id'] as string);

            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de unidad de medida inválido'
                });
            }

            const existingUnidad = await UnidadMedidaService.getUnidadMedidaById(id);
            if (!existingUnidad) {
                return res.status(404).json({
                    success: false,
                    message: 'Unidad de medida no encontrada'
                });
            }

            const deleted = await UnidadMedidaService.deleteUnidadMedida(id);

            if (!deleted) {
                return res.status(500).json({
                    success: false,
                    message: 'Error al eliminar unidad de medida'
                });
            }

            return res.json({
                success: true,
                message: 'Unidad de medida eliminada exitosamente'
            });
        } catch (error) {
            console.error('Error al eliminar unidad de medida:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al eliminar unidad de medida'
            });
        }
    }
}
