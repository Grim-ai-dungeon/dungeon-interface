// ─── Dungeon Interface — Tauri Rust backend ───────────────────────────────────

use base64::Engine as _;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use xcap::Monitor;

// ─── Greet (built-in placeholder) ─────────────────────────────────────────────

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// ─── Screen capture types ──────────────────────────────────────────────────────

/// Returned to the frontend after a successful capture.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScreenshotResult {
    /// PNG encoded as `data:image/png;base64,<data>` — ready for an <img src>
    pub data_url: String,
    /// Absolute path where the PNG was persisted on disk
    pub saved_path: String,
    /// Unix timestamp (ms) of capture
    pub captured_at: u64,
    /// Width in pixels
    pub width: u32,
    /// Height in pixels
    pub height: u32,
    /// 0-based index of the monitor that was captured
    pub monitor_index: usize,
}

// ─── Helper: resolve workspace screenshots directory ───────────────────────────

fn screenshots_dir() -> PathBuf {
    // Resolve to ~/.openclaw/workspace/screenshots/
    let base = dirs_next::home_dir()
        .unwrap_or_else(|| PathBuf::from("/tmp"))
        .join(".openclaw")
        .join("workspace")
        .join("screenshots");
    base
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

// ─── Tauri command: capture_screenshot ────────────────────────────────────────
//
// Captures the primary monitor (index 0, or the first available) and:
//  1. Saves latest.png to ~/.openclaw/workspace/screenshots/
//  2. Saves a timestamped copy for history
//  3. Returns a base64 PNG data URL + metadata to the frontend
//
// Phase 1: on-demand, single capture, primary monitor.
// Future: extend with monitor selection, cropping, automatic watching intervals.

#[tauri::command]
fn capture_screenshot(monitor_index: Option<usize>) -> Result<ScreenshotResult, String> {
    // Grab all monitors
    let monitors = Monitor::all().map_err(|e| format!("Failed to enumerate monitors: {e}"))?;
    if monitors.is_empty() {
        return Err("No monitors found — is a display server running?".to_string());
    }

    let idx = monitor_index.unwrap_or(0).min(monitors.len() - 1);
    let monitor = &monitors[idx];

    // Capture
    let image = monitor
        .capture_image()
        .map_err(|e| format!("Capture failed: {e}"))?;

    let width = image.width();
    let height = image.height();

    // Prepare output directory
    let dir = screenshots_dir();
    fs::create_dir_all(&dir)
        .map_err(|e| format!("Could not create screenshots dir {}: {e}", dir.display()))?;

    let ts = now_ms();

    // Timestamped copy (for history / Bob later)
    let ts_path = dir.join(format!("screenshot_{ts}.png"));
    image
        .save(&ts_path)
        .map_err(|e| format!("Failed to save timestamped PNG: {e}"))?;

    // Also write / overwrite latest.png for easy Bob integration
    let latest_path = dir.join("latest.png");
    fs::copy(&ts_path, &latest_path)
        .map_err(|e| format!("Failed to write latest.png: {e}"))?;

    // Read back as bytes for base64 encoding
    let png_bytes = fs::read(&ts_path)
        .map_err(|e| format!("Failed to read saved PNG: {e}"))?;

    let b64 = base64::engine::general_purpose::STANDARD.encode(&png_bytes);
    let data_url = format!("data:image/png;base64,{b64}");

    Ok(ScreenshotResult {
        data_url,
        saved_path: latest_path.to_string_lossy().into_owned(),
        captured_at: ts,
        width,
        height,
        monitor_index: idx,
    })
}

// ─── Entry point ───────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, capture_screenshot])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
