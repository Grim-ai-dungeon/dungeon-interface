// ─── AddAgentModal.tsx — Modal to add a new agent room ───────────────────────

import React, { useState, useEffect, useRef } from 'react';
import './AddAgentModal.css';

// ─── Preset room colors ────────────────────────────────────────────────────────
export const ROOM_COLOR_PRESETS: { label: string; hex: string; pixi: number }[] = [
  { label: 'Crimson',  hex: '#CC3333', pixi: 0xCC3333 },
  { label: 'Emerald',  hex: '#33CC66', pixi: 0x33CC66 },
  { label: 'Sapphire', hex: '#3366CC', pixi: 0x3366CC },
  { label: 'Violet',   hex: '#9933CC', pixi: 0x9933CC },
  { label: 'Amber',    hex: '#CC8833', pixi: 0xCC8833 },
  { label: 'Teal',     hex: '#33AACC', pixi: 0x33AACC },
  { label: 'Rose',     hex: '#CC3399', pixi: 0xCC3399 },
  { label: 'Lime',     hex: '#88CC33', pixi: 0x88CC33 },
];

// ─── Floor type options ────────────────────────────────────────────────────────
const FLOOR_OPTIONS: { label: string; value: 'stone' | 'brick' | 'gold' }[] = [
  { label: '🪨 Stone',  value: 'stone' },
  { label: '🧱 Brick',  value: 'brick' },
  { label: '✨ Gold',   value: 'gold'  },
];

// ─── Props ─────────────────────────────────────────────────────────────────────
export interface NewAgentData {
  name: string;
  role: string;
  emoji: string;
  model: string;
  colorHex: string;
  colorPixi: number;
  floorType: 'stone' | 'brick' | 'gold';
}

interface Props {
  onClose: () => void;
  onAdd: (data: NewAgentData) => void;
  existingNames: string[];
  availableModels?: string[];
}

// ─── AddAgentModal ─────────────────────────────────────────────────────────────
export function AddAgentModal({ onClose, onAdd, existingNames, availableModels }: Props) {
  const [name, setName]     = useState('');
  const [role, setRole]     = useState('');
  const [emoji, setEmoji]   = useState('👾');
  const [model, setModel]   = useState(availableModels?.[0] ?? '');
  const [colorIdx, setColorIdx] = useState(0);
  const [floor, setFloor]   = useState<'stone' | 'brick' | 'gold'>('stone');
  const [error, setError]   = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  // Auto-focus name on mount
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function validate(): boolean {
    if (!name.trim()) {
      setError('A name is required, minion!');
      return false;
    }
    if (existingNames.map(n => n.toLowerCase()).includes(name.trim().toLowerCase())) {
      setError('A room with that name already exists!');
      return false;
    }
    if (!role.trim()) {
      setError('What does this minion DO? Enter a role.');
      return false;
    }
    return true;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const preset = ROOM_COLOR_PRESETS[colorIdx];
    onAdd({
      name: name.trim(),
      role: role.trim(),
      emoji: emoji.trim() || '👾',
      model: model.trim(),
      colorHex: preset.hex,
      colorPixi: preset.pixi,
      floorType: floor,
    });
  }

  const preset = ROOM_COLOR_PRESETS[colorIdx];

  return (
    <div className="aam-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="aam-modal" style={{ '--room-color': preset.hex } as React.CSSProperties}>
        {/* Header */}
        <div className="aam-header">
          <span className="aam-title">⚡ RECRUIT NEW MINION</span>
          <button className="aam-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form className="aam-form" onSubmit={handleSubmit}>
          {/* Name */}
          <div className="aam-field">
            <label className="aam-label">CHAMBER NAME</label>
            <input
              ref={nameRef}
              className="aam-input"
              type="text"
              placeholder="e.g. Zorg's Armory"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              maxLength={32}
            />
          </div>

          {/* Role */}
          <div className="aam-field">
            <label className="aam-label">ROLE / SPECIALTY</label>
            <input
              className="aam-input"
              type="text"
              placeholder="e.g. Scout, Alchemist, Builder"
              value={role}
              onChange={e => { setRole(e.target.value); setError(''); }}
              maxLength={48}
            />
          </div>

          {/* Emoji + Model on same row */}
          <div className="aam-row">
            <div className="aam-field aam-field--short">
              <label className="aam-label">EMBLEM</label>
              <input
                className="aam-input aam-input--emoji"
                type="text"
                placeholder="👾"
                value={emoji}
                onChange={e => setEmoji(e.target.value)}
                maxLength={4}
              />
            </div>

            <div className="aam-field aam-field--grow">
              <label className="aam-label">MODEL</label>
              {availableModels && availableModels.length > 0 ? (
                <select
                  className="aam-select"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                >
                  {availableModels.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="aam-input"
                  type="text"
                  placeholder="e.g. claude-sonnet-4"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  maxLength={64}
                />
              )}
            </div>
          </div>

          {/* Floor type */}
          <div className="aam-field">
            <label className="aam-label">FLOOR MATERIAL</label>
            <div className="aam-floor-opts">
              {FLOOR_OPTIONS.map(f => (
                <button
                  key={f.value}
                  type="button"
                  className={`aam-floor-btn${floor === f.value ? ' aam-floor-btn--active' : ''}`}
                  onClick={() => setFloor(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div className="aam-field">
            <label className="aam-label">CHAMBER COLOR</label>
            <div className="aam-colors">
              {ROOM_COLOR_PRESETS.map((c, i) => (
                <button
                  key={c.label}
                  type="button"
                  title={c.label}
                  className={`aam-color-swatch${colorIdx === i ? ' aam-color-swatch--active' : ''}`}
                  style={{ background: c.hex }}
                  onClick={() => setColorIdx(i)}
                />
              ))}
            </div>
          </div>

          {/* Error */}
          {error && <div className="aam-error">⚠ {error}</div>}

          {/* Submit */}
          <div className="aam-actions">
            <button type="button" className="aam-btn aam-btn--cancel" onClick={onClose}>
              CANCEL
            </button>
            <button type="submit" className="aam-btn aam-btn--create">
              ⚡ RECRUIT MINION
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
