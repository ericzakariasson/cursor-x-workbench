"use client";

import { useEffect, useMemo, useState } from "react";

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const LINE_POINTS = [0, 100, 300, 500, 800];
const PIECE_TYPES = ["I", "J", "L", "O", "S", "T", "Z"];

const PIECES = {
  I: {
    color: "#36c5f0",
    matrix: [
      [1, 1, 1, 1]
    ]
  },
  J: {
    color: "#3f5bd9",
    matrix: [
      [1, 0, 0],
      [1, 1, 1]
    ]
  },
  L: {
    color: "#f28c28",
    matrix: [
      [0, 0, 1],
      [1, 1, 1]
    ]
  },
  O: {
    color: "#f2d64b",
    matrix: [
      [1, 1],
      [1, 1]
    ]
  },
  S: {
    color: "#4cc16f",
    matrix: [
      [0, 1, 1],
      [1, 1, 0]
    ]
  },
  T: {
    color: "#b45de8",
    matrix: [
      [0, 1, 0],
      [1, 1, 1]
    ]
  },
  Z: {
    color: "#ef5b5b",
    matrix: [
      [1, 1, 0],
      [0, 1, 1]
    ]
  }
};

function createEmptyBoard() {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array(BOARD_WIDTH).fill(null)
  );
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function rotateMatrixClockwise(matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      rotated[x][rows - 1 - y] = matrix[y][x];
    }
  }

  return rotated;
}

function createPiece(type = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)]) {
  const matrix = PIECES[type].matrix.map((row) => [...row]);
  const col = Math.floor((BOARD_WIDTH - matrix[0].length) / 2);
  return {
    type,
    matrix,
    row: -1,
    col
  };
}

function canPlace(board, piece, row = piece.row, col = piece.col, matrix = piece.matrix) {
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix[y].length; x += 1) {
      if (!matrix[y][x]) {
        continue;
      }

      const targetRow = row + y;
      const targetCol = col + x;

      if (targetCol < 0 || targetCol >= BOARD_WIDTH || targetRow >= BOARD_HEIGHT) {
        return false;
      }

      if (targetRow >= 0 && board[targetRow][targetCol]) {
        return false;
      }
    }
  }

  return true;
}

function lockPiece(board, piece) {
  const nextBoard = cloneBoard(board);
  const color = PIECES[piece.type].color;

  for (let y = 0; y < piece.matrix.length; y += 1) {
    for (let x = 0; x < piece.matrix[y].length; x += 1) {
      if (!piece.matrix[y][x]) {
        continue;
      }

      const boardRow = piece.row + y;
      const boardCol = piece.col + x;
      if (boardRow >= 0) {
        nextBoard[boardRow][boardCol] = color;
      }
    }
  }

  return nextBoard;
}

function clearCompletedLines(board) {
  const filtered = board.filter((row) => row.some((cell) => !cell) || false);
  const linesCleared = BOARD_HEIGHT - filtered.length;

  while (filtered.length < BOARD_HEIGHT) {
    filtered.unshift(Array(BOARD_WIDTH).fill(null));
  }

  return { board: filtered, linesCleared };
}

function getDropDelay(level) {
  return Math.max(120, 700 - (level - 1) * 55);
}

function mergeBoardAndPiece(board, piece) {
  const display = cloneBoard(board);
  const color = PIECES[piece.type].color;

  for (let y = 0; y < piece.matrix.length; y += 1) {
    for (let x = 0; x < piece.matrix[y].length; x += 1) {
      if (!piece.matrix[y][x]) {
        continue;
      }
      const boardRow = piece.row + y;
      const boardCol = piece.col + x;
      if (boardRow >= 0 && boardRow < BOARD_HEIGHT && boardCol >= 0 && boardCol < BOARD_WIDTH) {
        display[boardRow][boardCol] = color;
      }
    }
  }

  return display;
}

function buildInitialState() {
  return {
    board: createEmptyBoard(),
    current: createPiece(),
    next: createPiece(),
    score: 0,
    lines: 0,
    level: 1,
    running: true,
    gameOver: false
  };
}

function withUpdatedPiece(state, nextPiece) {
  if (!canPlace(state.board, nextPiece, nextPiece.row, nextPiece.col, nextPiece.matrix)) {
    return { ...state, running: false, gameOver: true };
  }

  return { ...state, current: nextPiece };
}

function spawnNextPiece(state) {
  const spawned = {
    ...state.next,
    row: -1,
    col: Math.floor((BOARD_WIDTH - state.next.matrix[0].length) / 2)
  };

  return withUpdatedPiece(
    {
      ...state,
      next: createPiece()
    },
    spawned
  );
}

function settleCurrentPiece(state) {
  const lockedBoard = lockPiece(state.board, state.current);
  const { board: clearedBoard, linesCleared } = clearCompletedLines(lockedBoard);
  const totalLines = state.lines + linesCleared;
  const nextLevel = 1 + Math.floor(totalLines / 10);
  const lineScore = LINE_POINTS[linesCleared] * nextLevel;

  return spawnNextPiece({
    ...state,
    board: clearedBoard,
    lines: totalLines,
    level: nextLevel,
    score: state.score + lineScore
  });
}

function tryMove(state, deltaRow, deltaCol) {
  const movedPiece = {
    ...state.current,
    row: state.current.row + deltaRow,
    col: state.current.col + deltaCol
  };

  if (!canPlace(state.board, movedPiece)) {
    return state;
  }

  return { ...state, current: movedPiece };
}

function tryRotate(state) {
  const rotatedMatrix = rotateMatrixClockwise(state.current.matrix);
  const rotated = { ...state.current, matrix: rotatedMatrix };

  if (canPlace(state.board, rotated)) {
    return { ...state, current: rotated };
  }

  // Small wall-kick attempts for better playability.
  const kicks = [-1, 1, -2, 2];
  for (const offset of kicks) {
    if (canPlace(state.board, rotated, rotated.row, rotated.col + offset, rotatedMatrix)) {
      return {
        ...state,
        current: {
          ...rotated,
          col: rotated.col + offset
        }
      };
    }
  }

  return state;
}

function hardDrop(state) {
  let droppedPiece = { ...state.current };
  while (canPlace(state.board, droppedPiece, droppedPiece.row + 1, droppedPiece.col, droppedPiece.matrix)) {
    droppedPiece = { ...droppedPiece, row: droppedPiece.row + 1 };
  }

  return settleCurrentPiece({
    ...state,
    current: droppedPiece
  });
}

function tick(state) {
  if (!state.running || state.gameOver) {
    return state;
  }

  const moved = {
    ...state.current,
    row: state.current.row + 1
  };

  if (canPlace(state.board, moved)) {
    return { ...state, current: moved };
  }

  return settleCurrentPiece(state);
}

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
