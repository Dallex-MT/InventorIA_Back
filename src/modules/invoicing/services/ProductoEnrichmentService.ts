import { RowDataPacket } from 'mysql2/promise';
import { pool } from '../../../shared/utils/database';
import { logAppEvent } from '../../../shared/utils/logger';
import { FacturaProcesada, ProductoFactura } from '../models/FacturaProcesada';
import { UnidadMedida } from '../../catalog/models/UnidadMedida';

export class ProductoEnrichmentService {
  static async enrichFactura(factura: FacturaProcesada): Promise<FacturaProcesada> {
    try {
      const unidades = await this.getUnidadesMedidaActivas();
      const productoCache = new Map<string, { id: number; unidad_medida_id: number } | null>();

      const productosEnriquecidos = await Promise.all(
        factura.productos.map(async (p) => {
          const enriched = { ...p } as ProductoFactura & { producto_id?: number; unidad_medida_id?: number };

          const productoMatch = await this.findProductoByNombreOrSimilar(p.nombre, productoCache);
          if (productoMatch) {
            enriched.producto_id = productoMatch.id;
            enriched.unidad_medida_id = productoMatch.unidad_medida_id;
          } else {
            const unidadId = this.findUnidadMedidaId(p.unidad_medida, unidades);
            if (unidadId) {
              enriched.unidad_medida_id = unidadId;
            }
          }

          return enriched as ProductoFactura;
        })
      );

      return { ...factura, productos: productosEnriquecidos };
    } catch (error) {
      logAppEvent('error', 'Error enriqueciendo productos de factura', { error: (error as Error).message });
      return factura;
    }
  }

  private static async getUnidadesMedidaActivas(): Promise<UnidadMedida[]> {
    try {
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT id, nombre, abreviatura, descripcion, activo, NOW() as fecha_creacion, NOW() as fecha_actualizacion FROM unidades_medida WHERE activo = 1'
      );
      return rows as unknown as UnidadMedida[];
    } catch (error) {
      logAppEvent('error', 'Fallo obteniendo unidades de medida', { error: (error as Error).message });
      return [];
    }
  }

  private static async findProductoByNombreOrSimilar(
    nombre: string,
    cache: Map<string, { id: number; unidad_medida_id: number } | null>
  ): Promise<{ id: number; unidad_medida_id: number } | null> {
    const key = this.normalize(nombre);
    if (cache.has(key)) return cache.get(key) || null;

    try {
      const exact = await this.findProductoExacto(nombre);
      if (exact) {
        cache.set(key, exact);
        return exact;
      }

      const candidates = await this.findProductoCandidates(nombre);
      let best: { id: number; unidad_medida_id: number } | null = null;
      let bestScore = 0;
      for (const c of candidates) {
        const score = this.similarity(nombre, c.nombre);
        if (score > bestScore) {
          bestScore = score;
          best = { id: c.id, unidad_medida_id: c.unidad_medida_id };
        }
      }

      if (best && bestScore >= 0.8) {
        cache.set(key, best);
        return best;
      }

      cache.set(key, null);
      return null;
    } catch (error) {
      logAppEvent('error', 'Fallo buscando producto por nombre o similar', { error: (error as Error).message, nombre });
      cache.set(key, null);
      return null;
    }
  }

  private static async findProductoExacto(nombre: string): Promise<{ id: number; unidad_medida_id: number } | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, unidad_medida_id FROM productos WHERE nombre = ? AND activo = 1 LIMIT 1',
      [nombre]
    );
    if (rows.length === 0) return null;
    const row = rows[0] as any;
    return { id: row.id, unidad_medida_id: row.unidad_medida_id };
  }

  private static async findProductoCandidates(nombre: string): Promise<Array<{ id: number; nombre: string; unidad_medida_id: number }>> {
    const tokens = this.tokenize(nombre).slice(0, 4);
    if (tokens.length === 0) return [];

    const conditions = tokens.map(() => 'LOWER(nombre) LIKE ?').join(' AND ');
    const params = tokens.map((t) => `%${t}%`);
    const query = `SELECT id, nombre, unidad_medida_id FROM productos WHERE activo = 1 AND ${conditions} ORDER BY nombre ASC LIMIT 20`;
    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    return rows as unknown as Array<{ id: number; nombre: string; unidad_medida_id: number }>;
  }

  private static findUnidadMedidaId(unidad: string, unidades: UnidadMedida[]): number | null {
    const target = this.normalize(unidad);
    if (!target) return null;

    for (const u of unidades) {
      if (this.normalize(u.nombre) === target) return u.id;
      if (this.normalize(u.abreviatura) === target) return u.id;
    }

    let bestId: number | null = null;
    let bestScore = 0;
    for (const u of unidades) {
      const score = this.similarity(unidad, u.nombre);
      if (score > bestScore) {
        bestScore = score;
        bestId = u.id;
      }
    }
    return bestScore >= 0.8 ? bestId : null;
  }

  private static normalize(s: string): string {
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static tokenize(s: string): string[] {
    return this.normalize(s)
      .split(' ')
      .filter((t) => t.length >= 2)
      .sort((a, b) => b.length - a.length);
  }

  private static similarity(a: string, b: string): number {
    const na = this.normalize(a);
    const nb = this.normalize(b);
    const lev = this.levenshteinRatio(na, nb);
    const jaccard = this.jaccardTokens(na, nb);
    return 0.5 * lev + 0.5 * jaccard;
  }

  private static levenshteinRatio(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    if (m === 0 && n === 0) return 1;
    const dp: number[][] = [];
    for (let i = 0; i <= m; i++) {
      dp[i] = new Array(n + 1).fill(0);
    }
    for (let i = 0; i <= m; i++) dp[i]![0] = i;
    for (let j = 0; j <= n; j++) dp[0]![j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
      }
    }
    const dist = dp[m]![n]!;
    return 1 - dist / Math.max(m, n, 1);
  }

  private static jaccardTokens(a: string, b: string): number {
    const sa = new Set(a.split(' ').filter(Boolean));
    const sb = new Set(b.split(' ').filter(Boolean));
    const intersection = new Set([...sa].filter((x) => sb.has(x)));
    const union = new Set([...sa, ...sb]);
    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }
}
