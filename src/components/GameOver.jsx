// GameOver.jsx
// Game Over screen — shows final stats and restart/menu buttons.

import React, { useEffect, useState } from 'react';

/**
 * GameOver Component
 * @param {number}   score     - final score
 * @param {number}   highScore - all-time high score
 * @param {number}   level     - level reached
 * @param {number}   maxCombo  - highest combo achieved in this run
 * @param {function} onRestart - callback to start a new game
 * @param {function} onMenu    - callback to return to start screen
 */
export default function GameOver({ score, highScore, level, maxCombo, onRestart, onMenu }) {
  const [isNewBest, setIsNewBest] = useState(false);

  useEffect(() => {
    setIsNewBest(score >= highScore && score > 0);
  }, [score, highScore]);

  return (
    <div className="gameover-screen" role="main" aria-label="Game Over">
      {/* Icon */}
      <div className="gameover-screen__icon" aria-hidden="true">💥</div>

      {/* Title */}
      <h1 className="gameover-screen__title">GAME OVER</h1>
      <p className="gameover-screen__subtitle">
        {score === 0
          ? 'Tapped a red tile immediately!'
          : score < 5
          ? 'Keep practicing!'
          : score < 15
          ? 'Getting better!'
          : score < 30
          ? 'Nice run!'
          : 'Impressive reflexes!'}
      </p>

      {/* New Best badge */}
      {isNewBest && (
        <div className="new-best-badge" role="alert" aria-live="polite">
          ⭐ NEW BEST
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid" role="region" aria-label="Your results">
        <div className="stat-card score">
          <span className="stat-card__label">Final Score</span>
          <span className="stat-card__value" aria-label={`Score: ${score}`}>{score}</span>
          <span className="stat-card__sub">points earned</span>
        </div>

        <div className="stat-card best">
          <span className="stat-card__label">High Score</span>
          <span className="stat-card__value" aria-label={`Best score: ${highScore}`}>{highScore}</span>
          <span className="stat-card__sub">{isNewBest ? '🎉 just set!' : 'all time best'}</span>
        </div>

        <div className="stat-card level">
          <span className="stat-card__label">Level Reached</span>
          <span className="stat-card__value" aria-label={`Level ${level}`}>{level}</span>
          <span className="stat-card__sub">
            {level === 1 ? 'slow speed'
              : level === 2 ? 'medium speed'
              : level === 3 ? 'fast speed'
              : 'max speed!'}
          </span>
        </div>

        <div className="stat-card combo">
          <span className="stat-card__label">Best Combo</span>
          <span className="stat-card__value" aria-label={`Best combo: ${maxCombo}`}>×{maxCombo}</span>
          <span className="stat-card__sub">
            {maxCombo >= 20 ? 'godlike! 🔥'
              : maxCombo >= 10 ? 'on fire!'
              : maxCombo >= 5  ? 'combo king'
              : 'keep streaking'}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="gameover-buttons">
        <button
          id="restart-btn"
          className="btn-restart"
          onClick={onRestart}
          aria-label="Play again"
        >
          ↺ PLAY AGAIN
        </button>
        <button
          id="menu-btn"
          className="btn-menu"
          onClick={onMenu}
          aria-label="Return to main menu"
        >
          ← MAIN MENU
        </button>
      </div>
    </div>
  );
}
