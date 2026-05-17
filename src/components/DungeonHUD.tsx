// ─── DungeonHUD.tsx — Top bar title only ─────────────────────────────────────

export function DungeonHUD() {
  return (
    <header className="dungeon-hud">
      <div className="hud-center-only">
        <span className="hud-dragon">🐉</span>
        <div className="hud-title-block">
          <div className="hud-title">THE OVERLORD'S DUNGEON</div>
          <div className="hud-sub">GRIM — DUNGEON MASTER COMMAND v2</div>
        </div>
        <span className="hud-dragon hud-dragon--flip">🐉</span>
      </div>
      {/* Bottom glow line */}
      <div className="hud-glow-line" />
    </header>
  );
}
