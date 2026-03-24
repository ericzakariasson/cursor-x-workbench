"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

const BOARD_COLS = 10;
const BOARD_ROWS = 20;
const LINE_CLEAR_POINTS = {
  0: 0,
  1: 40,
  2: 100,
  3: 300,
  4: 1200
};

const TETROMINOES = [
  {
    name: "I",
    color: "#47d7ff",
    matrix: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ]
  },
  {
    name: "O",
    color: "#ffe35a",
    matrix: [
      [1, 1],
      [1, 1]
    ]
  },
  {
    name: "T",
    color: "#bf7cff",
    matrix: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ]
  },
  {
    name: "S",
    color: "#71ee85",
    matrix: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ]
  },
  {
    name: "Z",
    color: "#ff6f7e",
    matrix: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ]
  },
  {
    name: "J",
    color: "#5c8dff",
    matrix: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ]
  },
  {
    name: "L",
    color: "#ffaf5a",
    matrix: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ]
  }
];

function createEmptyBoard() {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
}

function cloneMatrix(matrix) {
  return matrix.map((row) => [...row]);
}

function getRandomTemplate() {
  return TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];
}

function createActivePiece(template) {
  const matrix = cloneMatrix(template.matrix);
  const width = matrix[0].length;
  return {
    name: template.name,
    color: template.color,
    matrix,
    x: Math.floor((BOARD_COLS - width) / 2),
    y: 0
  };
}

function rotateClockwise(matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  return Array.from({ length: cols }, (_, rowIndex) =>
    Array.from(
      { length: rows },
      (_, colIndex) => matrix[rows - 1 - colIndex][rowIndex]
    )
  );
}

function hasCollision(board, piece, x = piece.x, y = piece.y, matrix = piece.matrix) {
  for (let row = 0; row < matrix.length; row += 1) {
    for (let col = 0; col < matrix[row].length; col += 1) {
      if (!matrix[row][col]) continue;

      const boardX = x + col;
      const boardY = y + row;

      if (boardX < 0 || boardX >= BOARD_COLS || boardY >= BOARD_ROWS) {
        return true;
      }

      if (boardY >= 0 && board[boardY][boardX]) {
        return true;
      }
    }
  }

  return false;
}

function mergePiece(board, piece) {
  const next = board.map((row) => [...row]);

  for (let row = 0; row < piece.matrix.length; row += 1) {
    for (let col = 0; col < piece.matrix[row].length; col += 1) {
      if (!piece.matrix[row][col]) continue;
      const boardY = piece.y + row;
      const boardX = piece.x + col;

      if (boardY >= 0 && boardY < BOARD_ROWS && boardX >= 0 && boardX < BOARD_COLS) {
        next[boardY][boardX] = piece.color;
      }
    }
  }

  return next;
}

function clearCompletedLines(board) {
  const remainingRows = board.filter((row) => row.some((cell) => cell === null));
  const cleared = BOARD_ROWS - remainingRows.length;

  while (remainingRows.length < BOARD_ROWS) {
    remainingRows.unshift(Array(BOARD_COLS).fill(null));
  }

  return { board: remainingRows, cleared };
}

function calculateLevel(linesCleared) {
  return Math.floor(linesCleared / 10) + 1;
}

function getDropInterval(level) {
  return Math.max(90, 700 - (level - 1) * 55);
}

function createPreviewMatrix(template) {
  const preview = Array.from({ length: 4 }, () => Array(4).fill(null));
  const shape = template.matrix;
  const offsetY = Math.floor((4 - shape.length) / 2);
  const offsetX = Math.floor((4 - shape[0].length) / 2);

  for (let row = 0; row < shape.length; row += 1) {
    for (let col = 0; col < shape[row].length; col += 1) {
      if (shape[row][col]) {
        preview[row + offsetY][col + offsetX] = template.color;
      }
    }
  }

  return preview;
}

function createGameState() {
  const currentTemplate = getRandomTemplate();
  const nextTemplate = getRandomTemplate();

  return {
    board: createEmptyBoard(),
    piece: createActivePiece(currentTemplate),
    nextPiece: nextTemplate,
    score: 0,
    lines: 0,
    level: 1,
    status: "playing"
  };
}

const INITIAL_STATE = {
  board: createEmptyBoard(),
  piece: null,
  nextPiece: getRandomTemplate(),
  score: 0,
  lines: 0,
  level: 1,
  status: "idle"
};

function lockAndSpawn(state, lockedPiece, extraScore = 0) {
  const mergedBoard = mergePiece(state.board, lockedPiece);
  const { board: nextBoard, cleared } = clearCompletedLines(mergedBoard);
  const lines = state.lines + cleared;
  const level = calculateLevel(lines);
  const scoreGain = (LINE_CLEAR_POINTS[cleared] || 0) * state.level + extraScore;

  const activePiece = createActivePiece(state.nextPiece);
  const nextTemplate = getRandomTemplate();
  const collidesOnSpawn = hasCollision(nextBoard, activePiece);

  return {
    board: nextBoard,
    piece: collidesOnSpawn ? null : activePiece,
    nextPiece: nextTemplate,
    score: state.score + scoreGain,
    lines,
    level,
    status: collidesOnSpawn ? "over" : "playing"
  };
}

function reducer(state, action) {
  if (action.type === "START") {
    return createGameState();
  }

  if (action.type === "TOGGLE_PAUSE") {
    if (state.status === "playing") return { ...state, status: "paused" };
    if (state.status === "paused") return { ...state, status: "playing" };
    return state;
  }

  if (state.status !== "playing" || !state.piece) {
    return state;
  }

  if (action.type === "MOVE_LEFT" || action.type === "MOVE_RIGHT") {
    const deltaX = action.type === "MOVE_LEFT" ? -1 : 1;
    const candidate = { ...state.piece, x: state.piece.x + deltaX };
    if (hasCollision(state.board, candidate)) return state;
    return { ...state, piece: candidate };
  }

  if (action.type === "ROTATE") {
    const rotated = rotateClockwise(state.piece.matrix);
    const kicks = [0, -1, 1, -2, 2];

    for (const kick of kicks) {
      const candidate = { ...state.piece, x: state.piece.x + kick, matrix: rotated };
      if (!hasCollision(state.board, candidate)) {
        return { ...state, piece: candidate };
      }
    }

    return state;
  }

  if (action.type === "HARD_DROP") {
    let dropDistance = 0;
    let nextY = state.piece.y;

    while (!hasCollision(state.board, state.piece, state.piece.x, nextY + 1)) {
      nextY += 1;
      dropDistance += 1;
    }

    const droppedPiece = { ...state.piece, y: nextY };
    return lockAndSpawn(state, droppedPiece, dropDistance * 2);
  }

  if (action.type === "SOFT_DROP" || action.type === "TICK") {
    const candidate = { ...state.piece, y: state.piece.y + 1 };

    if (!hasCollision(state.board, candidate)) {
      return {
        ...state,
        piece: candidate,
        score: action.type === "SOFT_DROP" ? state.score + 1 : state.score
      };
    }

    return lockAndSpawn(state, state.piece);
  }

  return state;
}

function getDisplayBoard(board, piece) {
  if (!piece) return board;

  const withPiece = board.map((row) => [...row]);

  for (let row = 0; row < piece.matrix.length; row += 1) {
    for (let col = 0; col < piece.matrix[row].length; col += 1) {
      if (!piece.matrix[row][col]) continue;
      const boardY = piece.y + row;
      const boardX = piece.x + col;
      if (boardY >= 0 && boardY < BOARD_ROWS && boardX >= 0 && boardX < BOARD_COLS) {
        withPiece[boardY][boardX] = piece.color;
      }
    }
  }

  return withPiece;
}

export default function RetroTetris() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const holdTimersRef = useRef({});

  const dropInterval = useMemo(() => getDropInterval(state.level), [state.level]);
  const displayBoard = useMemo(
    () => getDisplayBoard(state.board, state.piece),
    [state.board, state.piece]
  );
  const nextPreview = useMemo(() => createPreviewMatrix(state.nextPiece), [state.nextPiece]);

  const clearHold = useCallback((key) => {
    const hold = holdTimersRef.current[key];
    if (!hold) return;
    window.clearTimeout(hold.timeoutId);
    if (hold.intervalId !== null) {
      window.clearInterval(hold.intervalId);
    }
    delete holdTimersRef.current[key];
  }, []);

  const clearAllHolds = useCallback(() => {
    const keys = Object.keys(holdTimersRef.current);
    for (const key of keys) {
      clearHold(key);
    }
  }, [clearHold]);

  useEffect(() => {
    if (state.status !== "playing") {
      clearAllHolds();
    }
  }, [state.status, clearAllHolds]);

  useEffect(
    () => () => {
      clearAllHolds();
    },
    [clearAllHolds]
  );

  const createRepeatHandlers = useCallback(
    (key, actionType) => {
      const onPointerDown = (event) => {
        event.preventDefault();
        if (state.status !== "playing") return;

        dispatch({ type: actionType });

        if (holdTimersRef.current[key]) return;

        const timeoutId = window.setTimeout(() => {
          const intervalId = window.setInterval(() => {
            dispatch({ type: actionType });
          }, 80);

          if (holdTimersRef.current[key]) {
            holdTimersRef.current[key].intervalId = intervalId;
          } else {
            window.clearInterval(intervalId);
          }
        }, 170);

        holdTimersRef.current[key] = { timeoutId, intervalId: null };
      };

      const onPointerUp = () => clearHold(key);

      return {
        onPointerDown,
        onPointerUp,
        onPointerCancel: onPointerUp,
        onPointerLeave: onPointerUp
      };
    },
    [state.status, clearHold]
  );

  const leftHold = createRepeatHandlers("left", "MOVE_LEFT");
  const rightHold = createRepeatHandlers("right", "MOVE_RIGHT");
  const downHold = createRepeatHandlers("down", "SOFT_DROP");

  useEffect(() => {
    if (state.status !== "playing") return undefined;

    const intervalId = window.setInterval(() => {
      dispatch({ type: "TICK" });
    }, dropInterval);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [state.status, dropInterval]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const key = event.key;
      const lower = key.toLowerCase();

      if ((state.status === "idle" || state.status === "over") && (key === "Enter" || key === " ")) {
        event.preventDefault();
        dispatch({ type: "START" });
        return;
      }

      if (lower === "p") {
        event.preventDefault();
        dispatch({ type: "TOGGLE_PAUSE" });
        return;
      }

      if (state.status !== "playing") return;

      if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " ", "x", "X"].includes(key)) {
        event.preventDefault();
      }

      if (key === "ArrowLeft") dispatch({ type: "MOVE_LEFT" });
      else if (key === "ArrowRight") dispatch({ type: "MOVE_RIGHT" });
      else if (key === "ArrowDown") dispatch({ type: "SOFT_DROP" });
      else if (key === "ArrowUp" || lower === "x") dispatch({ type: "ROTATE" });
      else if (key === " ") dispatch({ type: "HARD_DROP" });
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.status]);

  const statusText =
    state.status === "over"
      ? "Game over"
      : state.status === "paused"
        ? "Paused"
        : state.status === "idle"
          ? "Ready"
          : "Playing";

  const actionLabel = state.status === "idle" ? "Start game" : "Restart";

  return (
    <section className="tetris">
      <header className="tetris__header">
        <h1 className="tetris__title">Retro Tetris</h1>
        <p className="tetris__subtitle">Mobile-optimized block stacking.</p>
      </header>

      <div className="tetris__game">
        <aside className="tetris__panel">
          <div className="tetris__stat">
            <span className="tetris__label">Score</span>
            <strong className="tetris__value">{state.score}</strong>
          </div>
          <div className="tetris__stat">
            <span className="tetris__label">Lines</span>
            <strong className="tetris__value">{state.lines}</strong>
          </div>
          <div className="tetris__stat">
            <span className="tetris__label">Level</span>
            <strong className="tetris__value">{state.level}</strong>
          </div>

          <div className="tetris__stat">
            <span className="tetris__label">Next</span>
            <div className="tetris__next-grid" aria-hidden>
              {nextPreview.map((row, rowIndex) =>
                row.map((cell, colIndex) => (
                  <span
                    key={`${rowIndex}-${colIndex}`}
                    className={`tetris__next-cell${cell ? " is-filled" : ""}`}
                    style={cell ? { "--cell-color": cell } : undefined}
                  />
                ))
              )}
            </div>
          </div>

          <div className="tetris__status" aria-live="polite">
            {statusText}
          </div>

          <div className="tetris__actions">
            <button type="button" className="tetris__button" onClick={() => dispatch({ type: "START" })}>
              {actionLabel}
            </button>
            <button
              type="button"
              className="tetris__button tetris__button--alt"
              onClick={() => dispatch({ type: "TOGGLE_PAUSE" })}
              disabled={state.status === "idle" || state.status === "over"}
            >
              {state.status === "paused" ? "Resume" : "Pause"}
            </button>
          </div>
        </aside>

        <div className="tetris__board-wrap">
          <div className="tetris__board" role="img" aria-label="Tetris playfield, 10 columns and 20 rows">
            {displayBoard.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <span
                  key={`${rowIndex}-${colIndex}`}
                  className={`tetris__cell${cell ? " is-filled" : ""}`}
                  style={cell ? { "--cell-color": cell } : undefined}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <div className="tetris__controls" aria-label="Touch controls">
        <button type="button" className="tetris__control" aria-label="Move left" {...leftHold}>
          Left
        </button>
        <button
          type="button"
          className="tetris__control"
          aria-label="Rotate piece"
          onPointerDown={(event) => {
            event.preventDefault();
            if (state.status === "playing") {
              dispatch({ type: "ROTATE" });
            }
          }}
        >
          Rotate
        </button>
        <button type="button" className="tetris__control" aria-label="Move right" {...rightHold}>
          Right
        </button>
      </div>

      <div className="tetris__controls tetris__controls--secondary" aria-label="Drop controls">
        <button type="button" className="tetris__control" aria-label="Soft drop" {...downHold}>
          Soft drop
        </button>
        <button
          type="button"
          className="tetris__control tetris__control--hard"
          aria-label="Hard drop"
          onPointerDown={(event) => {
            event.preventDefault();
            if (state.status === "playing") {
              dispatch({ type: "HARD_DROP" });
            }
          }}
        >
          Hard drop
        </button>
      </div>

      <p className="tetris__hint">
        Desktop keys: arrows to move, up or X to rotate, space for hard drop, P to pause.
      </p>
    </section>
  );
}
