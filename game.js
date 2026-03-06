const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const ballsEl = document.getElementById("balls");
const statusEl = document.getElementById("status");

const board = {
  left: 24,
  right: canvas.width - 24,
  top: 24,
  drainY: canvas.height - 16,
  laneX: canvas.width - 68,
};

const bumpers = [
  { x: 148, y: 196, r: 24, score: 100 },
  { x: 252, y: 150, r: 24, score: 100 },
  { x: 336, y: 246, r: 24, score: 150 },
  { x: 204, y: 300, r: 18, score: 200 },
];

const leftFlipper = {
  pivot: { x: 170, y: 644 },
  length: 90,
  rest: toRad(22),
  raised: toRad(-24),
  angle: toRad(22),
  active: false,
};

const rightFlipper = {
  pivot: { x: 310, y: 644 },
  length: 90,
  rest: toRad(158),
  raised: toRad(204),
  angle: toRad(158),
  active: false,
};

const state = {
  score: 0,
  balls: 3,
  gameOver: false,
  charge: 0,
  charging: false,
  ball: createBall(),
};

const keys = new Set();
let lastTs = 0;

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  keys.add(key);

  if (key === "arrowleft" || key === "a") {
    leftFlipper.active = true;
  }
  if (key === "arrowright" || key === "d") {
    rightFlipper.active = true;
  }

  if (event.code === "Space" && !state.gameOver) {
    event.preventDefault();
    if (!state.ball.launched) {
      state.charging = true;
    }
  }

  if (key === "r") {
    resetGame();
  }
});

document.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  keys.delete(key);

  if (key === "arrowleft" || key === "a") {
    leftFlipper.active = false;
  }
  if (key === "arrowright" || key === "d") {
    rightFlipper.active = false;
  }

  if (event.code === "Space") {
    event.preventDefault();
    if (state.charging && !state.ball.launched && !state.gameOver) {
      launchBall();
    }
    state.charging = false;
  }
});

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function createBall() {
  return {
    x: board.laneX + 12,
    y: board.drainY - 42,
    vx: 0,
    vy: 0,
    r: 10,
    launched: false,
  };
}

function resetBall() {
  state.ball = createBall();
  state.charge = 0;
  state.charging = false;
}

function resetGame() {
  state.score = 0;
  state.balls = 3;
  state.gameOver = false;
  scoreEl.textContent = String(state.score);
  ballsEl.textContent = String(state.balls);
  statusEl.textContent = "Hold Space to charge, release to launch.";
  resetBall();
}

function launchBall() {
  const speed = 520 + state.charge * 420;
  state.ball.vx = -170;
  state.ball.vy = -speed;
  state.ball.launched = true;
  statusEl.textContent = "Ball in play.";
}

function updateFlipper(flipper, dt) {
  const target = flipper.active ? flipper.raised : flipper.rest;
  const direction = Math.sign(target - flipper.angle);
  const speed = 10.5;
  const next = flipper.angle + direction * speed * dt;
  if (direction > 0) {
    flipper.angle = Math.min(target, next);
  } else if (direction < 0) {
    flipper.angle = Math.max(target, next);
  }
}

function flipperTip(flipper) {
  return {
    x: flipper.pivot.x + Math.cos(flipper.angle) * flipper.length,
    y: flipper.pivot.y + Math.sin(flipper.angle) * flipper.length,
  };
}

function resolveFlipperCollision(flipper) {
  const tip = flipperTip(flipper);
  const px = state.ball.x;
  const py = state.ball.y;
  const ax = flipper.pivot.x;
  const ay = flipper.pivot.y;
  const bx = tip.x;
  const by = tip.y;
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const lenSq = abx * abx + aby * aby;
  const t = clamp((apx * abx + apy * aby) / lenSq, 0, 1);
  const nx = ax + abx * t;
  const ny = ay + aby * t;
  const dx = px - nx;
  const dy = py - ny;
  const dist = Math.hypot(dx, dy);
  if (dist >= state.ball.r || dist === 0) {
    return;
  }

  const nX = dx / dist;
  const nY = dy / dist;
  const penetration = state.ball.r - dist;
  state.ball.x += nX * penetration;
  state.ball.y += nY * penetration;

  const vn = state.ball.vx * nX + state.ball.vy * nY;
  if (vn < 0) {
    const bounce = 1.04;
    state.ball.vx -= (1 + bounce) * vn * nX;
    state.ball.vy -= (1 + bounce) * vn * nY;
  }

  if (flipper.active) {
    const kick = 290;
    state.ball.vx += nX * kick;
    state.ball.vy += nY * kick;
  }
}

function resolveBumperCollision(bumper) {
  const dx = state.ball.x - bumper.x;
  const dy = state.ball.y - bumper.y;
  const dist = Math.hypot(dx, dy);
  const minDist = state.ball.r + bumper.r;
  if (dist >= minDist || dist === 0) {
    return;
  }
  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;
  state.ball.x += nx * overlap;
  state.ball.y += ny * overlap;

  const speedAlongNormal = state.ball.vx * nx + state.ball.vy * ny;
  if (speedAlongNormal < 0) {
    const restitution = 1.18;
    state.ball.vx -= (1 + restitution) * speedAlongNormal * nx;
    state.ball.vy -= (1 + restitution) * speedAlongNormal * ny;
    state.score += bumper.score;
    scoreEl.textContent = String(state.score);
  }
}

function resolveWalls() {
  const ball = state.ball;
  if (ball.x - ball.r < board.left) {
    ball.x = board.left + ball.r;
    ball.vx = Math.abs(ball.vx) * 0.92;
  }
  if (ball.x + ball.r > board.right) {
    ball.x = board.right - ball.r;
    ball.vx = -Math.abs(ball.vx) * 0.92;
  }
  if (ball.y - ball.r < board.top) {
    ball.y = board.top + ball.r;
    ball.vy = Math.abs(ball.vy) * 0.9;
  }

  // Keep the launcher lane mostly isolated before launch.
  if (!ball.launched && ball.x < board.laneX) {
    ball.x = board.laneX;
  }
}

function updateBall(dt) {
  const ball = state.ball;
  if (state.gameOver) {
    return;
  }

  if (!ball.launched) {
    if (state.charging) {
      state.charge = Math.min(1, state.charge + dt * 0.95);
      statusEl.textContent = `Charging launch: ${Math.round(state.charge * 100)}%`;
    } else {
      state.charge = Math.max(0, state.charge - dt * 1.8);
    }
    ball.y = board.drainY - 42 + (1 - state.charge) * 8;
    ball.x = board.laneX + 12;
    ball.vx = 0;
    ball.vy = 0;
    return;
  }

  ball.vy += 970 * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  resolveWalls();
  resolveFlipperCollision(leftFlipper);
  resolveFlipperCollision(rightFlipper);

  for (const bumper of bumpers) {
    resolveBumperCollision(bumper);
  }

  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > 980) {
    const scale = 980 / speed;
    ball.vx *= scale;
    ball.vy *= scale;
  }
  ball.vx *= 0.998;

  if (ball.y - ball.r > board.drainY) {
    state.balls -= 1;
    ballsEl.textContent = String(Math.max(state.balls, 0));
    if (state.balls > 0) {
      statusEl.textContent = "Ball lost! Launch the next one.";
      resetBall();
    } else {
      state.gameOver = true;
      statusEl.textContent = "Game over. Press R to restart.";
    }
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#09192e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#84a8e6";
  ctx.lineWidth = 3;
  roundRect(ctx, board.left, board.top, board.right - board.left, board.drainY - board.top, 20);
  ctx.stroke();

  ctx.strokeStyle = "#6f95dc";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(board.laneX, board.top + 40);
  ctx.lineTo(board.laneX, board.drainY - 8);
  ctx.stroke();

  ctx.fillStyle = "#93beff";
  ctx.font = "13px Arial";
  ctx.fillText("LAUNCH", board.laneX + 6, board.drainY - 18);
}

function drawBumpers() {
  for (const bumper of bumpers) {
    ctx.beginPath();
    ctx.arc(bumper.x, bumper.y, bumper.r + 4, 0, Math.PI * 2);
    ctx.fillStyle = "#9f5df8";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(bumper.x, bumper.y, bumper.r, 0, Math.PI * 2);
    ctx.fillStyle = "#58c8ff";
    ctx.fill();

    ctx.fillStyle = "#06203f";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(bumper.score), bumper.x, bumper.y);
  }
}

function drawFlipper(flipper) {
  const tip = flipperTip(flipper);
  ctx.strokeStyle = flipper.active ? "#ffe282" : "#ffd46e";
  ctx.lineWidth = 15;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(flipper.pivot.x, flipper.pivot.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(flipper.pivot.x, flipper.pivot.y, 8, 0, Math.PI * 2);
  ctx.fillStyle = "#f7f0c9";
  ctx.fill();
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, state.ball.r, 0, Math.PI * 2);
  ctx.fillStyle = "#e5f3ff";
  ctx.fill();
  ctx.strokeStyle = "#8ab3d8";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawOverlays() {
  if (!state.gameOver) {
    return;
  }
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "bold 42px Arial";
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 12);
  ctx.font = "22px Arial";
  ctx.fillText(`Final score: ${state.score}`, canvas.width / 2, canvas.height / 2 + 30);
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function loop(ts) {
  if (!lastTs) {
    lastTs = ts;
  }
  const dt = Math.min(0.033, (ts - lastTs) / 1000);
  lastTs = ts;

  updateFlipper(leftFlipper, dt);
  updateFlipper(rightFlipper, dt);
  updateBall(dt);
  drawBoard();
  drawBumpers();
  drawFlipper(leftFlipper);
  drawFlipper(rightFlipper);
  drawBall();
  drawOverlays();

  requestAnimationFrame(loop);
}

resetGame();
requestAnimationFrame(loop);
