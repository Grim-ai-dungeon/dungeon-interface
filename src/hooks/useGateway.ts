// ─── useGateway.ts — React hook for OpenClaw Gateway integration ─────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { gateway, type GatewayEvent } from '../services/gateway';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface GatewayMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  text: string;
  timestamp: number;
  streaming?: boolean;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type AgentRunStatus = 'idle' | 'running' | 'error';

interface UseGatewayReturn {
  connected: boolean;
  status: ConnectionStatus;
  sendMessage: (agentId: string, text: string) => Promise<void>;
  getHistory: (agentId: string) => Promise<void>;
  abortGeneration: (agentId: string) => Promise<void>;
  getAgentStatus: (agentId: string) => AgentRunStatus;
  messages: Record<string, GatewayMessage[]>;
  generatingAgents: Set<string>;
  agentStatuses: Record<string, AgentRunStatus>;
}

// ─── Session key mapping ────────────────────────────────────────────────────────

function sessionKeyFor(agentId: string): string {
  return `agent:${agentId}:main`;
}

// ─── History message parsing ────────────────────────────────────────────────────

interface HistoryEntry {
  id?: string;
  role?: string;
  content?: string | { text?: string }[];
  timestamp?: number;
  createdAt?: number;
}

function parseHistoryMessages(agentId: string, payload: unknown): GatewayMessage[] {
  if (!payload || typeof payload !== 'object') return [];
  const p = payload as { messages?: HistoryEntry[]; turns?: HistoryEntry[] };
  const raw = p.messages ?? p.turns ?? [];
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry, idx): GatewayMessage | null => {
      const role = typeof entry.role === 'string' ? entry.role : 'system';
      const text = extractText(entry.content);
      if (!text) return null;

      const ts = entry.timestamp ?? entry.createdAt ?? Date.now();
      const mappedRole: GatewayMessage['role'] =
        role === 'user' ? 'user' :
        role === 'assistant' || role === 'agent' ? 'agent' :
        'system';

      return {
        id: entry.id ?? `hist-${agentId}-${idx}`,
        role: mappedRole,
        text,
        timestamp: ts,
      };
    })
    .filter((m): m is GatewayMessage => m !== null);
}

function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map(c => (typeof c === 'object' && c && 'text' in c ? (c as { text?: string }).text ?? '' : ''))
      .join('');
  }
  return '';
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useGateway(): UseGatewayReturn {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [messages, setMessages] = useState<Record<string, GatewayMessage[]>>({});
  const [generatingAgents, setGeneratingAgents] = useState<Set<string>>(new Set());
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentRunStatus>>({});

  // Track partial (streaming) messages per session key
  const streamBuffers = useRef<Map<string, { id: string; text: string }>>(new Map());

  // ── Connect to gateway on mount ──────────────────────────────────────────────
  useEffect(() => {
    // Subscribe to connection status changes
    const unsubStatus = gateway.onStatus((s, _err) => {
      setStatus(s);
    });

    // Subscribe to gateway events
    const unsubEvents = gateway.on((evt: GatewayEvent) => {
      handleGatewayEvent(evt);
    });

    // Connect (or reconnect) the gateway
    gateway.connect();

    return () => {
      unsubStatus();
      unsubEvents();
      // Don't disconnect on unmount — singleton stays alive for other panels
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Gateway event handler ────────────────────────────────────────────────────

  const handleGatewayEvent = useCallback((evt: GatewayEvent) => {
    // chat event — a complete message or partial token stream
    if (evt.event === 'chat') {
      const p = evt.payload as {
        sessionKey?: string;
        message?: {
          id?: string;
          role?: string;
          content?: string | { text?: string }[];
          createdAt?: number;
          timestamp?: number;
        };
        delta?: string;        // streaming token
        done?: boolean;        // streaming complete
        streaming?: boolean;
      };

      if (!p?.sessionKey) return;

      // Map sessionKey → agentId
      const agentId = extractAgentId(p.sessionKey);
      if (!agentId) return;

      if (p.delta !== undefined) {
        // Streaming token delta
        const buf = streamBuffers.current.get(p.sessionKey) ?? { id: `stream-${p.sessionKey}`, text: '' };
        buf.text += p.delta;
        streamBuffers.current.set(p.sessionKey, buf);

        setMessages(prev => {
          const current = prev[agentId] ?? [];
          const existing = current.findIndex(m => m.id === buf.id);
          const msg: GatewayMessage = {
            id: buf.id,
            role: 'agent',
            text: buf.text,
            timestamp: Date.now(),
            streaming: !p.done,
          };
          if (existing >= 0) {
            const updated = [...current];
            updated[existing] = msg;
            return { ...prev, [agentId]: updated };
          }
          return { ...prev, [agentId]: [...current, msg] };
        });

        if (p.done) {
          streamBuffers.current.delete(p.sessionKey);
          setGeneratingAgents(prev => {
            const next = new Set(prev);
            next.delete(agentId);
            return next;
          });
          setAgentStatuses(prev => ({ ...prev, [agentId]: 'idle' }));
        }
      } else if (p.message) {
        // Complete message (non-streaming)
        const text = extractText(p.message.content);
        if (!text) return;

        const role = p.message.role === 'user' ? 'user' :
                     p.message.role === 'assistant' || p.message.role === 'agent' ? 'agent' :
                     'system';

        const msg: GatewayMessage = {
          id: p.message.id ?? `msg-${Date.now()}`,
          role: role as GatewayMessage['role'],
          text,
          timestamp: p.message.createdAt ?? p.message.timestamp ?? Date.now(),
        };

        setMessages(prev => {
          const current = prev[agentId] ?? [];
          // Avoid duplicates by id
          if (current.some(m => m.id === msg.id)) return prev;
          return { ...prev, [agentId]: [...current, msg] };
        });

        // Clear generating state on complete agent message
        if (role === 'agent') {
          setGeneratingAgents(prev => {
            const next = new Set(prev);
            next.delete(agentId);
            return next;
          });
          setAgentStatuses(prev => ({ ...prev, [agentId]: 'idle' }));
        }
      }
    }

    // agent event — generation status updates
    if (evt.event === 'agent') {
      const p = evt.payload as {
        sessionKey?: string;
        status?: string;
        generating?: boolean;
      };
      if (!p?.sessionKey) return;
      const agentId = extractAgentId(p.sessionKey);
      if (!agentId) return;

      const isGenerating = p.generating === true || p.status === 'generating' || p.status === 'running';
      setGeneratingAgents(prev => {
        const next = new Set(prev);
        if (isGenerating) {
          next.add(agentId);
        } else {
          next.delete(agentId);
        }
        return next;
      });

      // Also update agentStatuses
      const runStatus: AgentRunStatus = isGenerating ? 'running' :
        (p.status === 'error' ? 'error' : 'idle');
      setAgentStatuses(prev => ({ ...prev, [agentId]: runStatus }));
    }
  }, []);

  // ── Public actions ────────────────────────────────────────────────────────────

  const getAgentStatus = useCallback((agentId: string): AgentRunStatus => {
    if (generatingAgents.has(agentId)) return 'running';
    return agentStatuses[agentId] ?? 'idle';
  }, [generatingAgents, agentStatuses]);

  const sendMessage = useCallback(async (agentId: string, text: string): Promise<void> => {
    const sessionKey = sessionKeyFor(agentId);
    // Optimistically add user message to local state
    const userMsg: GatewayMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: Date.now(),
    };
    setMessages(prev => ({
      ...prev,
      [agentId]: [...(prev[agentId] ?? []), userMsg],
    }));

    // Mark as generating
    setGeneratingAgents(prev => new Set([...prev, agentId]));
    setAgentStatuses(prev => ({ ...prev, [agentId]: 'running' }));

    try {
      await gateway.sendMessage(sessionKey, text);
    } catch (err) {
      console.error(`[useGateway] sendMessage error:`, err);
      // Add error message to chat
      const errMsg: GatewayMessage = {
        id: `err-${Date.now()}`,
        role: 'system',
        text: `Failed to send: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: Date.now(),
      };
      setMessages(prev => ({
        ...prev,
        [agentId]: [...(prev[agentId] ?? []), errMsg],
      }));
      setGeneratingAgents(prev => {
        const next = new Set(prev);
        next.delete(agentId);
        return next;
      });
      setAgentStatuses(prev => ({ ...prev, [agentId]: 'error' }));
    }
  }, []);

  const getHistory = useCallback(async (agentId: string): Promise<void> => {
    const sessionKey = sessionKeyFor(agentId);
    try {
      const payload = await gateway.getHistory(sessionKey);
      const histMsgs = parseHistoryMessages(agentId, payload);
      if (histMsgs.length > 0) {
        setMessages(prev => {
          const existing = prev[agentId] ?? [];
          // Merge: prepend history, avoiding id duplicates
          const existingIds = new Set(existing.map(m => m.id));
          const newHist = histMsgs.filter(m => !existingIds.has(m.id));
          return { ...prev, [agentId]: [...newHist, ...existing] };
        });
      }
    } catch (err) {
      // History load failure is non-fatal — just log it
      console.warn(`[useGateway] getHistory(${agentId}):`, err);
    }
  }, []);

  const abortGeneration = useCallback(async (agentId: string): Promise<void> => {
    const sessionKey = sessionKeyFor(agentId);
    try {
      await gateway.abortGeneration(sessionKey);
    } catch (err) {
      console.warn(`[useGateway] abortGeneration(${agentId}):`, err);
    }
    setGeneratingAgents(prev => {
      const next = new Set(prev);
      next.delete(agentId);
      return next;
    });
    setAgentStatuses(prev => ({ ...prev, [agentId]: 'idle' }));
  }, []);

  return {
    connected: status === 'connected',
    status,
    sendMessage,
    getHistory,
    abortGeneration,
    getAgentStatus,
    messages,
    generatingAgents,
    agentStatuses,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractAgentId(sessionKey: string): string | null {
  // session key format: agent:<agentId>:main
  const match = sessionKey.match(/^agent:([^:]+):/);
  return match ? match[1] : null;
}
