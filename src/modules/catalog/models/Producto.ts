import { UnidadMedida } from './UnidadMedida';

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
  categoria_id: number;
  unidad_medida_id: number;
  unidad_medida?: UnidadMedida; // Para cuando se hace join
  stock_actual: number;
  stock_minimo: number;
  precio_referencia: number;
  activo: boolean;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

export interface ProductoCreateDTO {
  nombre: string;
  descripcion?: string;
  categoria_id: number;
  unidad_medida_id: number;
  stock_actual?: number;
  stock_minimo?: number;
  precio_referencia?: number;
  activo?: boolean;
}

export interface ProductoUpdateDTO {
  nombre?: string;
  descripcion?: string;
  categoria_id?: number;
  unidad_medida_id?: number;
  stock_actual?: number;
  stock_minimo?: number;
  precio_referencia?: number;
  activo?: boolean;
}

export interface ProductoResponse {
  success: boolean;
  data?: Producto | Producto[];
  message?: string;
  error?: string;
}