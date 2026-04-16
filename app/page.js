"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildInitialState,
  getDropDelay,
  hardDrop,
  mergeBoardAndPiece,
  tick,
  tryMove,
  tryRotate
} from "./tetris-core";

export default function Home() {
  const [game, setGame] = useState(buildInitialState);

  useEffect(() => {
    if (!game.running || game.gameOver) {
      return undefined;
    }

    const timer = setInterval(() => {
      setGame((previous) => tick(previous));
    }, getDropDelay(game.level));

    return () => clearInterval(timer);
  }, [game.level, game.running, game.gameOver]);

  useEffect(() => {
    function onKeyDown(event) {
      const key = event.key.toLowerCase();

      if (["arrowleft", "arrowright", "arrowdown", "arrowup", " ", "p", "r"].includes(key)) {
        event.preventDefault();
      }

      if (key === "r") {
        setGame(buildInitialState());
        return;
      }

      if (key === "p") {
        setGame((previous) => {
          if (previous.gameOver) {
            return previous;
          }
          return { ...previous, running: !previous.running };
        });
        return;
      }

      setGame((previous) => {
        if (!previous.running || previous.gameOver) {
          return previous;
        }

        switch (key) {
          case "arrowleft":
            return tryMove(previous, 0, -1);
          case "arrowright":
            return tryMove(previous, 0, 1);
          case "arrowdown":
            return tryMove(previous, 1, 0);
          case "arrowup":
            return tryRotate(previous);
          case " ":
            return hardDrop(previous);
          default:
            return previous;
        }
      });
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const displayBoard = useMemo(
    () => mergeBoardAndPiece(game.board, game.current),
    [game.board, game.current]
  );

  return (
    <main className="page tetris-page">
      <section className="card tetris-card">
        <div className="tetris-header">
          <h1>Tetris</h1>
          <p>Arrow keys move, up rotates, space hard-drops, P pauses, R restarts.</p>
        </div>

        <div className="tetris-shell">
          <div className="tetris-board" role="img" aria-label="Tetris game board">
            {displayBoard.map((row, rowIndex) =>
              row.map((cell, columnIndex) => (
                <span
                  key={`${rowIndex}-${columnIndex}`}
                  className="tetris-cell"
                  style={{ backgroundColor: cell ?? "transparent" }}
                />
              ))
            )}
          </div>

          <aside className="tetris-stats" aria-live="polite">
            <p>
              <strong>Score:</strong> {game.score}
            </p>
            <p>
              <strong>Lines:</strong> {game.lines}
            </p>
            <p>
              <strong>Level:</strong> {game.level}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              {game.gameOver ? "Game Over" : game.running ? "Running" : "Paused"}
            </p>
            <button type="button" onClick={() => setGame(buildInitialState())}>
              Restart game
            </button>
          </aside>
        </div>
      </section>
    </main>
  );
}
