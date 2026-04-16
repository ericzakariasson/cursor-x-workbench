export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const LINE_POINTS = [0, 100, 300, 500, 800];
export const PIECE_TYPES = ["I", "J", "L", "O", "S", "T", "Z"];

export const PIECES = {
  I: {
    color: "#36c5f0",
    matrix: [[1, 1, 1, 1]]
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

export function createEmptyBoard() {
  return Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(null));
}

export function cloneBoard(board) {
  return board.map((row) => [...row]);
}

export function rotateMatrixClockwise(matrix) {
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

function randomPieceType(randomFn = Math.random) {
  return PIECE_TYPES[Math.floor(randomFn() * PIECE_TYPES.length)];
}

export function createPiece(type = randomPieceType()) {
  const matrix = PIECES[type].matrix.map((row) => [...row]);
  const col = Math.floor((BOARD_WIDTH - matrix[0].length) / 2);
  return {
    type,
    matrix,
    row: -1,
    col
  };
}

export function canPlace(board, piece, row = piece.row, col = piece.col, matrix = piece.matrix) {
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

export function lockPiece(board, piece) {
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

export function clearCompletedLines(board) {
  const remainingRows = [];
  let linesCleared = 0;

  for (const row of board) {
    const isFull = row.every((cell) => cell !== null);
    if (isFull) {
      linesCleared += 1;
      continue;
    }
    remainingRows.push([...row]);
  }

  while (remainingRows.length < BOARD_HEIGHT) {
    remainingRows.unshift(Array(BOARD_WIDTH).fill(null));
  }

  return { board: remainingRows, linesCleared };
}

export function getDropDelay(level) {
  return Math.max(120, 700 - (level - 1) * 55);
}

export function mergeBoardAndPiece(board, piece) {
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

export function buildInitialState() {
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

export function withUpdatedPiece(state, nextPiece) {
  if (!canPlace(state.board, nextPiece, nextPiece.row, nextPiece.col, nextPiece.matrix)) {
    return { ...state, running: false, gameOver: true };
  }

  return { ...state, current: nextPiece };
}

export function spawnNextPiece(state) {
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

export function settleCurrentPiece(state) {
  const pieceOverflowsTop = state.current.matrix.some((row, y) =>
    row.some((cell, x) => cell && state.current.row + y < 0)
  );
  if (pieceOverflowsTop) {
    return { ...state, running: false, gameOver: true };
  }

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

export function tryMove(state, deltaRow, deltaCol) {
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

export function tryRotate(state) {
  const rotatedMatrix = rotateMatrixClockwise(state.current.matrix);
  const rotated = { ...state.current, matrix: rotatedMatrix };

  if (canPlace(state.board, rotated)) {
    return { ...state, current: rotated };
  }

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

export function hardDrop(state) {
  let droppedPiece = { ...state.current };
  while (canPlace(state.board, droppedPiece, droppedPiece.row + 1, droppedPiece.col, droppedPiece.matrix)) {
    droppedPiece = { ...droppedPiece, row: droppedPiece.row + 1 };
  }

  return settleCurrentPiece({
    ...state,
    current: droppedPiece
  });
}

export function tick(state) {
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
