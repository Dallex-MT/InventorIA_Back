export interface Rol {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  permisos: Permiso[];
}

export interface Permiso {
  id: number;
  nombre: string;
}

export interface RolCreateDTO {
  nombre: string;
  descripcion?: string;
  activo?: boolean;
  permisos_ids?: number[];
}

export interface RolUpdateDTO {
  nombre?: string;
  descripcion?: string;
  activo?: boolean;
  permisos_ids?: number[];
}

export interface RolResponse {
  success: boolean;
  data?: Rol | Rol[];
  message?: string;
  error?: string;
}