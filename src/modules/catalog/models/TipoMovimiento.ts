export interface TipoMovimiento {
  id: number;
  nombre: string;
  descripcion: string;
  afecta_stock: 'ENTRADA' | 'SALIDA';
  created_at: Date;
  updated_at: Date;
}

export interface TipoMovimientoCreateDTO {
  nombre: string;
  descripcion?: string;
  afecta_stock: 'ENTRADA' | 'SALIDA';
}

export interface TipoMovimientoUpdateDTO {
  nombre?: string;
  descripcion?: string;
  afecta_stock?: 'ENTRADA' | 'SALIDA';
}

export interface TipoMovimientoResponse {
  id: number;
  nombre: string;
  descripcion: string;
  afecta_stock: 'ENTRADA' | 'SALIDA';
  created_at: Date;
  updated_at: Date;
}