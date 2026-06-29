// StartScreen.jsx
// The main title/intro screen for RED ZONE
// Shows game title, tagline, instructions, tile preview, and start button.

import React from 'react';

/**
 * StartScreen Component
 * @param {function} onStart - callback to begin the countdown & game
 */
export default function StartScreen({ onStart }) {
  return (
    <div className="start-screen" role="main">
      {/* ---- Logo / Title ---- */}
      <div className="start-screen__logo">
        <span className="start-screen__badge">◆ ARCADE ◆</span>
        <h1 className="start-screen__title">RED<br />ZONE</h1>
        <p className="start-screen__tagline">Tap Fast · Avoid Red · Survive</p>
      </div>

      <div className="start-screen__divider" aria-hidden="true" />

      {/* ---- Tile Type Preview ---- */}
      <div className="tile-preview" role="group" aria-label="Tile types">
        <div className="tile-preview__item safe">✓ SAFE</div>
        <div className="tile-preview__item red">✕ DANGER</div>
      </div>

      {/* ---- Instructions ---- */}
      <div className="start-screen__instructions" role="region" aria-label="How to play">
        <h3>How to Play</h3>
        <ul className="instruction-list">
          <li>
            <span className="icon safe">👆</span>
            <span>Tap <strong>safe tiles</strong> (blue) to earn points</span>
          </li>
          <li>
            <span className="icon red">🚫</span>
            <span>Never tap <strong>red tiles</strong> — instant game over</span>
          </li>
          <li>
            <span className="icon speed">⚡</span>
            <span>Speed <strong>increases every 40 sec</strong> — stay sharp</span>
          </li>
          <li>
            <span className="icon safe">⏬</span>
            <span>Don't let safe tiles <strong>escape</strong> the screen</span>
          </li>
        </ul>
      </div>

      {/* ---- Start Button ---- */}
      <button
        id="start-btn"
        className="btn-start"
        onClick={onStart}
        aria-label="Start the game"
      >
        START GAME
      </button>
    </div>
  );
}
