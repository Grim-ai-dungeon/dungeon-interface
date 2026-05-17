// ─── useScreenCapture.ts — Hook for on-demand screen capture via Tauri ───────
//
// Phase 1: single on-demand capture of the primary monitor.
// Wraps the `capture_screenshot` Tauri command.
// Future: add interval watching, multi-monitor, crop region.

import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

// ─── Types (mirror Rust's ScreenshotResult) ──────────────────────────────────

export interface ScreenshotResult {
  /** `data:image/png;base64,...` — ready for <img src> */
  dataUrl: string;
  /** Absolute path of the saved PNG on disk */
  savedPath: string;
  /** Unix timestamp (ms) of capture */
  capturedAt: number;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** 0-based monitor index captured */
  monitorIndex: number;
}

export type CaptureStatus = 'idle' | 'capturing' | 'success' | 'error';

export interface ScreenCaptureState {
  status: CaptureStatus;
  result: ScreenshotResult | null;
  error: string | null;
  capture: (monitorIndex?: number) => Promise<void>;
  clear: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useScreenCapture(): ScreenCaptureState {
  const [status, setStatus] = useState<CaptureStatus>('idle');
  const [result, setResult] = useState<ScreenshotResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const capture = useCallback(async (monitorIndex?: number) => {
    setStatus('capturing');
    setError(null);
    try {
      const res = await invoke<ScreenshotResult>('capture_screenshot', {
        monitorIndex: monitorIndex ?? 0,
      });
      setResult(res);
      setStatus('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus('error');
    }
  }, []);

  const clear = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  return { status, result, error, capture, clear };
}
