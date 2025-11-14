export interface ProductoFactura {
  nombre: string;
  unidad_medida: string;
  cantidad: number;
  precio_unitario: number;
}

export interface FacturaProcesada {
  codigo_interno: string;
  concepto: 'materiales' | 'equipos' | 'servicios' | 'otros';
  fecha_movimiento: string; // DD-MM-YYYY
  total: number;
  observaciones: string;
  productos: ProductoFactura[];
}

export interface FacturaProcesadaResponse {
  success: boolean;
  data?: FacturaProcesada;
  message?: string;
  error?: string;
}

