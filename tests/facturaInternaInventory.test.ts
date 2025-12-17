/// <reference types="jest" />
import request from 'supertest';
import app from '../src/index';
import { pool } from '../src/shared/utils/database';

// Helper to get random string
const randomString = () => Math.random().toString(36).substring(7);

const CREDENTIALS = {
  correo: "p@cota.com",
  password: "D@mt2016"
};

let token: string;
let productoId: number;
let tipoMovimientoId: number;
let usuarioId: number;
let categoriaId: number;
let unidadMedidaId: number;

describe('Factura Interna Inventory Integration', () => {
  beforeAll(async () => {
    // 1. Login
    const loginRes = await request(app).post('/api/auth/login').send(CREDENTIALS);
    if (!loginRes.body.success) {
        console.error('Login failed:', loginRes.body);
        throw new Error('Login failed');
    }
    
    // Extract token from cookie
    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    if (cookies) {
        const tokenCookie = cookies.find((c: string) => c.startsWith('token='));
        if (tokenCookie) {
            token = tokenCookie.split(';')[0]?.split('=')[1] || '';
        }
    }
    
    if (!token) throw new Error('Token not found in cookies');

    usuarioId = loginRes.body.user.id;

    // 2. Setup Prerequisites (Unidad, Categoria, TipoMovimiento)
    const [umRows] = await pool.execute<any>('SELECT id FROM unidades_medida WHERE activo = 1 LIMIT 1');
    if (umRows.length > 0) unidadMedidaId = umRows[0].id;
    else throw new Error('No active Unidad Medida found');

    const [catRows] = await pool.execute<any>('SELECT id FROM categorias_producto WHERE activo = 1 LIMIT 1');
    if (catRows.length > 0) categoriaId = catRows[0].id;
    else throw new Error('No active Categoria found');

    const [tmRows] = await pool.execute<any>('SELECT id FROM tipos_movimiento LIMIT 1');
    if (tmRows.length > 0) tipoMovimientoId = tmRows[0].id;
    else throw new Error('No active Tipo Movimiento found');

    // Create a Test Product
    const prodRes = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: `Test Product ${randomString()}`,
        descripcion: 'Test Description',
        categoria_id: categoriaId,
        unidad_medida_id: unidadMedidaId,
        stock_actual: 100,
        stock_minimo: 10,
        precio_referencia: 50,
        activo: true
      });
    
    if (!prodRes.body.success) throw new Error('Failed to create product: ' + JSON.stringify(prodRes.body));
    productoId = prodRes.body.data.id;
  });

  afterAll(async () => {
    // Clean up
    if (productoId) {
        // Delete invoice details and invoices referencing this product first?
        // Since we clean up in tests, maybe just force delete
        await pool.execute('DELETE FROM productos WHERE id = ?', [productoId]);
    }
    await pool.end();
  });

  test('Create BORRADOR invoice -> Stock unchanged', async () => {
    const res = await request(app)
      .post('/api/facturas-internas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        codigo_interno: `TEST-${randomString()}`,
        tipo_movimiento_id: tipoMovimientoId,
        concepto: 'Test Concepto',
        usuario_responsable_id: usuarioId,
        fecha_movimiento: new Date().toISOString().split('T')[0],
        estado: 'BORRADOR',
        detalles: [
            { producto_id: productoId, cantidad: 10, precio_unitario: 60 }
        ]
      });

    expect(res.status).toBe(201);
    const invoiceId = res.body.data.id;

    // Check Stock
    const [rows] = await pool.execute<any>('SELECT stock_actual FROM productos WHERE id = ?', [productoId]);
    expect(parseFloat(rows[0].stock_actual)).toBe(100);
    
    // Cleanup invoice
    await request(app).delete(`/api/facturas-internas/${invoiceId}`).set('Authorization', `Bearer ${token}`);
  });

  test('Create CONFIRMADA invoice -> Stock increases', async () => {
    const res = await request(app)
      .post('/api/facturas-internas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        codigo_interno: `TEST-${randomString()}`,
        tipo_movimiento_id: tipoMovimientoId,
        concepto: 'Test Concepto Confirmed',
        usuario_responsable_id: usuarioId,
        fecha_movimiento: new Date().toISOString().split('T')[0],
        estado: 'CONFIRMADA',
        detalles: [
            { producto_id: productoId, cantidad: 5, precio_unitario: 60 }
        ]
      });

    expect(res.status).toBe(201);
    const invoiceId = res.body.data.id;

    // Check Stock (100 + 5 = 105)
    const [rows] = await pool.execute<any>('SELECT stock_actual, precio_referencia FROM productos WHERE id = ?', [productoId]);
    expect(parseFloat(rows[0].stock_actual)).toBe(105);
    expect(parseFloat(rows[0].precio_referencia)).toBe(60);

    // Revert by ANULATING
    await request(app).put(`/api/facturas-internas/${invoiceId}`).set('Authorization', `Bearer ${token}`).send({ estado: 'ANULADA' });
    
    // Check Stock (105 - 5 = 100)
    const [rows2] = await pool.execute<any>('SELECT stock_actual FROM productos WHERE id = ?', [productoId]);
    expect(parseFloat(rows2[0].stock_actual)).toBe(100);
    
    // Delete
    await request(app).delete(`/api/facturas-internas/${invoiceId}`).set('Authorization', `Bearer ${token}`);
  });
  
  test('Update BORRADOR to CONFIRMADA -> Stock increases', async () => {
     // Reset stock to 100
     await pool.execute('UPDATE productos SET stock_actual = 100 WHERE id = ?', [productoId]);

     // Create Borrador
     const createRes = await request(app)
      .post('/api/facturas-internas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        codigo_interno: `TEST-${randomString()}`,
        tipo_movimiento_id: tipoMovimientoId,
        concepto: 'Test Update',
        usuario_responsable_id: usuarioId,
        fecha_movimiento: new Date().toISOString().split('T')[0],
        estado: 'BORRADOR',
        detalles: [
            { producto_id: productoId, cantidad: 20, precio_unitario: 70 }
        ]
      });
      const invoiceId = createRes.body.data.id;
      
      // Update to Confirmed
      const updateRes = await request(app)
        .put(`/api/facturas-internas/${invoiceId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ estado: 'CONFIRMADA' });
        
      expect(updateRes.status).toBe(200);
      
      // Check Stock (100 + 20 = 120)
      const [rows] = await pool.execute<any>('SELECT stock_actual, precio_referencia FROM productos WHERE id = ?', [productoId]);
      expect(parseFloat(rows[0].stock_actual)).toBe(120);
      expect(parseFloat(rows[0].precio_referencia)).toBe(70);
      
      // Cleanup
      await request(app).delete(`/api/facturas-internas/${invoiceId}`).set('Authorization', `Bearer ${token}`);
  });

  test('Incremental Update (CONFIRMADA -> CONFIRMADA)', async () => {
    // Reset stock to 100
    await pool.execute('UPDATE productos SET stock_actual = 100, precio_referencia = 50 WHERE id = ?', [productoId]);

    // Create another product for testing additions
    const prodRes2 = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: `Test Product 2 ${randomString()}`,
        descripcion: 'Test Description 2',
        categoria_id: categoriaId,
        unidad_medida_id: unidadMedidaId,
        stock_actual: 200,
        stock_minimo: 10,
        precio_referencia: 100,
        activo: true
      });
    const productoId2 = prodRes2.body.data.id;

    // 1. Create CONFIRMADA (Qty: 10)
    const createRes = await request(app)
      .post('/api/facturas-internas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        codigo_interno: `TEST-INC-${randomString()}`,
        tipo_movimiento_id: tipoMovimientoId,
        concepto: 'Test Incremental',
        usuario_responsable_id: usuarioId,
        fecha_movimiento: new Date().toISOString().split('T')[0],
        estado: 'CONFIRMADA',
        detalles: [
            { producto_id: productoId, cantidad: 10, precio_unitario: 50 }
        ]
      });
    const invoiceId = createRes.body.data.id;

    // Check Stock 1 (100 + 10 = 110)
    let [rows] = await pool.execute<any>('SELECT stock_actual FROM productos WHERE id = ?', [productoId]);
    expect(parseFloat(rows[0].stock_actual)).toBe(110);

    // 2. Update Qty (10 -> 15) and Price (50 -> 55)
    await request(app)
        .put(`/api/facturas-internas/${invoiceId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
            detalles: [
                { producto_id: productoId, cantidad: 15, precio_unitario: 55 }
            ]
        });
    
    // Check Stock 1 (110 + 5 = 115)
    [rows] = await pool.execute<any>('SELECT stock_actual, precio_referencia FROM productos WHERE id = ?', [productoId]);
    expect(parseFloat(rows[0].stock_actual)).toBe(115);
    expect(parseFloat(rows[0].precio_referencia)).toBe(55);

    // 3. Add New Item (Qty 5) and Reduce Old Item (15 -> 12)
    await request(app)
        .put(`/api/facturas-internas/${invoiceId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
            detalles: [
                { producto_id: productoId, cantidad: 12, precio_unitario: 55 },
                { producto_id: productoId2, cantidad: 5, precio_unitario: 110 }
            ]
        });

    // Check Stock 1 (115 - 3 = 112)
    [rows] = await pool.execute<any>('SELECT stock_actual FROM productos WHERE id = ?', [productoId]);
    expect(parseFloat(rows[0].stock_actual)).toBe(112);

    // Check Stock 2 (200 + 5 = 205)
    [rows] = await pool.execute<any>('SELECT stock_actual, precio_referencia FROM productos WHERE id = ?', [productoId2]);
    expect(parseFloat(rows[0].stock_actual)).toBe(205);
    expect(parseFloat(rows[0].precio_referencia)).toBe(110);

    // 4. Remove Item 1 (Only Item 2 remains)
    await request(app)
        .put(`/api/facturas-internas/${invoiceId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
            detalles: [
                { producto_id: productoId2, cantidad: 5, precio_unitario: 110 }
            ]
        });

    // Check Stock 1 (112 - 12 = 100) -> Back to initial (100) because it was removed from invoice
    [rows] = await pool.execute<any>('SELECT stock_actual FROM productos WHERE id = ?', [productoId]);
    expect(parseFloat(rows[0].stock_actual)).toBe(100);

    // Check Stock 2 (Unchanged 205)
    [rows] = await pool.execute<any>('SELECT stock_actual FROM productos WHERE id = ?', [productoId2]);
    expect(parseFloat(rows[0].stock_actual)).toBe(205);

    // Cleanup
    await request(app).delete(`/api/facturas-internas/${invoiceId}`).set('Authorization', `Bearer ${token}`);
    await pool.execute('DELETE FROM productos WHERE id = ?', [productoId2]);
  });
});
