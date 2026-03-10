"use client";

import { useEffect, useRef, useState } from "react";

const WIDTH = 900;
const HEIGHT = 620;
const PLAYER_SPEED = 420;
const PLAYER_BULLET_SPEED = 760;
const ENEMY_BULLET_SPEED = 170;
const PLAYER_COOLDOWN = 0.14;
const ENEMY_DROP = 18;

function createInvaders() {
  const invaders = [];
  const rows = 3;
  const cols = 6;
  const startX = 176;
  const startY = 74;
  const spacingX = 86;
  const spacingY = 58;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      invaders.push({
        x: startX + col * spacingX,
        y: startY + row * spacingY,
        w: 42,
        h: 30,
        row,
        alive: true,
      });
    }
  }

  return invaders;
}

function createGameState() {
  return {
    player: {
      x: WIDTH / 2 - 28,
      y: HEIGHT - 70,
      w: 56,
      h: 24,
      lives: 8,
      cooldown: 0,
    },
    keys: {
      left: false,
      right: false,
      shoot: false,
    },
    bullets: [],
    enemyBullets: [],
    invaders: createInvaders(),
    enemyDirection: 1,
    enemySpeed: 28,
    enemyShootTimer: 2.2,
    score: 0,
    gameOver: false,
    won: false,
  };
}

function intersects(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export default function Home() {
  const canvasRef = useRef(null);
  const gameRef = useRef(createGameState());
  const frameRef = useRef(0);
  const lastFrameRef = useRef(0);

  const [hud, setHud] = useState({
    score: 0,
    lives: 8,
    invaders: 18,
    status: "playing",
  });

  useEffect(() => {
    gameRef.current = createGameState();
    setHud({
      score: 0,
      lives: 8,
      invaders: 18,
      status: "playing",
    });
  }, []);

  useEffect(() => {
    const keyDown = (event) => {
      const game = gameRef.current;
      if (event.code === "ArrowLeft" || event.code === "KeyA") {
        game.keys.left = true;
      }
      if (event.code === "ArrowRight" || event.code === "KeyD") {
        game.keys.right = true;
      }
      if (event.code === "Space") {
        event.preventDefault();
        game.keys.shoot = true;
      }
    };

    const keyUp = (event) => {
      const game = gameRef.current;
      if (event.code === "ArrowLeft" || event.code === "KeyA") {
        game.keys.left = false;
      }
      if (event.code === "ArrowRight" || event.code === "KeyD") {
        game.keys.right = false;
      }
      if (event.code === "Space") {
        game.keys.shoot = false;
      }
    };

    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);

    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return undefined;
    }

    const updateHud = () => {
      const game = gameRef.current;
      const aliveCount = game.invaders.filter((invader) => invader.alive).length;

      setHud({
        score: game.score,
        lives: game.player.lives,
        invaders: aliveCount,
        status: game.gameOver ? (game.won ? "won" : "lost") : "playing",
      });
    };

    const spawnPlayerBullet = () => {
      const game = gameRef.current;
      game.bullets.push({
        x: game.player.x + game.player.w / 2 - 3,
        y: game.player.y - 12,
        w: 6,
        h: 12,
      });
    };

    const spawnEnemyBullet = () => {
      const game = gameRef.current;
      const aliveInvaders = game.invaders.filter((invader) => invader.alive);
      if (aliveInvaders.length === 0) {
        return;
      }

      const shooter =
        aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];

      game.enemyBullets.push({
        x: shooter.x + shooter.w / 2 - 3,
        y: shooter.y + shooter.h,
        w: 6,
        h: 12,
      });
    };

    const update = (dt) => {
      const game = gameRef.current;
      if (game.gameOver) {
        return;
      }

      if (game.keys.left) {
        game.player.x -= PLAYER_SPEED * dt;
      }
      if (game.keys.right) {
        game.player.x += PLAYER_SPEED * dt;
      }

      const aliveInvaders = game.invaders.filter((invader) => invader.alive);
      if (!game.keys.left && !game.keys.right && aliveInvaders.length > 0) {
        let target = aliveInvaders[0];
        for (const invader of aliveInvaders) {
          if (invader.y > target.y) {
            target = invader;
          }
        }

        const targetCenter = target.x + target.w / 2;
        const playerCenter = game.player.x + game.player.w / 2;
        if (Math.abs(targetCenter - playerCenter) > 4) {
          const direction = targetCenter > playerCenter ? 1 : -1;
          game.player.x += direction * PLAYER_SPEED * 0.9 * dt;
        }
      }
      game.player.x = Math.max(14, Math.min(WIDTH - game.player.w - 14, game.player.x));

      game.player.cooldown -= dt;
      if ((game.keys.shoot || aliveInvaders.length > 0) && game.player.cooldown <= 0) {
        spawnPlayerBullet();
        game.player.cooldown = PLAYER_COOLDOWN;
      }

      for (const bullet of game.bullets) {
        bullet.y -= PLAYER_BULLET_SPEED * dt;
      }
      game.bullets = game.bullets.filter((bullet) => bullet.y + bullet.h > 0);

      for (const bullet of game.enemyBullets) {
        bullet.y += ENEMY_BULLET_SPEED * dt;
      }
      game.enemyBullets = game.enemyBullets.filter(
        (bullet) => bullet.y < HEIGHT + bullet.h
      );

      for (const invader of aliveInvaders) {
        invader.x += game.enemyDirection * game.enemySpeed * dt;
      }

      let edgeHit = false;
      for (const invader of aliveInvaders) {
        if (invader.x <= 16 || invader.x + invader.w >= WIDTH - 16) {
          edgeHit = true;
          break;
        }
      }

      if (edgeHit) {
        game.enemyDirection *= -1;
        for (const invader of aliveInvaders) {
          invader.y += ENEMY_DROP;
          if (invader.y + invader.h >= game.player.y) {
            game.gameOver = true;
            game.won = false;
          }
        }
      }

      game.enemyShootTimer -= dt;
      if (game.enemyShootTimer <= 0) {
        spawnEnemyBullet();
        game.enemyShootTimer = 1.6 + Math.random() * 0.8;
      }

      for (const bullet of game.bullets) {
        for (const invader of game.invaders) {
          if (invader.alive && intersects(bullet, invader)) {
            invader.alive = false;
            bullet.y = -1000;
            game.score += 10;
            break;
          }
        }
      }
      game.bullets = game.bullets.filter((bullet) => bullet.y > -100);

      for (const bullet of game.enemyBullets) {
        if (intersects(bullet, game.player)) {
          bullet.y = HEIGHT + 100;
          game.player.lives -= 1;
          if (game.player.lives <= 0) {
            game.gameOver = true;
            game.won = false;
          }
        }
      }
      game.enemyBullets = game.enemyBullets.filter((bullet) => bullet.y <= HEIGHT);

      const remaining = game.invaders.filter((invader) => invader.alive).length;
      if (remaining === 0) {
        game.gameOver = true;
        game.won = true;
      }
    };

    const draw = () => {
      const game = gameRef.current;
      context.clearRect(0, 0, WIDTH, HEIGHT);

      context.fillStyle = "#060b1a";
      context.fillRect(0, 0, WIDTH, HEIGHT);

      for (let i = 0; i < 130; i += 1) {
        const x = (i * 71) % WIDTH;
        const y = (i * 53) % HEIGHT;
        context.fillStyle = i % 2 === 0 ? "#1f365e" : "#152646";
        context.fillRect(x, y, 2, 2);
      }

      context.fillStyle = "#2bd06d";
      context.fillRect(game.player.x, game.player.y, game.player.w, game.player.h);
      context.fillRect(game.player.x + game.player.w / 2 - 6, game.player.y - 10, 12, 10);

      for (const invader of game.invaders) {
        if (!invader.alive) {
          continue;
        }

        context.fillStyle = invader.row % 2 === 0 ? "#ff5d9e" : "#69b2ff";
        context.fillRect(invader.x, invader.y, invader.w, invader.h);
        context.fillStyle = "#0d1831";
        context.fillRect(invader.x + 8, invader.y + 8, 8, 8);
        context.fillRect(invader.x + invader.w - 16, invader.y + 8, 8, 8);
      }

      context.fillStyle = "#f8f8ff";
      for (const bullet of game.bullets) {
        context.fillRect(bullet.x, bullet.y, bullet.w, bullet.h);
      }

      context.fillStyle = "#ffcb6d";
      for (const bullet of game.enemyBullets) {
        context.fillRect(bullet.x, bullet.y, bullet.w, bullet.h);
      }

      context.fillStyle = "#4cd964";
      context.fillRect(12, HEIGHT - 12, WIDTH - 24, 4);

      if (game.gameOver) {
        context.fillStyle = "rgba(0, 0, 0, 0.5)";
        context.fillRect(0, 0, WIDTH, HEIGHT);
        context.textAlign = "center";
        context.fillStyle = "#fefefe";
        context.font = "bold 56px Arial";
        context.fillText(game.won ? "YOU WIN" : "GAME OVER", WIDTH / 2, HEIGHT / 2 - 10);
        context.font = "24px Arial";
        context.fillText("Press Restart to play again", WIDTH / 2, HEIGHT / 2 + 34);
      }
    };

    const loop = (time) => {
      if (!lastFrameRef.current) {
        lastFrameRef.current = time;
      }
      const dt = Math.min((time - lastFrameRef.current) / 1000, 0.033);
      lastFrameRef.current = time;
      update(dt);
      draw();
      updateHud();
      frameRef.current = window.requestAnimationFrame(loop);
    };

    frameRef.current = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const restart = () => {
    gameRef.current = createGameState();
    lastFrameRef.current = 0;
    setHud({
      score: 0,
      lives: 8,
      invaders: 18,
      status: "playing",
    });
  };

  return (
    <main className="game-page">
      <section className="game-shell">
        <h1>Space Invaders</h1>
        <p className="subhead">
          Move with A/D or Arrow keys and shoot with Space. Autopilot helps if idle.
        </p>

        <div className="hud">
          <span>Score: {hud.score}</span>
          <span>Lives: {hud.lives}</span>
          <span>Invaders: {hud.invaders}</span>
          <span className={`status status-${hud.status}`}>
            {hud.status === "playing" && "In battle"}
            {hud.status === "won" && "Victory"}
            {hud.status === "lost" && "Defeat"}
          </span>
        </div>

        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="game-canvas"
          aria-label="Space Invaders game board"
        />

        <div className="controls">
          <button type="button" onClick={restart}>
            Restart
          </button>
        </div>
      </section>
    </main>
  );
}
