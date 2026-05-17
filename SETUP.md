# SETUP.md — Dungeon State Updater

Keep `dungeon-state.json` in sync with live OpenClaw session data by running
`update-dungeon-state.py` on a loop. The UI polls this file every 30 seconds.

---

## Quick Start

### One-shot (update once and exit)

```powershell
python3 update-dungeon-state.py
```

### Watch mode (update every 30 seconds, keep running)

```powershell
python3 update-dungeon-state.py --watch
```

### Watch mode with custom interval (e.g. every 15 seconds)

```powershell
python3 update-dungeon-state.py --watch --interval 15
```

### Custom output path

```powershell
python3 update-dungeon-state.py --output /path/to/dungeon-interface/public/dungeon-state.json
```

---

## Linux / macOS

### Background watch (nohup, survives terminal close)

```bash
nohup python3 /home/ubuntu/.openclaw/workspace/dungeon-interface/update-dungeon-state.py --watch > /tmp/dungeon-state-updater.log 2>&1 &
echo "Started. PID: $!"
```

### Check if it's running

```bash
pgrep -a -f "update-dungeon-state.py"
```

### Stop it

```bash
pkill -f "update-dungeon-state.py"
```

---

## Windows (PowerShell)

### Step 1 — Open PowerShell and navigate to the dungeon-interface folder

```powershell
cd C:\path\to\dungeon-interface
```

### Step 2 — Run in watch mode (foreground, Ctrl+C to stop)

```powershell
python update-dungeon-state.py --watch
```

### Step 3 (optional) — Run in background and log output

```powershell
Start-Process python -ArgumentList "update-dungeon-state.py", "--watch" -NoNewWindow -RedirectStandardOutput "$env:TEMP\dungeon-state.log" -PassThru
```

### Step 4 (optional) — Check it's running

```powershell
Get-Process python
```

### Step 5 (optional) — Stop it

```powershell
Stop-Process -Name python
```

---

## What the file contains

`public/dungeon-state.json` is read by the Dungeon Interface UI every 30 s.

```json
{
  "generatedAt": 1778991340,
  "gatewayOnline": true,
  "agents": {
    "grim":   { "status": "running", "model": "myclaw/claude-opus-4.6",    "lastInteractionAt": 1778991340, "totalTokens": 0, "estimatedCostUsd": 0.0 },
    "bob":    { "status": "idle",    "model": "myclaw/gemini-3.1-pro",      "lastInteractionAt": 0,          "totalTokens": 0, "estimatedCostUsd": 0.0 },
    "kevin":  { "status": "idle",    "model": "myclaw/claude-sonnet-4.6",   "lastInteractionAt": 0,          "totalTokens": 0, "estimatedCostUsd": 0.0 },
    "stuart": { "status": "idle",    "model": "myclaw/gpt-5.4-mini",        "lastInteractionAt": 0,          "totalTokens": 0, "estimatedCostUsd": 0.0 },
    "agnes":  { "status": "idle",    "model": "myclaw/claude-sonnet-4.6",   "lastInteractionAt": 0,          "totalTokens": 0, "estimatedCostUsd": 0.0 }
  }
}
```

**Agent status values:**
- `running` — session is actively processing
- `idle` — session exists but not currently processing
- `error` — session encountered an error

---

## Notes

- The script reads `~/.openclaw/openclaw.json` for the gateway token and agent config.
- If the gateway is unreachable, agents default to `idle` status.
- Agnes is included in all outputs as a canonical dungeon agent (`myclaw/claude-sonnet-4.6`).
- The output file is written atomically (temp → rename) so the UI never reads a partial write.
