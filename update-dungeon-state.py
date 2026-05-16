#!/usr/bin/env python3
"""
update-dungeon-state.py — Reads real OpenClaw session data and writes
a static JSON snapshot to public/dungeon-state.json for the Dungeon Interface.

Run this periodically (e.g., from a cron or heartbeat) to keep the UI
showing real agent states. The app polls this file every 30 seconds.
"""
import json, os, time, sys

BASE = os.path.expanduser('~/.openclaw/agents')
OUT  = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public', 'dungeon-state.json')

AGENT_MAP = {
    'grim':   'main',   # Grim's sessions live under agents/main/
    'bob':    'bob',
    'kevin':  'kevin',
    'stuart': 'stuart',
}

agents = {}
for agent_id, folder in AGENT_MAP.items():
    sessions_path = os.path.join(BASE, folder, 'sessions', 'sessions.json')
    if not os.path.exists(sessions_path):
        continue
    try:
        with open(sessions_path) as f:
            data = json.load(f)
        sessions = list(data.values())
        if not sessions:
            continue
        latest = max(sessions, key=lambda s: s.get('lastInteractionAt', 0))
        agents[agent_id] = {
            'status':              latest.get('status', 'idle'),
            'model':               latest.get('model', 'unknown'),
            'lastInteractionAt':   latest.get('lastInteractionAt', 0),
            'totalTokens':         latest.get('totalTokens', 0),
            'estimatedCostUsd':    latest.get('estimatedCostUsd', 0),
        }
    except Exception as e:
        print(f'[warn] Could not read {sessions_path}: {e}', file=sys.stderr)

output = {
    'generatedAt': int(time.time() * 1000),
    'agents': agents,
}

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w') as f:
    json.dump(output, f, indent=2)

print(f'[ok] dungeon-state.json updated ({len(agents)} agents)')
