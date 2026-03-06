const GRID_SIZE = 21;
const TILE_SIZE = 20;
const TICK_MS = 160;

const board = document.getElementById("board");
const ctx = board.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const messageEl = document.getElementById("message");
const restartBtn = document.getElementById("restart");

const storedBest = Number(localStorage.getItem("snake-best-score")) || 0;
let bestScore = storedBest;
let snake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let food = null;
let score = 0;
let running = false;
let timerId = null;

bestEl.textContent = String(bestScore);

function initGameState() {
  const mid = Math.floor(GRID_SIZE / 2);
  snake = [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid }
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  scoreEl.textContent = "0";
  const firstFood = { x: mid + 4, y: mid };
  const firstFoodOnSnake = snake.some((part) => part.x === firstFood.x && part.y === firstFood.y);
  food = firstFoodOnSnake ? placeFood() : firstFood;
}

function placeFood() {
  while (true) {
    const candidate = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    };
    const onSnake = snake.some((part) => part.x === candidate.x && part.y === candidate.y);
    if (!onSnake) return candidate;
  }
}

function drawCell(x, y, color, padding = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(
    x * TILE_SIZE + padding,
    y * TILE_SIZE + padding,
    TILE_SIZE - padding * 2,
    TILE_SIZE - padding * 2
  );
}

function drawBoard() {
  ctx.fillStyle = "#0d1118";
  ctx.fillRect(0, 0, board.width, board.height);

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      drawCell(x, y, "#161c27", 2);
    }
  }

  snake.forEach((part, index) => {
    const color = index === 0 ? "#7bf1a8" : "#3ecf8e";
    drawCell(part.x, part.y, color);
  });

  drawCell(food.x, food.y, "#ff5d73", 2);
}

function canMoveTo(newHead) {
  const insideX = newHead.x >= 0 && newHead.x < GRID_SIZE;
  const insideY = newHead.y >= 0 && newHead.y < GRID_SIZE;
  if (!insideX || !insideY) return false;

  return !snake.some((part) => part.x === newHead.x && part.y === newHead.y);
}

function tick() {
  direction = nextDirection;
  const head = snake[0];
  const newHead = { x: head.x + direction.x, y: head.y + direction.y };

  if (!canMoveTo(newHead)) {
    stopGame("Game over. Press Restart or any movement key.");
    return;
  }

  snake.unshift(newHead);

  const ateFood = newHead.x === food.x && newHead.y === food.y;
  if (ateFood) {
    score += 1;
    scoreEl.textContent = String(score);
    if (score > bestScore) {
      bestScore = score;
      bestEl.textContent = String(bestScore);
      localStorage.setItem("snake-best-score", String(bestScore));
    }
    food = placeFood();
  } else {
    snake.pop();
  }

  drawBoard();
}

function startGame() {
  if (running) return;
  running = true;
  messageEl.textContent = "";
  timerId = setInterval(tick, TICK_MS);
}

function stopGame(message) {
  running = false;
  clearInterval(timerId);
  timerId = null;
  messageEl.textContent = message;
}

function resetGame(message = "Press any movement key to start.") {
  stopGame(message);
  initGameState();
  drawBoard();
}

function setDirection(inputDirection) {
  const reversingX = inputDirection.x !== 0 && inputDirection.x === -direction.x;
  const reversingY = inputDirection.y !== 0 && inputDirection.y === -direction.y;
  if (reversingX || reversingY) {
    return;
  }
  nextDirection = inputDirection;
  startGame();
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
    event.preventDefault();
  }

  if (key === "arrowup" || key === "w") setDirection({ x: 0, y: -1 });
  if (key === "arrowdown" || key === "s") setDirection({ x: 0, y: 1 });
  if (key === "arrowleft" || key === "a") setDirection({ x: -1, y: 0 });
  if (key === "arrowright" || key === "d") setDirection({ x: 1, y: 0 });
});

restartBtn.addEventListener("click", () => {
  resetGame();
});

resetGame();
