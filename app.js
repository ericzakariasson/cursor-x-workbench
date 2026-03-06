const ROWS = 10;
const COLS = 10;
const MINES = 15;

const boardEl = document.getElementById("board");
const mineCounterEl = document.getElementById("mine-counter");
const timerEl = document.getElementById("timer");
const resetBtn = document.getElementById("reset-btn");
const statusTextEl = document.getElementById("status-text");

let board = [];
let gameOver = false;
let hasStarted = false;
let revealedCount = 0;
let flagCount = 0;
let timer = 0;
let timerIntervalId = null;

const neighborOffsets = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

function formatCounter(value) {
  const clamped = Math.max(-99, Math.min(999, value));
  const prefix = clamped < 0 ? "-" : "";
  return `${prefix}${Math.abs(clamped).toString().padStart(3, "0")}`;
}

function inBounds(r, c) {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

function newCell(row, col) {
  return {
    row,
    col,
    mine: false,
    revealed: false,
    flagged: false,
    adjacent: 0,
  };
}

function createBoard() {
  return Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => newCell(r, c))
  );
}

function placeMines(safeRow, safeCol) {
  const forbidden = new Set([`${safeRow},${safeCol}`]);
  let placed = 0;
  while (placed < MINES) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    const key = `${r},${c}`;
    if (forbidden.has(key) || board[r][c].mine) {
      continue;
    }
    board[r][c].mine = true;
    placed += 1;
  }
}

function calculateAdjacency() {
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      if (board[r][c].mine) {
        continue;
      }
      let minesAround = 0;
      for (const [dr, dc] of neighborOffsets) {
        const nr = r + dr;
        const nc = c + dc;
        if (inBounds(nr, nc) && board[nr][nc].mine) {
          minesAround += 1;
        }
      }
      board[r][c].adjacent = minesAround;
    }
  }
}

function startTimer() {
  if (timerIntervalId) {
    return;
  }
  timerIntervalId = setInterval(() => {
    timer += 1;
    timerEl.textContent = formatCounter(timer);
  }, 1000);
}

function stopTimer() {
  if (timerIntervalId) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
}

function updateCounters() {
  mineCounterEl.textContent = formatCounter(MINES - flagCount);
}

function buildGrid() {
  boardEl.innerHTML = "";
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cell";
      btn.dataset.row = String(r);
      btn.dataset.col = String(c);
      btn.setAttribute("aria-label", `Cell ${r + 1}-${c + 1}`);
      btn.addEventListener("click", onReveal);
      btn.addEventListener("contextmenu", onToggleFlag);
      boardEl.appendChild(btn);
    }
  }
}

function getCellElement(row, col) {
  return boardEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
}

function renderCell(cell) {
  const el = getCellElement(cell.row, cell.col);
  if (!el) {
    return;
  }
  el.className = "cell";
  el.textContent = "";

  if (cell.revealed) {
    el.classList.add("revealed");
    if (cell.mine) {
      el.classList.add("mine");
      el.textContent = "*";
    } else if (cell.adjacent > 0) {
      el.textContent = String(cell.adjacent);
      el.classList.add(`n${cell.adjacent}`);
    }
    return;
  }

  if (cell.flagged) {
    el.classList.add("flagged");
    el.textContent = "F";
  }
}

function renderBoard() {
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      renderCell(board[r][c]);
    }
  }
}

function revealAllMines() {
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const cell = board[r][c];
      if (cell.mine) {
        cell.revealed = true;
      }
      renderCell(cell);
    }
  }
}

function floodReveal(startRow, startCol) {
  const stack = [[startRow, startCol]];

  while (stack.length > 0) {
    const [r, c] = stack.pop();
    const cell = board[r][c];

    if (cell.revealed || cell.flagged) {
      continue;
    }

    cell.revealed = true;
    revealedCount += 1;
    renderCell(cell);

    if (cell.adjacent > 0) {
      continue;
    }

    for (const [dr, dc] of neighborOffsets) {
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(nr, nc)) {
        const next = board[nr][nc];
        if (!next.revealed && !next.mine && !next.flagged) {
          stack.push([nr, nc]);
        }
      }
    }
  }
}

function checkWinCondition() {
  const clearCells = ROWS * COLS - MINES;
  if (revealedCount !== clearCells) {
    return;
  }
  gameOver = true;
  stopTimer();
  resetBtn.textContent = "B)";
  statusTextEl.textContent = "You cleared the board!";
}

function loseGame() {
  gameOver = true;
  stopTimer();
  resetBtn.textContent = "X(";
  statusTextEl.textContent = "Boom! You hit a mine.";
  revealAllMines();
}

function onReveal(event) {
  if (gameOver) {
    return;
  }

  const row = Number(event.currentTarget.dataset.row);
  const col = Number(event.currentTarget.dataset.col);
  const cell = board[row][col];

  if (cell.flagged || cell.revealed) {
    return;
  }

  if (!hasStarted) {
    hasStarted = true;
    placeMines(row, col);
    calculateAdjacency();
    startTimer();
    statusTextEl.textContent = "";
    resetBtn.textContent = ":O";
  }

  if (cell.mine) {
    cell.revealed = true;
    renderCell(cell);
    loseGame();
    return;
  }

  floodReveal(row, col);
  checkWinCondition();

  if (!gameOver) {
    resetBtn.textContent = ":)";
  }
}

function onToggleFlag(event) {
  event.preventDefault();
  if (gameOver) {
    return;
  }

  const row = Number(event.currentTarget.dataset.row);
  const col = Number(event.currentTarget.dataset.col);
  const cell = board[row][col];

  if (cell.revealed) {
    return;
  }

  if (!cell.flagged && flagCount >= MINES) {
    return;
  }

  cell.flagged = !cell.flagged;
  flagCount += cell.flagged ? 1 : -1;
  renderCell(cell);
  updateCounters();
}

function resetGame() {
  board = createBoard();
  gameOver = false;
  hasStarted = false;
  revealedCount = 0;
  flagCount = 0;
  timer = 0;
  stopTimer();
  timerEl.textContent = formatCounter(0);
  updateCounters();
  resetBtn.textContent = ":)";
  statusTextEl.textContent = "";
  buildGrid();
}

resetBtn.addEventListener("click", resetGame);
resetGame();
