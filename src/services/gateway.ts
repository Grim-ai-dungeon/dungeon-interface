// ─── gateway.ts — OpenClaw Gateway WebSocket Client ──────────────────────────
// Connects to the OpenClaw Gateway over WebSocket using the same protocol
// as the official control UI client.

type EventHandler = (event: GatewayEvent) => void;

export interface GatewayEvent {
  type: 'event';
  event: string;
  payload: unknown;
  seq?: number;
  stateVersion?: unknown;
}

export interface GatewayConfig {
  url: string;
  token: string;
}

// ─── Persistent config via localStorage ───────────────────────────────────────

const CONFIG_KEY = 'dungeon.gateway.config.v1';

export function loadGatewayConfig(): GatewayConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GatewayConfig;
      if (typeof parsed.url === 'string' && typeof parsed.token === 'string') {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return { url: 'ws://localhost:18789', token: '' };
}

export function saveGatewayConfig(config: GatewayConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

// ─── GatewayClient ─────────────────────────────────────────────────────────────

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
type StatusListener = (status: ConnectionStatus, error?: string) => void;

class GatewayClient {
  private ws: WebSocket | null = null;
  private requestId = 0;
  private pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private eventListeners: EventHandler[] = [];
  private statusListeners: StatusListener[] = [];
  private config: GatewayConfig;
  private status: ConnectionStatus = 'disconnected';
  private connectNonce: string | null = null;
  private connectSent = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private backoffMs = 800;
  private stopped = false;
  private connectGeneration = 0;

  constructor() {
    this.config = loadGatewayConfig();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  configure(url: string, token: string): void {
    this.config = { url: url.trim(), token: token.trim() };
    saveGatewayConfig(this.config);
  }

  getConfig(): GatewayConfig {
    return { ...this.config };
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  connect(): void {
    this.stopped = false;
    this.backoffMs = 800;
    this.doConnect();
  }

  disconnect(): void {
    this.stopped = true;
    this.clearReconnectTimer();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.flushPending(new Error('gateway client stopped'));
    this.setStatus('disconnected');
  }

  async sendMessage(sessionKey: string, message: string): Promise<unknown> {
    return this.request('chat.send', { sessionKey, message });
  }

  async getHistory(sessionKey: string): Promise<unknown> {
    return this.request('chat.history', { sessionKey });
  }

  async abortGeneration(sessionKey: string): Promise<unknown> {
    return this.request('chat.abort', { sessionKey });
  }

  async getUsageCost(startDate?: string, endDate?: string): Promise<unknown> {
    return this.request('usage.cost', { startDate, endDate });
  }

  async getUsageStatus(): Promise<unknown> {
    return this.request('usage.status', {});
  }

  async getModels(): Promise<unknown> {
    return this.request('models.list', { view: 'configured' });
  }

  on(handler: EventHandler): () => void {
    this.eventListeners.push(handler);
    return () => {
      this.eventListeners = this.eventListeners.filter(h => h !== handler);
    };
  }

  onStatus(handler: StatusListener): () => void {
    this.statusListeners.push(handler);
    // immediately fire current status
    handler(this.status);
    return () => {
      this.statusListeners = this.statusListeners.filter(h => h !== handler);
    };
  }

  get connected(): boolean {
    return this.status === 'connected';
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  private setStatus(status: ConnectionStatus, error?: string): void {
    this.status = status;
    for (const l of this.statusListeners) {
      try { l(status, error); } catch { /* ignore */ }
    }
  }

  private doConnect(): void {
    if (this.stopped) return;
    if (!this.config.url) {
      this.setStatus('error', 'No gateway URL configured');
      return;
    }

    this.setStatus('connecting');
    const gen = ++this.connectGeneration;

    let ws: WebSocket;
    try {
      ws = new WebSocket(this.config.url);
    } catch (err) {
      this.setStatus('error', String(err));
      this.scheduleReconnect();
      return;
    }

    this.ws = ws;
    this.connectNonce = null;
    this.connectSent = false;

    ws.addEventListener('message', (evt) => {
      if (this.ws !== ws || this.connectGeneration !== gen) return;
      this.handleMessage(String(evt.data ?? ''));
    });

    ws.addEventListener('close', (evt) => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.flushPending(new Error(`gateway closed (${evt.code}): ${evt.reason ?? ''}`));
      if (!this.stopped) {
        this.setStatus('disconnected');
        this.scheduleReconnect();
      }
    });

    ws.addEventListener('error', () => {
      // The close event will fire shortly after with details
    });
  }

  private scheduleReconnect(): void {
    if (this.stopped) return;
    const delay = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 1.7, 15_000);
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.doConnect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private flushPending(err: Error): void {
    for (const [, { reject }] of this.pending) reject(err);
    this.pending.clear();
  }

  private handleMessage(raw: string): void {
    let frame: { type: string; [k: string]: unknown };
    try {
      frame = JSON.parse(raw) as { type: string };
    } catch {
      return;
    }

    if (frame.type === 'event') {
      const evt = frame as unknown as GatewayEvent;

      // The server sends connect.challenge first — we respond with connect request
      if (evt.event === 'connect.challenge') {
        const payload = evt.payload as { nonce?: string } | null;
        this.connectNonce = (payload && typeof payload.nonce === 'string') ? payload.nonce : null;
        this.sendConnectRequest();
        return;
      }

      // Route all other events to listeners
      try {
        for (const h of this.eventListeners) h(evt);
      } catch (e) {
        console.error('[gateway] event handler error:', e);
      }
      return;
    }

    if (frame.type === 'res') {
      const res = frame as { type: 'res'; id: string; ok: boolean; payload?: unknown; error?: { code?: string; message?: string } };
      const pending = this.pending.get(res.id);
      if (!pending) return;
      this.pending.delete(res.id);
      if (res.ok) {
        pending.resolve(res.payload);
      } else {
        pending.reject(new Error(res.error?.message ?? 'gateway request failed'));
      }
    }
  }

  private sendConnectRequest(): void {
    if (this.connectSent || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.connectSent = true;

    const params = {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: 'dungeon-interface',
        version: '0.1.0',
        platform: 'web',
        mode: 'ui',
      },
      role: 'operator',
      scopes: ['operator.read', 'operator.write'],
      auth: this.config.token ? { token: this.config.token } : undefined,
      ...(this.connectNonce ? { nonce: this.connectNonce } : {}),
      userAgent: navigator.userAgent,
      locale: navigator.language,
    };

    this.requestOnSocket('connect', params)
      .then((payload) => {
        this.backoffMs = 800;
        this.setStatus('connected');
        console.log('[gateway] connected', payload);
      })
      .catch((err: Error) => {
        console.error('[gateway] connect failed:', err.message);
        this.setStatus('error', err.message);
        // Don't auto-reconnect on auth errors — user needs to reconfigure
        if (err.message.includes('token') || err.message.includes('auth') || err.message.includes('pairing')) {
          return;
        }
        if (this.ws) this.ws.close(4008, 'connect failed');
      });
  }

  private request(method: string, params: unknown): Promise<unknown> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('gateway not connected'));
    }
    return this.requestOnSocket(method, params);
  }

  private requestOnSocket(method: string, params: unknown): Promise<unknown> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('gateway not connected'));
    }
    const id = String(++this.requestId);
    const frame = { type: 'req', id, method, params };
    const promise = new Promise<unknown>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
    this.ws.send(JSON.stringify(frame));
    return promise;
  }
}

// ─── Singleton ─────────────────────────────────────────────────────────────────

export const gateway = new GatewayClient();
