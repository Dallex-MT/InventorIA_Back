export interface Categoria {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

export interface CategoriaCreateDTO {
  nombre: string;
  descripcion?: string;
  activo?: boolean;
}

export interface CategoriaUpdateDTO {
  nombre?: string;
  descripcion?: string;
  activo?: boolean;
}

export interface CategoriaResponse {
  success: boolean;
  data?: Categoria | Categoria[];
  message?: string;
  error?: string;
}