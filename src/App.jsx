// App.jsx
// Root component for RED ZONE.
// Manages global game state machine: start → countdown → playing → game over
// Handles high score persistence via localStorage.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import StartScreen from './components/StartScreen.jsx';
import GameBoard   from './components/GameBoard.jsx';
import GameOver    from './components/GameOver.jsx';

// ---- Game state enum ----
const STATES = {
  START:     'START',
  COUNTDOWN: 'COUNTDOWN',
  PLAYING:   'PLAYING',
  GAMEOVER:  'GAMEOVER',
};

const LS_KEY = 'redzone_highscore';

/**
 * Load high score from localStorage.
 * Returns 0 if no previous score exists.
 */
function loadHighScore() {
  try {
    const val = localStorage.getItem(LS_KEY);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Save high score to localStorage.
 * @param {number} score
 */
function saveHighScore(score) {
  try { localStorage.setItem(LS_KEY, String(score)); } catch {}
}

// ============================================================
// COUNTDOWN OVERLAY
// Displays 3 → 2 → 1 → GO! before gameplay starts
// ============================================================
function CountdownOverlay({ onComplete }) {
  const [count, setCount] = useState(3);
  const [showGo, setShowGo] = useState(false);

  useEffect(() => {
    // Play first tick immediately
    playCountdownTick();

    const tick = (remaining) => {
      if (remaining > 0) {
        setTimeout(() => {
          setCount(remaining);
          playCountdownTick();
          tick(remaining - 1);
        }, 1000);
      } else {
        // Show GO!
        setTimeout(() => {
          setShowGo(true);
          playGoSound();
          setTimeout(onComplete, 500);
        }, 1000);
      }
    };

    tick(2); // counts 3 → 2 → 1 → GO
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="countdown-overlay" role="status" aria-live="assertive" aria-label="Countdown">
      {showGo
        ? <span className="countdown-go">GO!</span>
        : <span className="countdown-number">{count}</span>
      }
    </div>
  );
}

// Simple tone helpers (copied here so CountdownOverlay is self-contained)
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) {
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  }
  return _audioCtx;
}
function playBeep(freq = 440, dur = 0.12, gain = 0.2, type = 'sine') {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = type; osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(); osc.stop(ctx.currentTime + dur);
  } catch {}
}
function playCountdownTick() { playBeep(660, 0.1, 0.18, 'sine'); }
function playGoSound() {
  playBeep(880, 0.15, 0.28, 'sine');
  setTimeout(() => playBeep(1100, 0.12, 0.2, 'sine'), 80);
}

// ============================================================
// APP ROOT
// ============================================================
export default function App() {
  const [gameState, setGameState]   = useState(STATES.START);
  const [highScore, setHighScore]   = useState(loadHighScore);
  const [gameResult, setGameResult] = useState(null); // { score, highScore, level, maxCombo }
  const [gameKey, setGameKey]       = useState(0);    // increment to fully remount GameBoard

  // ---- Handlers ----

  /** User clicked Start on the start screen — begin countdown */
  const handleStartGame = useCallback(() => {
    setGameState(STATES.COUNTDOWN);
  }, []);

  /** Countdown finished — launch gameplay */
  const handleCountdownComplete = useCallback(() => {
    setGameState(STATES.PLAYING);
  }, []);

  /** Game loop detected a loss — receive results */
  const handleGameOver = useCallback((result) => {
    // Persist any new high score
    if (result.highScore > highScore) {
      saveHighScore(result.highScore);
      setHighScore(result.highScore);
    }
    setGameResult(result);
    setGameState(STATES.GAMEOVER);
  }, [highScore]);

  /** User wants to play again — restart without returning to start screen */
  const handleRestart = useCallback(() => {
    setGameResult(null);
    setGameKey(k => k + 1);  // remount GameBoard cleanly
    setGameState(STATES.COUNTDOWN);
  }, []);

  /** User wants to return to the main start screen */
  const handleMenu = useCallback(() => {
    setGameResult(null);
    setGameKey(k => k + 1);
    setGameState(STATES.START);
  }, []);

  // ---- Render ----
  return (
    <div className="app-shell" role="application" aria-label="RED ZONE Game">
      {/* START SCREEN */}
      {gameState === STATES.START && (
        <StartScreen onStart={handleStartGame} />
      )}

      {/* GAME SCREEN + Countdown overlay on top */}
      {(gameState === STATES.COUNTDOWN || gameState === STATES.PLAYING) && (
        <>
          <GameBoard
            key={gameKey}
            highScore={highScore}
            onGameOver={handleGameOver}
          />
          {gameState === STATES.COUNTDOWN && (
            <CountdownOverlay onComplete={handleCountdownComplete} />
          )}
        </>
      )}

      {/* GAME OVER SCREEN */}
      {gameState === STATES.GAMEOVER && gameResult && (
        <GameOver
          score={gameResult.score}
          highScore={gameResult.highScore}
          level={gameResult.level}
          maxCombo={gameResult.maxCombo}
          onRestart={handleRestart}
          onMenu={handleMenu}
        />
      )}
    </div>
  );
}
