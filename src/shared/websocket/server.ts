import { WebSocketServer, WebSocket, RawData } from 'ws'
import { IncomingMessage } from 'http'
import { logAppEvent } from '../utils/logger'

type SubscriptionFilters = {
  activeFilter?: boolean | undefined
  categoriaId?: number | undefined
  unidadMedida?: string | undefined
  searchText?: string | undefined
}

type ClientMeta = {
  id?: string
  subscriptions: Map<string, SubscriptionFilters>
  isAlive: boolean
}

let wss: WebSocketServer | null = null
const clients = new Set<WebSocket>()
const meta = new Map<WebSocket, ClientMeta>()
const topicIndex = new Map<string, Set<WebSocket>>()
let broadcastQueue: Promise<void> = Promise.resolve()

export const initWebSocketServer = (): void => {
  if (wss) return
  const port = parseInt(process.env['WS_PORT'] || '3001', 10)
  wss = new WebSocketServer({ port })

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    clients.add(ws)
    const m: ClientMeta = { subscriptions: new Map(), isAlive: true }
    try {
      const url = new URL(req.url || '/', `http://${req.headers['host'] || 'localhost'}`)
      const cid = url.searchParams.get('clientId') || undefined
      if (cid) m.id = cid
    } catch { }
    meta.set(ws, m)
    logAppEvent('info', 'ws_connected', { clientId: m.id, total: clients.size })

    ws.on('pong', () => {
      const mm = meta.get(ws)
      if (mm) mm.isAlive = true
    })

    ws.on('message', (data: RawData) => {
      try {
        const raw = typeof data === 'string' ? data : data.toString()
        const msg = JSON.parse(raw)
        if (msg && msg.type === 'subscribe' && typeof msg.topic === 'string') {
          const mm = meta.get(ws)
          if (!mm) return
          const filters: SubscriptionFilters = {
            activeFilter: typeof msg.filters?.activeFilter === 'boolean' ? msg.filters.activeFilter : undefined,
            categoriaId: typeof msg.filters?.categoriaId === 'number' ? msg.filters.categoriaId : undefined,
            unidadMedida: typeof msg.filters?.unidadMedida === 'string' ? msg.filters.unidadMedida : undefined,
            searchText: typeof msg.filters?.searchText === 'string' ? msg.filters.searchText : undefined
          }
          mm.subscriptions.set(msg.topic, filters)
          if (!topicIndex.has(msg.topic)) topicIndex.set(msg.topic, new Set())
          topicIndex.get(msg.topic)!.add(ws)
          logAppEvent('info', 'ws_subscribed', { clientId: mm.id, topic: msg.topic })
        } else if (msg && msg.type === 'unsubscribe' && typeof msg.topic === 'string') {
          const mm = meta.get(ws)
          if (!mm) return
          mm.subscriptions.delete(msg.topic)
          const set = topicIndex.get(msg.topic)
          if (set) {
            set.delete(ws)
            if (set.size === 0) topicIndex.delete(msg.topic)
          }
          logAppEvent('info', 'ws_unsubscribed', { clientId: mm.id, topic: msg.topic })
        } else if (msg && msg.type === 'identify' && typeof msg.clientId === 'string') {
          const mm = meta.get(ws)
          if (mm) mm.id = msg.clientId
        } else if (msg && msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }))
        }
      } catch (e) {
        logAppEvent('error', 'ws_message_error', { error: e instanceof Error ? e.message : String(e) })
      }
    })

    ws.on('close', () => {
      const mm = meta.get(ws)
      for (const [topic] of mm?.subscriptions || []) {
        const set = topicIndex.get(topic)
        if (set) {
          set.delete(ws)
          if (set.size === 0) topicIndex.delete(topic)
        }
      }
      meta.delete(ws)
      clients.delete(ws)
      logAppEvent('info', 'ws_disconnected', { clientId: mm?.id, total: clients.size })
    })

    ws.on('error', (err: Error) => {
      logAppEvent('error', 'ws_error', { error: err.message })
    })
  })

  const interval = setInterval(() => {
    for (const ws of clients) {
      const mm = meta.get(ws)
      if (!mm) continue
      if (!mm.isAlive) {
        try { ws.terminate() } catch { }
        continue
      }
      mm.isAlive = false
      try { ws.ping() } catch { }
    }
  }, 30000)

  wss.on('close', () => {
    clearInterval(interval)
  })
}

export const publish = (topic: string, payload: any, filterSelector?: (filters: SubscriptionFilters) => boolean): void => {
  if (!wss) return
  const set = topicIndex.get(topic)
  if (!set || set.size === 0) return
  const msg = JSON.stringify({ type: topic, data: payload })
  broadcastQueue = broadcastQueue.then(async () => {
    for (const ws of set) {
      if (ws.readyState !== WebSocket.OPEN) continue
      const mm = meta.get(ws)
      if (!mm) continue
      const filters = mm.subscriptions.get(topic)
      if (filters && filterSelector && !filterSelector(filters)) continue
      const buffered = (ws as any).bufferedAmount as number | undefined
      if (buffered !== undefined && buffered > 1048576) continue
      try { ws.send(msg) } catch (e) {
        logAppEvent('error', 'ws_send_error', { error: e instanceof Error ? e.message : String(e) })
      }
    }
  }).catch(() => { })
}

export const publishProductosList = (context: {
  activeFilter?: boolean | undefined
  categoriaId?: number | undefined
  unidadMedida?: string | undefined
  searchText?: string | undefined
  result: { products: any[]; total: number; page: number; totalPages: number }
}): void => {
  const { activeFilter, categoriaId, unidadMedida, searchText, result } = context
  publish('productos:list', { filters: { activeFilter, categoriaId, unidadMedida, searchText }, result }, (filters) => {
    if (filters.activeFilter !== undefined && filters.activeFilter !== activeFilter) return false
    if (filters.categoriaId !== undefined && filters.categoriaId !== categoriaId) return false
    if (filters.unidadMedida !== undefined && filters.unidadMedida !== unidadMedida) return false
    if (filters.searchText !== undefined && filters.searchText !== searchText) return false
    return true
  })
}

export const publishProductoChange = (
  action: 'created' | 'updated' | 'deleted',
  producto: any
): void => {
  publish(`productos:${action}`, { producto })
}