// GameBoard.jsx
// Core gameplay component for RED ZONE.
// Manages tile spawning, movement, collision/tap detection, scoring, and difficulty scaling.

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================
// CONSTANTS
// ============================================================
const COLUMNS        = 4;      // Number of columns in the game grid
const TILE_HEIGHT    = 80;     // px height of each tile
const TILE_GAP       = 6;      // px gap between tiles in a row
const TILE_MARGIN    = 4;      // px horizontal margin inside board

// Speed configs per level (px per animation frame ~60fps)
const SPEED_CONFIG = [
  { level: 1, speed: 2.0,  label: 'LEVEL 1',  spawnInterval: 1400, labelClass: '' },
  { level: 2, speed: 3.2,  label: 'LEVEL 2',  spawnInterval: 1150, labelClass: '' },
  { level: 3, speed: 4.8,  label: 'LEVEL 3',  spawnInterval: 950,  labelClass: 'fast' },
  { level: 4, speed: 6.5,  label: 'LEVEL 4',  spawnInterval: 780,  labelClass: 'danger' },
];

// How many points trigger difficulty jump (not used here — time-based every 10s)
const COMBO_THRESHOLDS = [5, 10, 15, 20, 25]; // streak milestones for visual badges

let tileIdCounter = 0;
function nextId() { return ++tileIdCounter; }

/**
 * Generate a row of tiles.
 * Each row has 1–3 safe tiles and optionally 1 red tile.
 * @param {number} level - current game level (1–4)
 * @returns {Array} array of tile objects
 */
function generateRow(level) {
  const cols = [0, 1, 2, 3]; // column indices

  // Shuffle column indices
  for (let i = cols.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cols[i], cols[j]] = [cols[j], cols[i]];
  }

  // Number of safe tiles: 1–3 depending on level
  const maxSafe  = level >= 3 ? 2 : 3;
  const safeCount = 1 + Math.floor(Math.random() * maxSafe);

  // Higher levels more likely to include a red tile
  const redChance = 0.3 + (level - 1) * 0.1; // 0.3 / 0.4 / 0.5 / 0.6
  const includeRed = Math.random() < redChance;

  const tiles = [];

  // Assign safe tiles to first safeCount shuffled columns
  for (let i = 0; i < safeCount && i < cols.length; i++) {
    tiles.push({
      id:     nextId(),
      col:    cols[i],
      type:   'safe',
      y:      -TILE_HEIGHT,
      state:  'alive', // 'alive' | 'tapped' | 'missed'
    });
  }

  // Optionally add one red tile in a remaining column
  if (includeRed && cols.length > safeCount) {
    tiles.push({
      id:   nextId(),
      col:  cols[safeCount],
      type: 'red',
      y:    -TILE_HEIGHT,
      state: 'alive',
    });
  }

  return tiles;
}

// ============================================================
// SOUND UTILITIES (Web Audio API — no assets required)
// ============================================================
function createAudioCtx() {
  try {
    return new (window.AudioContext || window.webkitAudioContext)();
  } catch { return null; }
}

let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) audioCtx = createAudioCtx();
  return audioCtx;
}

function playTone({ frequency = 440, type = 'sine', duration = 0.08, gain = 0.18, ramp = true } = {}) {
  const ctx = ensureAudio();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    g.gain.setValueAtTime(gain, ctx.currentTime);
    if (ramp) g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

function playSafeTap(combo = 1) {
  const base = 600 + Math.min(combo - 1, 8) * 50;
  playTone({ frequency: base, type: 'sine', duration: 0.1, gain: 0.15 });
  setTimeout(() => playTone({ frequency: base * 1.5, type: 'triangle', duration: 0.08, gain: 0.08 }), 40);
}

function playRedHit() {
  playTone({ frequency: 140, type: 'sawtooth', duration: 0.4, gain: 0.25 });
  setTimeout(() => playTone({ frequency: 100, type: 'square', duration: 0.3, gain: 0.15 }), 80);
}

function playMissed() {
  playTone({ frequency: 220, type: 'square', duration: 0.2, gain: 0.1 });
}

function playCountdown() {
  playTone({ frequency: 440, type: 'sine', duration: 0.12, gain: 0.2 });
}

function playCountdownGo() {
  playTone({ frequency: 880, type: 'sine', duration: 0.2, gain: 0.3 });
  setTimeout(() => playTone({ frequency: 1100, type: 'sine', duration: 0.15, gain: 0.2 }), 100);
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

/** Individual tile rendered absolutely within the game board */
function Tile({ tile, boardWidth, onTap }) {
  const colWidth  = boardWidth / COLUMNS;
  const tileWidth = colWidth - TILE_MARGIN * 2 - TILE_GAP / 2;
  const x = tile.col * colWidth + TILE_MARGIN;

  return (
    <div
      className={`tile ${tile.type} ${tile.state === 'tapped' ? 'tapped' : ''}`}
      style={{
        left:   x,
        top:    tile.y,
        width:  tileWidth,
        height: TILE_HEIGHT - TILE_GAP,
      }}
      onPointerDown={(e) => { e.preventDefault(); onTap(tile); }}
      role="button"
      aria-label={tile.type === 'red' ? 'Danger tile — do not tap' : 'Safe tile — tap to score'}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onTap(tile); }}
    />
  );
}

/** Score pop-up that floats upward after a tap */
function ScorePop({ pop }) {
  return (
    <div
      className="score-pop"
      style={{ left: pop.x, top: pop.y, color: pop.color, fontSize: pop.size }}
    >
      {pop.text}
    </div>
  );
}

/** Expanding ring on tap */
function TapRing({ ring }) {
  return (
    <div
      className="tap-ring"
      style={{
        left: ring.x - 10,
        top:  ring.y - 10,
        border: `2px solid ${ring.color}`,
        background: 'transparent',
      }}
    />
  );
}

// ============================================================
// MAIN GAMEBOARD COMPONENT
// ============================================================

/**
 * GameBoard
 * @param {number}   highScore   - current high score from localStorage
 * @param {function} onGameOver  - called with { score, highScore, level, maxCombo } on loss
 */
export default function GameBoard({ highScore, onGameOver }) {
  const boardRef       = useRef(null);
  const tilesRef       = useRef([]);        // live tile data (mutable, drives RAF)
  const animFrameRef   = useRef(null);
  const spawnTimerRef  = useRef(null);
  const speedTimerRef  = useRef(null);
  const gameActiveRef  = useRef(true);      // false → stop the loop
  const comboRef       = useRef(0);
  const scoreRef       = useRef(0);

  // React state — updated periodically to re-render HUD / score pops
  const [score,      setScore]      = useState(0);
  const [level,      setLevel]      = useState(1);
  const [combo,      setCombo]      = useState(0);
  const [maxCombo,   setMaxCombo]   = useState(0);
  const [scorePops,  setScorePops]  = useState([]);
  const [tapRings,   setTapRings]   = useState([]);
  const [tiles,      setTilesState] = useState([]);
  const [dangerFlash,setDangerFlash]= useState(false);
  const [boardWidth, setBoardWidth] = useState(0);

  const levelRef         = useRef(1);
  const highScoreRef     = useRef(highScore);
  const currentHSRef     = useRef(highScore);

  // Keep refs in sync
  useEffect(() => { highScoreRef.current = highScore; }, [highScore]);

  // ---- Measure board width after mount ----
  useEffect(() => {
    if (!boardRef.current) return;
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        setBoardWidth(entry.contentRect.width);
      }
    });
    obs.observe(boardRef.current);
    setBoardWidth(boardRef.current.clientWidth);
    return () => obs.disconnect();
  }, []);

  // ---- Game Over handler ----
  const triggerGameOver = useCallback((reason) => {
    if (!gameActiveRef.current) return;
    gameActiveRef.current = false;

    // Stop loops
    cancelAnimationFrame(animFrameRef.current);
    clearInterval(spawnTimerRef.current);
    clearInterval(speedTimerRef.current);

    // Flash red danger overlay
    if (reason === 'red') {
      setDangerFlash(true);
      playRedHit();
    } else {
      playMissed();
    }

    const finalScore = scoreRef.current;
    const newHS = Math.max(finalScore, highScoreRef.current);
    currentHSRef.current = newHS;
    if (newHS > highScoreRef.current) {
      localStorage.setItem('redzone_highscore', String(newHS));
    }

    setTimeout(() => {
      onGameOver({
        score:    finalScore,
        highScore: newHS,
        level:    levelRef.current,
        maxCombo: comboRef.current,
      });
    }, reason === 'red' ? 500 : 200);
  }, [onGameOver]);

  // ---- Tile tap handler ----
  const handleTileTap = useCallback((tile, boardRect) => {
    if (!gameActiveRef.current) return;
    if (tile.state !== 'alive') return;

    // Get board position for visual effects
    const rect = boardRef.current?.getBoundingClientRect();
    const colWidth = (rect?.width || 320) / COLUMNS;
    const cx = tile.col * colWidth + colWidth / 2;
    const cy = tile.y + (TILE_HEIGHT - TILE_GAP) / 2;

    if (tile.type === 'red') {
      tile.state = 'tapped';
      setTilesState([...tilesRef.current]);
      triggerGameOver('red');
      return;
    }

    // Safe tile tapped ✓
    tile.state = 'tapped';

    // Update score & combo
    const newCombo  = comboRef.current + 1;
    comboRef.current = newCombo;
    const newScore  = scoreRef.current + 1;
    scoreRef.current = newScore;

    if (newCombo > (comboRef.maxPeak || 0)) {
      comboRef.maxPeak = newCombo;
      setMaxCombo(newCombo);
    }

    setScore(newScore);
    setCombo(newCombo);
    setTilesState([...tilesRef.current]);

    // Score pop-up
    const comboBonus = newCombo >= 5 ? ` x${newCombo}` : '';
    const popColor = newCombo >= 10 ? '#fbbf24' : newCombo >= 5 ? '#a855f7' : '#00d4ff';
    const popSize  = newCombo >= 10 ? '22px' : newCombo >= 5 ? '18px' : '15px';
    const popId    = Date.now() + Math.random();
    setScorePops(prev => [...prev, {
      id: popId, x: cx, y: cy,
      text: `+1${comboBonus}`,
      color: popColor, size: popSize,
    }]);
    setTimeout(() => setScorePops(prev => prev.filter(p => p.id !== popId)), 850);

    // Tap ring
    const ringId = Date.now() + Math.random();
    setTapRings(prev => [...prev, { id: ringId, x: cx, y: cy, color: '#00d4ff' }]);
    setTimeout(() => setTapRings(prev => prev.filter(r => r.id !== ringId)), 420);

    playSafeTap(newCombo);
  }, [triggerGameOver]);

  // ---- RAF game loop ----
  const startLoop = useCallback(() => {
    let lastTime = performance.now();

    const loop = (now) => {
      if (!gameActiveRef.current) return;

      const dt      = now - lastTime;
      lastTime      = now;
      const cfg     = SPEED_CONFIG[levelRef.current - 1];
      const pixPerMs = cfg.speed / 16.67; // normalize to ms
      const dy      = pixPerMs * dt;

      let missedSafe = false;
      const boardH   = boardRef.current?.clientHeight || 600;

      tilesRef.current = tilesRef.current.filter(tile => {
        if (tile.state === 'tapped') {
          // Keep briefly for fade animation, then remove
          tile._removeAt = tile._removeAt || (now + 260);
          return now < tile._removeAt;
        }

        tile.y += dy;

        // Check if tile left the bottom
        if (tile.y > boardH) {
          if (tile.type === 'safe') {
            missedSafe = true;
          }
          // Red tiles leaving the screen is fine — no penalty
          return false;
        }

        return true;
      });

      setTilesState([...tilesRef.current]);

      if (missedSafe) {
        comboRef.current = 0;
        setCombo(0);
        triggerGameOver('missed');
        return;
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
  }, [triggerGameOver]);

  // ---- Spawn rows ----
  const scheduleSpawn = useCallback(() => {
    const spawnRow = () => {
      if (!gameActiveRef.current) return;
      const row = generateRow(levelRef.current);
      tilesRef.current = [...tilesRef.current, ...row];
    };

    const cfg = SPEED_CONFIG[levelRef.current - 1];
    clearInterval(spawnTimerRef.current);
    spawnRow(); // immediate first row
    spawnTimerRef.current = setInterval(spawnRow, cfg.spawnInterval);
  }, []);

  // ---- Speed level up every 10 seconds ----
  const scheduleSpeedUp = useCallback(() => {
    speedTimerRef.current = setInterval(() => {
      if (!gameActiveRef.current) return;
      setLevel(prev => {
        const next = Math.min(prev + 1, SPEED_CONFIG.length);
        levelRef.current = next;
        // Restart spawn with new interval
        scheduleSpawn();
        return next;
      });
    }, 10000);
  }, [scheduleSpawn]);

  // ---- Start everything on mount ----
  useEffect(() => {
    gameActiveRef.current = true;
    tilesRef.current = [];
    scoreRef.current = 0;
    comboRef.current = 0;
    comboRef.maxPeak = 0;
    tileIdCounter    = 0;
    levelRef.current = 1;

    scheduleSpawn();
    startLoop();
    scheduleSpeedUp();

    return () => {
      gameActiveRef.current = false;
      cancelAnimationFrame(animFrameRef.current);
      clearInterval(spawnTimerRef.current);
      clearInterval(speedTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Compute combo badge class ----
  const comboBadgeClass = combo >= 25 ? 'x5' : combo >= 15 ? 'x4' : combo >= 10 ? 'x3' : combo >= 5 ? 'x2' : 'x1';

  const cfg = SPEED_CONFIG[level - 1];

  // Active speed dots (1 lit per level)
  const speedDots = Array.from({ length: SPEED_CONFIG.length }, (_, i) => i < level);

  return (
    <div className="game-screen">
      {/* ---- HUD ---- */}
      <header className="hud" role="banner" aria-label="Game HUD">
        <div className="hud__stat">
          <span className="hud__label">Score</span>
          <span className="hud__value score" aria-live="polite" aria-atomic="true">{score}</span>
        </div>

        <div className="hud__center">
          <span className="hud__level-badge">SPEED</span>
          <div className="hud__speed-dots" role="meter" aria-label={`Speed level ${level}`}>
            {speedDots.map((active, i) => (
              <div key={i} className={`speed-dot ${active ? 'active' : ''}`} />
            ))}
          </div>
        </div>

        <div className="hud__stat">
          <span className="hud__label">Best</span>
          <span className="hud__value highscore">{Math.max(score, highScore)}</span>
        </div>
      </header>

      {/* ---- Combo Bar ---- */}
      <div className="combo-bar" aria-live="polite">
        {combo >= 2 && (
          <span className={`combo-badge ${comboBadgeClass}`} key={combo}>
            ×{combo} COMBO
          </span>
        )}
        {combo >= 2 && <span className="combo-label">streak</span>}
        <span className={`speed-indicator ${cfg.labelClass}`} style={{ marginLeft: 'auto' }}>
          {cfg.label}
        </span>
      </div>

      {/* ---- Game Board ---- */}
      <div className="game-board-wrapper" ref={boardRef}>
        <div className="game-board-canvas">
          {/* Tiles */}
          {boardWidth > 0 && tiles.map(tile => (
            <Tile
              key={tile.id}
              tile={tile}
              boardWidth={boardWidth}
              onTap={handleTileTap}
            />
          ))}

          {/* Score pop-ups */}
          {scorePops.map(pop => <ScorePop key={pop.id} pop={pop} />)}

          {/* Tap rings */}
          {tapRings.map(ring => <TapRing key={ring.id} ring={ring} />)}

          {/* Danger flash overlay */}
          {dangerFlash && <div className="danger-flash" />}
        </div>
      </div>
    </div>
  );
}
