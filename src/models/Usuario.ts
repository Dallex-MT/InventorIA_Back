export interface Usuario {
  id: number;
  cedula: string;
  nombre_usuario: string;
  correo: string;
  password_hash: string;
  rol_id: number;
  activo: boolean;
  ultimo_acceso: Date | null;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

export interface UsuarioSeguro {
  id: number;
  cedula: string;
  nombre_usuario: string;
  correo: string;
  rol_id: number;
  activo: boolean;
  ultimo_acceso: Date | null;
  fecha_creacion: Date;
}

export interface UsuarioRegistroDTO {
  cedula: string;
  nombre_usuario: string;
  correo: string;
  password: string;
  rol_id: number;
}

export interface UsuarioLoginDTO {
  cedula: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: UsuarioSeguro;
  metadata?: {
    updatedBy?: number;
    updatedUser?: number;
    isAdmin?: boolean;
  };
}

export interface JWTPayload {
  userId: number;
  cedula: string;
  nombre_usuario: string;
  rol_id: number;
}

export interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
}