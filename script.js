const WINNING_COMBINATIONS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const cells = Array.from(document.querySelectorAll(".cell"));
const statusText = document.getElementById("status");
const resetButton = document.getElementById("reset");

let board = Array(9).fill("");
let currentPlayer = "X";
let gameOver = false;

function updateStatus(message) {
  statusText.textContent = message;
}

function getWinningLine() {
  for (const combination of WINNING_COMBINATIONS) {
    const [a, b, c] = combination;
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      return combination;
    }
  }
  return null;
}

function setBoardDisabled(disabled) {
  cells.forEach((cell) => {
    cell.disabled = disabled || cell.textContent !== "";
  });
}

function handleCellClick(event) {
  if (gameOver) {
    return;
  }

  const clickedCell = event.currentTarget;
  const index = Number(clickedCell.dataset.index);

  if (board[index]) {
    return;
  }

  board[index] = currentPlayer;
  clickedCell.textContent = currentPlayer;
  clickedCell.disabled = true;

  const winningLine = getWinningLine();
  if (winningLine) {
    gameOver = true;
    winningLine.forEach((winningIndex) => {
      cells[winningIndex].classList.add("winning-cell");
    });
    setBoardDisabled(true);
    updateStatus(`Player ${currentPlayer} wins!`);
    return;
  }

  const isDraw = board.every((value) => value !== "");
  if (isDraw) {
    gameOver = true;
    setBoardDisabled(true);
    updateStatus("It's a draw!");
    return;
  }

  currentPlayer = currentPlayer === "X" ? "O" : "X";
  updateStatus(`Player ${currentPlayer}'s turn`);
}

function resetGame() {
  board = Array(9).fill("");
  currentPlayer = "X";
  gameOver = false;

  cells.forEach((cell) => {
    cell.textContent = "";
    cell.disabled = false;
    cell.classList.remove("winning-cell");
  });

  updateStatus("Player X's turn");
}

cells.forEach((cell) => {
  cell.addEventListener("click", handleCellClick);
});

resetButton.addEventListener("click", resetGame);
