export interface DetalleFactura {
  id: number;
  factura_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface DetalleFacturaCreateDTO {
  factura_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
}

export interface DetalleFacturaUpdateDTO {
  factura_id?: number;
  producto_id?: number;
  cantidad?: number;
  precio_unitario?: number;
}

export interface DetalleFacturaResponse {
  success: boolean;
  data?: DetalleFactura | DetalleFactura[];
  message?: string;
  error?: string;
}