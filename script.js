const ROWS = 6;
const COLS = 6;
const MINES = 1;

const boardElement = document.getElementById("board");
const mineCounterElement = document.getElementById("mine-counter");
const timerElement = document.getElementById("timer");
const statusElement = document.getElementById("status");
const newGameButton = document.getElementById("new-game");

let board = [];
let revealedCount = 0;
let flagsUsed = 0;
let gameOver = false;
let minesLaid = false;
let seconds = 0;
let timerHandle = null;

function formatCounter(value) {
  return String(Math.max(0, value)).padStart(3, "0");
}

function inBounds(row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS;
}

function getNeighbors(row, col) {
  const result = [];
  for (let r = row - 1; r <= row + 1; r += 1) {
    for (let c = col - 1; c <= col + 1; c += 1) {
      if ((r !== row || c !== col) && inBounds(r, c)) {
        result.push([r, c]);
      }
    }
  }
  return result;
}

function resetTimer() {
  if (timerHandle) {
    clearInterval(timerHandle);
    timerHandle = null;
  }
  seconds = 0;
  timerElement.textContent = formatCounter(seconds);
}

function startTimer() {
  if (timerHandle) {
    return;
  }
  timerHandle = setInterval(() => {
    seconds += 1;
    timerElement.textContent = formatCounter(Math.min(seconds, 999));
  }, 1000);
}

function updateMineCounter() {
  mineCounterElement.textContent = formatCounter(MINES - flagsUsed);
}

function setStatus(message) {
  statusElement.textContent = message;
}

function buildEmptyBoard() {
  board = [];
  for (let row = 0; row < ROWS; row += 1) {
    const line = [];
    for (let col = 0; col < COLS; col += 1) {
      line.push({
        row,
        col,
        mine: false,
        revealed: false,
        flagged: false,
        adjacentMines: 0,
      });
    }
    board.push(line);
  }
}

function layMines(firstRow, firstCol) {
  const forbidden = new Set(
    [[firstRow, firstCol], ...getNeighbors(firstRow, firstCol)].map(
      ([row, col]) => `${row},${col}`
    )
  );
  const candidates = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const key = `${row},${col}`;
      if (!forbidden.has(key)) {
        candidates.push([row, col]);
      }
    }
  }

  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  for (let i = 0; i < MINES; i += 1) {
    const [row, col] = candidates[i];
    board[row][col].mine = true;
  }

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      board[row][col].adjacentMines = getNeighbors(row, col).filter(
        ([nr, nc]) => board[nr][nc].mine
      ).length;
    }
  }

  minesLaid = true;
}

function cellLabel(cell) {
  if (!cell.revealed) {
    return cell.flagged ? "⚑" : "";
  }
  if (cell.mine) {
    return "✹";
  }
  return cell.adjacentMines > 0 ? String(cell.adjacentMines) : "";
}

function drawBoard() {
  boardElement.innerHTML = "";
  boardElement.style.gridTemplateColumns = `repeat(${COLS}, minmax(0, 1fr))`;

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const cell = board[row][col];
      const button = document.createElement("button");
      button.className = "cell";
      button.type = "button";
      button.dataset.row = String(row);
      button.dataset.col = String(col);
      button.textContent = cellLabel(cell);
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-label", `Cell ${row + 1}, ${col + 1}`);

      if (cell.revealed) {
        button.classList.add("revealed");
      }
      if (cell.flagged && !cell.revealed) {
        button.classList.add("flagged");
      }
      if (cell.revealed && cell.mine) {
        button.classList.add("mine");
      }
      if (cell.revealed && !cell.mine && cell.adjacentMines > 0) {
        button.classList.add(`n${cell.adjacentMines}`);
      }

      button.addEventListener("click", () => revealCell(row, col));
      button.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        toggleFlag(row, col);
      });
      boardElement.appendChild(button);
    }
  }
}

function revealZeros(row, col) {
  const queue = [[row, col]];
  const seen = new Set();

  while (queue.length > 0) {
    const [currentRow, currentCol] = queue.shift();
    const key = `${currentRow},${currentCol}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const cell = board[currentRow][currentCol];

    if (cell.revealed || cell.flagged) {
      continue;
    }
    cell.revealed = true;
    revealedCount += 1;

    if (cell.adjacentMines === 0) {
      getNeighbors(currentRow, currentCol).forEach(([nr, nc]) => {
        const neighbor = board[nr][nc];
        if (!neighbor.revealed && !neighbor.mine) {
          queue.push([nr, nc]);
        }
      });
    }
  }
}

function revealAllMines() {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const cell = board[row][col];
      if (cell.mine) {
        cell.revealed = true;
      }
    }
  }
}

function revealAllSafeCells() {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const cell = board[row][col];
      if (!cell.mine && !cell.revealed) {
        cell.revealed = true;
        revealedCount += 1;
      }
    }
  }
}

function finishGame(won) {
  gameOver = true;
  if (timerHandle) {
    clearInterval(timerHandle);
    timerHandle = null;
  }

  if (won) {
    newGameButton.textContent = "B)";
    setStatus("You win! Every safe tile has been cleared.");
  } else {
    newGameButton.textContent = "X(";
    setStatus("Boom! You hit a mine. Press :) to try again.");
  }
  drawBoard();
}

function checkWin() {
  const safeCells = ROWS * COLS - MINES;
  if (revealedCount === safeCells) {
    finishGame(true);
  }
}

function revealCell(row, col) {
  if (gameOver) {
    return;
  }

  const cell = board[row][col];
  if (cell.flagged || cell.revealed) {
    return;
  }

  if (!minesLaid) {
    layMines(row, col);
    startTimer();
  }

  if (cell.mine) {
    cell.revealed = true;
    revealAllMines();
    finishGame(false);
    return;
  }

  revealZeros(row, col);
  if (MINES === 1) {
    // Keep the tiny demo board quick to complete.
    revealAllSafeCells();
  }
  drawBoard();
  checkWin();
}

function toggleFlag(row, col) {
  if (gameOver || !minesLaid) {
    return;
  }
  const cell = board[row][col];
  if (cell.revealed) {
    return;
  }

  cell.flagged = !cell.flagged;
  flagsUsed += cell.flagged ? 1 : -1;
  updateMineCounter();
  drawBoard();
}

function newGame() {
  buildEmptyBoard();
  revealedCount = 0;
  flagsUsed = 0;
  gameOver = false;
  minesLaid = false;
  resetTimer();
  updateMineCounter();
  setStatus("Left click to reveal, right click to flag.");
  newGameButton.textContent = ":)";
  drawBoard();
}

newGameButton.addEventListener("click", newGame);
newGame();
