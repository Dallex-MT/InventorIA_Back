export interface Rol {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

export interface RolCreateDTO {
  nombre: string;
  descripcion?: string;
  activo?: boolean;
}

export interface RolUpdateDTO {
  nombre?: string;
  descripcion?: string;
  activo?: boolean;
}

export interface RolResponse {
  success: boolean;
  data?: Rol | Rol[];
  message?: string;
  error?: string;
}