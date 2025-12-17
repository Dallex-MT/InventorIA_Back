export interface UnidadMedida {
    id: number;
    nombre: string;
    abreviatura: string;
    descripcion: string | null;
    activo: boolean;
    fecha_creacion: Date;
    fecha_actualizacion: Date;
}

export interface UnidadMedidaCreateDTO {
    nombre: string;
    abreviatura: string;
    descripcion?: string | undefined;
    activo?: boolean | undefined;
}

export interface UnidadMedidaUpdateDTO {
    nombre?: string | undefined;
    abreviatura?: string | undefined;
    descripcion?: string | undefined;
    activo?: boolean | undefined;
}

export interface UnidadMedidaResponse {
    success: boolean;
    data?: UnidadMedida | UnidadMedida[];
    message?: string;
    error?: string;
}
