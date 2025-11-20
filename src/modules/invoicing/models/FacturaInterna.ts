export interface FacturaInterna {
  id: number;
  codigo_interno: string;
  tipo_movimiento_id: number;
  concepto: string;
  usuario_responsable_id: number;
  fecha_movimiento: Date;
  total: number;
  observaciones: string | null;
  estado: 'BORRADOR' | 'CONFIRMADA' | 'ANULADA';
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

export interface FacturaInternaCreateDTO {
  codigo_interno: string;
  tipo_movimiento_id: number;
  concepto: string;
  usuario_responsable_id: number;
  fecha_movimiento: Date | string;
  total?: number;
  observaciones?: string;
  estado?: 'BORRADOR' | 'CONFIRMADA' | 'ANULADA';
}

export interface FacturaInternaUpdateDTO {
  codigo_interno?: string;
  tipo_movimiento_id?: number;
  concepto?: string;
  usuario_responsable_id?: number;
  fecha_movimiento?: Date | string;
  total?: number;
  observaciones?: string;
  estado?: 'BORRADOR' | 'CONFIRMADA' | 'ANULADA';
}

export interface FacturaInternaResponse {
  success: boolean;
  data?: FacturaInterna | FacturaInterna[];
  message?: string;
  error?: string;
}