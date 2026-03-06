const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("level");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");

const board = {
  width: canvas.width,
  height: canvas.height,
};

const paddle = {
  width: 128,
  height: 15,
  speed: 8,
  x: board.width / 2 - 64,
  y: board.height - 38,
};

const ball = {
  radius: 9,
  x: board.width / 2,
  y: paddle.y - 10,
  vx: 0,
  vy: 0,
  baseSpeed: 3.4,
  maxSpeed: 7.4,
  attachedToPaddle: true,
};

const brickConfig = {
  rows: 7,
  cols: 10,
  width: 68,
  height: 22,
  gap: 8,
  offsetTop: 72,
  offsetLeft: 20,
};

const colors = ["#ff5d8f", "#f97316", "#facc15", "#4ade80", "#60a5fa", "#a78bfa", "#f472b6"];
const keys = { left: false, right: false };
let mouseX = null;

let score = 0;
let lives = 3;
let level = 1;
let running = false;
let animationId = null;
let message = "Press Start";
let bricks = [];

function makeBricks(currentLevel) {
  const rows = brickConfig.rows;
  const cols = brickConfig.cols;
  const list = [];

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const durability = r < currentLevel - 1 ? 2 : 1;
      const brickX = brickConfig.offsetLeft + c * (brickConfig.width + brickConfig.gap);
      const brickY = brickConfig.offsetTop + r * (brickConfig.height + brickConfig.gap);
      list.push({
        x: brickX,
        y: brickY,
        width: brickConfig.width,
        height: brickConfig.height,
        hp: durability,
      });
    }
  }
  return list;
}

function updateHud() {
  scoreEl.textContent = String(score);
  livesEl.textContent = String(lives);
  levelEl.textContent = String(level);
}

function resetBall(onPaddle = true) {
  ball.x = paddle.x + paddle.width / 2;
  ball.y = paddle.y - ball.radius - 1;
  ball.vx = 0;
  ball.vy = 0;
  ball.attachedToPaddle = onPaddle;
}

function launchBall() {
  if (!ball.attachedToPaddle) return;
  const speed = Math.min(ball.baseSpeed + level * 0.1, ball.maxSpeed);
  ball.vx = (Math.random() > 0.5 ? 1 : -1) * (speed * 0.6);
  ball.vy = -speed;
  ball.attachedToPaddle = false;
  message = "";
}

function resetGame() {
  score = 0;
  lives = 3;
  level = 1;
  bricks = makeBricks(level);
  paddle.x = board.width / 2 - paddle.width / 2;
  resetBall(true);
  message = "Press Start";
  updateHud();
  render();
}

function startGame() {
  if (!running) {
    running = true;
    message = "";
    launchBall();
    return;
  }
  launchBall();
}

function restartGame() {
  running = false;
  resetGame();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function movePaddle() {
  if (mouseX !== null) {
    const targetX = mouseX - paddle.width / 2;
    paddle.x = clamp(targetX, 0, board.width - paddle.width);
  } else {
    if (keys.left) paddle.x -= paddle.speed;
    if (keys.right) paddle.x += paddle.speed;
    paddle.x = clamp(paddle.x, 0, board.width - paddle.width);
  }

  if (ball.attachedToPaddle) {
    ball.x = paddle.x + paddle.width / 2;
  }
}

function increaseBallSpeed() {
  const speed = Math.hypot(ball.vx, ball.vy);
  const boosted = Math.min(speed + 0.08, ball.maxSpeed);
  const factor = boosted / speed;
  ball.vx *= factor;
  ball.vy *= factor;
}

function handleWallCollision() {
  if (ball.x - ball.radius <= 0) {
    ball.x = ball.radius;
    ball.vx *= -1;
  } else if (ball.x + ball.radius >= board.width) {
    ball.x = board.width - ball.radius;
    ball.vx *= -1;
  }

  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.vy *= -1;
  }
}

function handlePaddleCollision() {
  if (
    ball.y + ball.radius >= paddle.y &&
    ball.y - ball.radius <= paddle.y + paddle.height &&
    ball.x >= paddle.x &&
    ball.x <= paddle.x + paddle.width &&
    ball.vy > 0
  ) {
    const hitRatio = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
    const speed = Math.min(Math.hypot(ball.vx, ball.vy) + 0.1, ball.maxSpeed);
    const angle = hitRatio * (Math.PI / 3);
    ball.vx = speed * Math.sin(angle);
    ball.vy = -Math.abs(speed * Math.cos(angle));
    ball.y = paddle.y - ball.radius - 1;
  }
}

function handleBrickCollision() {
  for (const brick of bricks) {
    if (brick.hp <= 0) continue;
    const nearestX = clamp(ball.x, brick.x, brick.x + brick.width);
    const nearestY = clamp(ball.y, brick.y, brick.y + brick.height);
    const dx = ball.x - nearestX;
    const dy = ball.y - nearestY;

    if (dx * dx + dy * dy <= ball.radius * ball.radius) {
      const overlapX = Math.min(Math.abs(ball.x - brick.x), Math.abs(ball.x - (brick.x + brick.width)));
      const overlapY = Math.min(Math.abs(ball.y - brick.y), Math.abs(ball.y - (brick.y + brick.height)));

      if (overlapX < overlapY) {
        ball.vx *= -1;
      } else {
        ball.vy *= -1;
      }

      brick.hp -= 1;
      score += brick.hp > 0 ? 50 : 100;
      if (brick.hp <= 0) increaseBallSpeed();
      updateHud();
      break;
    }
  }
}

function aliveBricksCount() {
  return bricks.reduce((count, brick) => count + (brick.hp > 0 ? 1 : 0), 0);
}

function handleMissedBall() {
  if (ball.y - ball.radius > board.height) {
    lives -= 1;
    updateHud();

    if (lives <= 0) {
      running = false;
      message = "Game Over - Press Restart";
      return;
    }
    resetBall(true);
    message = "Press Start";
  }
}

function nextLevel() {
  level += 1;
  updateHud();
  bricks = makeBricks(Math.min(level, 3));
  resetBall(true);
  message = `Level ${level} - Press Start`;
}

function update() {
  movePaddle();

  if (ball.attachedToPaddle) return;

  ball.x += ball.vx;
  ball.y += ball.vy;

  handleWallCollision();
  handlePaddleCollision();
  handleBrickCollision();
  handleMissedBall();

  if (running && aliveBricksCount() === 0) {
    nextLevel();
  }
}

function drawPaddle() {
  ctx.fillStyle = "#38bdf8";
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

function drawBall() {
  ctx.beginPath();
  ctx.fillStyle = "#f8fafc";
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.closePath();
}

function drawBricks() {
  for (const brick of bricks) {
    if (brick.hp <= 0) continue;
    const color = colors[Math.floor(brick.y / (brickConfig.height + brickConfig.gap)) % colors.length];
    ctx.fillStyle = brick.hp > 1 ? "#f43f5e" : color;
    ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
    ctx.strokeStyle = "rgba(15, 23, 42, 0.65)";
    ctx.lineWidth = 1;
    ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
  }
}

function drawMessage() {
  if (!message) return;
  ctx.fillStyle = "rgba(9, 9, 13, 0.7)";
  ctx.fillRect(160, board.height / 2 - 45, board.width - 320, 90);
  ctx.strokeStyle = "#6366f1";
  ctx.lineWidth = 2;
  ctx.strokeRect(160, board.height / 2 - 45, board.width - 320, 90);
  ctx.fillStyle = "#e4e4e7";
  ctx.font = "700 24px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(message, board.width / 2, board.height / 2 + 8);
}

function render() {
  ctx.clearRect(0, 0, board.width, board.height);
  drawBricks();
  drawPaddle();
  drawBall();
  drawMessage();
}

function loop() {
  if (running) {
    update();
  }
  render();
  animationId = requestAnimationFrame(loop);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") keys.left = true;
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") keys.right = true;
  if (event.key === " " || event.key === "Enter") {
    if (running) {
      launchBall();
    }
  }
});

document.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") keys.left = false;
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") keys.right = false;
});

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = ((event.clientX - rect.left) / rect.width) * board.width;
});

canvas.addEventListener("mouseleave", () => {
  mouseX = null;
});

canvas.addEventListener("click", () => {
  if (running) launchBall();
});

startBtn.addEventListener("click", () => startGame());
restartBtn.addEventListener("click", () => restartGame());

resetGame();
loop();
