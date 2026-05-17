#!/usr/bin/env python3
"""
update-dungeon-state.py — Dungeon State Updater
================================================
Reads OpenClaw config/runtime to build a dungeon-state.json that the
Dungeon Interface can consume. Run periodically (cron, watch, etc.) to
keep the UI in sync with real agent status.

Usage:
    python3 update-dungeon-state.py [--output /path/to/dungeon-state.json]

The file is written atomically (temp → rename) so the UI never reads
a half-written file.
"""

import json
import os
import sys
import time
import argparse
import tempfile
import urllib.request
import urllib.error

# ─── Config ───────────────────────────────────────────────────────────────────

OPENCLAW_CONFIG = os.path.expanduser("~/.openclaw/openclaw.json")
GATEWAY_BASE    = "http://localhost:18789"
AUTH_HEADER     = None   # populated after reading config
DEFAULT_OUTPUT  = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "public", "dungeon-state.json"
)

# Agent IDs we care about (maps config `id` → display id used by UI)
AGENT_ID_MAP = {
    "main":   "grim",
    "grim":   "grim",
    "bob":    "bob",
    "kevin":  "kevin",
    "stuart": "stuart",
    "agnes":  "agnes",
}

# Default model when config doesn't specify
DEFAULT_MODEL = "myclaw/claude-opus-4.6"


# ─── Helpers ──────────────────────────────────────────────────────────────────

def load_openclaw_config() -> dict:
    """Load and return the OpenClaw config file."""
    if not os.path.exists(OPENCLAW_CONFIG):
        print(f"[warn] Config not found at {OPENCLAW_CONFIG}", file=sys.stderr)
        return {}
    with open(OPENCLAW_CONFIG) as f:
        return json.load(f)


def gateway_get(path: str, token: str | None, timeout: float = 3.0) -> dict | None:
    """
    Make a GET request to the OpenClaw gateway.
    Returns parsed JSON dict on success, None on any failure.
    """
    url = GATEWAY_BASE.rstrip("/") + "/" + path.lstrip("/")
    req = urllib.request.Request(url)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode()
            return json.loads(body)
    except (urllib.error.HTTPError, urllib.error.URLError, json.JSONDecodeError, OSError):
        return None


def gateway_online(token: str | None) -> bool:
    """Quick health check — returns True if gateway is reachable."""
    result = gateway_get("/health", token)
    return isinstance(result, dict) and (result.get("ok") or result.get("status") == "live")


def build_agent_entry(
    agent_id: str,
    model: str,
    status: str = "idle",
    last_interaction: int = 0,
    total_tokens: int = 0,
    cost_usd: float = 0.0,
) -> dict:
    return {
        "status":             status,
        "model":              model,
        "lastInteractionAt":  last_interaction,
        "totalTokens":        total_tokens,
        "estimatedCostUsd":   cost_usd,
    }


# ─── Main logic ───────────────────────────────────────────────────────────────

def build_dungeon_state(config: dict, token: str | None) -> dict:
    """
    Build the dungeon-state dict from whatever data is available.

    Priority:
      1. Live session data from gateway API (future — endpoint not yet available)
      2. Agent config from openclaw.json (always available)
    """
    agents_config = config.get("agents", {}).get("list", [])
    default_model  = (
        config.get("agents", {})
              .get("defaults", {})
              .get("model", {})
              .get("primary", DEFAULT_MODEL)
    )

    # ── Build base agent map from config ─────────────────────────────────────
    agent_map: dict[str, dict] = {}

    for ag in agents_config:
        raw_id   = ag.get("id", "")
        ui_id    = AGENT_ID_MAP.get(raw_id)
        if ui_id is None:
            continue  # skip unknown agents (e.g. agnes)

        model = (
            ag.get("model", {}).get("primary")
            or default_model
        )

        # Default status from config — agents are "idle" unless we learn otherwise
        agent_map[ui_id] = build_agent_entry(
            agent_id=ui_id,
            model=model,
            status="idle",
        )

    # ── Ensure all 5 canonical agents exist with fallback defaults ────────────
    canonical = {
        "grim":   DEFAULT_MODEL,
        "bob":    "myclaw/gemini-3.1-pro",
        "kevin":  "myclaw/claude-sonnet-4.6",
        "stuart": "myclaw/gpt-5.4-mini",
        "agnes":  "myclaw/claude-sonnet-4.6",
    }
    for uid, fallback_model in canonical.items():
        if uid not in agent_map:
            agent_map[uid] = build_agent_entry(
                agent_id=uid,
                model=fallback_model,
                status="idle",
            )

    # ── Try to get live session data from gateway ─────────────────────────────
    # The /health endpoint confirms the gateway is running. If/when a sessions
    # endpoint becomes available, query it here and update agent_map statuses.
    #
    # For now: if the gateway is reachable, mark Grim as "running" (the main
    # orchestrator session is always live while the gateway is up).
    gw_live = gateway_online(token)
    if gw_live:
        # Grim (main) is always active when gateway is online
        if "grim" in agent_map:
            agent_map["grim"]["status"] = "running"
            agent_map["grim"]["lastInteractionAt"] = int(time.time())

        # Attempt to read live session file if present (written by OpenClaw runtime)
        session_file = os.path.expanduser("~/.openclaw/sessions.json")
        if os.path.exists(session_file):
            try:
                with open(session_file) as f:
                    sessions = json.load(f)
                _apply_sessions(agent_map, sessions)
            except Exception as e:
                print(f"[warn] Could not parse sessions.json: {e}", file=sys.stderr)

    return {
        "generatedAt": int(time.time()),
        "gatewayOnline": gw_live,
        "agents": agent_map,
    }


def _apply_sessions(agent_map: dict, sessions) -> None:
    """
    If OpenClaw exposes a sessions.json or similar file, parse it and
    update agent statuses. This is a best-effort fallback.
    """
    if not isinstance(sessions, (list, dict)):
        return

    # Handle both list-of-sessions and dict-keyed formats
    session_list = sessions if isinstance(sessions, list) else list(sessions.values())

    for sess in session_list:
        if not isinstance(sess, dict):
            continue

        agent_id_raw = sess.get("agentId") or sess.get("agent_id") or sess.get("id", "")
        ui_id = AGENT_ID_MAP.get(agent_id_raw)
        if ui_id is None or ui_id not in agent_map:
            continue

        raw_status = sess.get("status", "")
        if raw_status in ("running", "active"):
            agent_map[ui_id]["status"] = "running"
        elif raw_status in ("error", "crashed"):
            agent_map[ui_id]["status"] = "error"
        else:
            agent_map[ui_id]["status"] = "idle"

        if sess.get("lastInteractionAt"):
            agent_map[ui_id]["lastInteractionAt"] = int(sess["lastInteractionAt"])
        if sess.get("totalTokens"):
            agent_map[ui_id]["totalTokens"] = int(sess["totalTokens"])
        if sess.get("estimatedCostUsd"):
            agent_map[ui_id]["estimatedCostUsd"] = float(sess["estimatedCostUsd"])


def write_atomic(path: str, data: dict) -> None:
    """Write JSON atomically using a temp file + rename."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp_fd, tmp_path = tempfile.mkstemp(
        dir=os.path.dirname(path),
        prefix=".dungeon-state-",
        suffix=".tmp",
    )
    try:
        with os.fdopen(tmp_fd, "w") as f:
            json.dump(data, f, indent=2)
        os.replace(tmp_path, path)
    except Exception:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


# ─── Entry point ──────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Update dungeon-state.json for the Dungeon Interface.")
    parser.add_argument(
        "--output", "-o",
        default=DEFAULT_OUTPUT,
        help=f"Output path for dungeon-state.json (default: {DEFAULT_OUTPUT})",
    )
    parser.add_argument(
        "--watch", "-w",
        action="store_true",
        help="Run continuously, updating every 30 seconds",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=30,
        help="Interval in seconds between updates in watch mode (default: 30)",
    )
    args = parser.parse_args()

    def run_once() -> None:
        config = load_openclaw_config()
        token = config.get("gateway", {}).get("auth", {}).get("token")
        state = build_dungeon_state(config, token)
        write_atomic(args.output, state)
        agent_statuses = {k: v["status"] for k, v in state["agents"].items()}
        gw = "online" if state.get("gatewayOnline") else "offline"
        print(f"[{time.strftime('%H:%M:%S')}] dungeon-state.json updated. "
              f"gateway={gw} agents={agent_statuses}")

    if args.watch:
        print(f"[watch] Updating every {args.interval}s — Ctrl+C to stop")
        while True:
            try:
                run_once()
            except Exception as e:
                print(f"[error] {e}", file=sys.stderr)
            time.sleep(args.interval)
    else:
        run_once()


if __name__ == "__main__":
    main()
