"use client";

import { useEffect, useMemo, useState } from "react";

const MAZE_TEMPLATE = [
  "#####################",
  "#.........#.........#",
  "#.###.###.#.###.###.#",
  "#o###.###.#.###.###o#",
  "#...................#",
  "#.###.#.#####.#.###.#",
  "#.....#...#...#.....#",
  "#####.###.#.###.#####",
  "#....#....C....#....#",
  "###.#.#.#####.#.#.###",
  "#...#.#...#...#.#...#",
  "#.###.###.#.###.###.#",
  "#.....#...A...#.....#",
  "#.###.#.#####.#.###.#",
  "#o..#....P....#..S.o#",
  "#.###.###.#.###.###.#",
  "#.........#.........#",
  "#####################",
];

const DIRECTIONS = [
  { name: "up", x: 0, y: -1, keys: ["ArrowUp", "w", "W"] },
  { name: "down", x: 0, y: 1, keys: ["ArrowDown", "s", "S"] },
  { name: "left", x: -1, y: 0, keys: ["ArrowLeft", "a", "A"] },
  { name: "right", x: 1, y: 0, keys: ["ArrowRight", "d", "D"] },
];

const DIRECTION_BY_NAME = Object.fromEntries(
  DIRECTIONS.map((direction) => [direction.name, direction]),
);
const DIRECTION_BY_KEY = Object.fromEntries(
  DIRECTIONS.flatMap((direction) =>
    direction.keys.map((key) => [key, direction.name]),
  ),
);
const OPPOSITE_DIRECTION = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const GHOST_CONFIG = {
  C: {
    id: "chase",
    label: "Blinky",
    personality: "chase",
    color: "#ff4d4f",
    scatterTarget: { x: 19, y: 1 },
  },
  A: {
    id: "ambush",
    label: "Pinky",
    personality: "ambush",
    color: "#ff8ad8",
    scatterTarget: { x: 1, y: 1 },
  },
  S: {
    id: "scatter",
    label: "Clyde",
    personality: "scatter",
    color: "#ffa43a",
    scatterTarget: { x: 19, y: 16 },
  },
};

const TICK_MS = 150;

function toKey(x, y) {
  return `${x},${y}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function parseMaze() {
  const walls = new Set();
  const pellets = new Set();
  const powerPellets = new Set();
  const ghostStarts = [];
  let pacmanStart = { x: 1, y: 1 };

  MAZE_TEMPLATE.forEach((row, y) => {
    row.split("").forEach((char, x) => {
      const key = toKey(x, y);
      if (char === "#") {
        walls.add(key);
      } else if (char === "." || char === "o") {
        pellets.add(key);
        if (char === "o") {
          powerPellets.add(key);
        }
      } else if (char === "P") {
        pacmanStart = { x, y };
      } else if (GHOST_CONFIG[char]) {
        ghostStarts.push({
          ...GHOST_CONFIG[char],
          start: { x, y },
          x,
          y,
          direction: "left",
        });
      }
    });
  });

  return {
    rows: MAZE_TEMPLATE.length,
    cols: MAZE_TEMPLATE[0].length,
    walls,
    pellets,
    powerPellets,
    pacmanStart,
    ghostStarts,
  };
}

const MAZE = parseMaze();

function canMoveTo(x, y) {
  if (x < 0 || y < 0 || x >= MAZE.cols || y >= MAZE.rows) {
    return false;
  }
  return !MAZE.walls.has(toKey(x, y));
}

function getValidDirections(x, y, currentDirection) {
  const options = DIRECTIONS.filter((direction) =>
    canMoveTo(x + direction.x, y + direction.y),
  ).map((direction) => direction.name);

  if (options.length <= 1) {
    return options;
  }

  const reverse = OPPOSITE_DIRECTION[currentDirection];
  const withoutReverse = options.filter((option) => option !== reverse);
  return withoutReverse.length > 0 ? withoutReverse : options;
}

function getGhostTarget(ghost, pacman) {
  if (ghost.personality === "scatter") {
    return ghost.scatterTarget;
  }

  if (ghost.personality === "ambush") {
    const direction = DIRECTION_BY_NAME[pacman.direction] ?? DIRECTION_BY_NAME.right;
    return {
      x: clamp(pacman.x + direction.x * 4, 0, MAZE.cols - 1),
      y: clamp(pacman.y + direction.y * 4, 0, MAZE.rows - 1),
    };
  }

  return { x: pacman.x, y: pacman.y };
}

function stepGhost(ghost, pacman) {
  const validDirections = getValidDirections(ghost.x, ghost.y, ghost.direction);
  if (validDirections.length === 0) {
    return ghost;
  }

  const target = getGhostTarget(ghost, pacman);

  const nextDirection = validDirections.reduce((bestDirection, directionName) => {
    const direction = DIRECTION_BY_NAME[directionName];
    const nextX = ghost.x + direction.x;
    const nextY = ghost.y + direction.y;
    const distance = Math.abs(target.x - nextX) + Math.abs(target.y - nextY);

    if (!bestDirection || distance < bestDirection.distance) {
      return { name: directionName, distance };
    }

    return bestDirection;
  }, null);

  const direction = DIRECTION_BY_NAME[nextDirection.name];
  return {
    ...ghost,
    x: ghost.x + direction.x,
    y: ghost.y + direction.y,
    direction: nextDirection.name,
  };
}

function resetActors(state) {
  return {
    ...state,
    pacman: {
      ...state.pacman,
      ...MAZE.pacmanStart,
      direction: null,
      queuedDirection: null,
    },
    ghosts: MAZE.ghostStarts.map((ghost) => ({ ...ghost })),
  };
}

function createInitialState() {
  return {
    pacman: {
      ...MAZE.pacmanStart,
      direction: null,
      queuedDirection: null,
    },
    ghosts: MAZE.ghostStarts.map((ghost) => ({ ...ghost })),
    pellets: new Set(MAZE.pellets),
    score: 0,
    lives: 3,
    status: "ready",
  };
}

function runTick(previousState) {
  if (previousState.status !== "playing") {
    return previousState;
  }

  let state = { ...previousState };
  let pacman = { ...state.pacman };
  const queuedDirection = DIRECTION_BY_NAME[pacman.queuedDirection];

  if (
    queuedDirection &&
    canMoveTo(pacman.x + queuedDirection.x, pacman.y + queuedDirection.y)
  ) {
    pacman.direction = queuedDirection.name;
  }

  const movementDirection = DIRECTION_BY_NAME[pacman.direction];
  if (
    movementDirection &&
    canMoveTo(pacman.x + movementDirection.x, pacman.y + movementDirection.y)
  ) {
    pacman.x += movementDirection.x;
    pacman.y += movementDirection.y;
  }

  const pellets = new Set(state.pellets);
  const pacmanCellKey = toKey(pacman.x, pacman.y);
  let score = state.score;
  if (pellets.delete(pacmanCellKey)) {
    score += MAZE.powerPellets.has(pacmanCellKey) ? 50 : 10;
  }

  const collidedBeforeGhostMove = state.ghosts.some(
    (ghost) => ghost.x === pacman.x && ghost.y === pacman.y,
  );
  let ghosts = state.ghosts.map((ghost) => stepGhost(ghost, pacman));
  const collidedAfterGhostMove = ghosts.some(
    (ghost) => ghost.x === pacman.x && ghost.y === pacman.y,
  );
  let collided = collidedBeforeGhostMove || collidedAfterGhostMove;

  if (collided) {
    const lives = state.lives - 1;
    if (lives <= 0) {
      return {
        ...state,
        pacman,
        ghosts,
        pellets,
        score,
        lives: 0,
        status: "lost",
      };
    }

    return resetActors({
      ...state,
      pellets,
      score,
      lives,
      status: "ready",
      pacman,
      ghosts,
    });
  }

  if (pellets.size === 0) {
    return {
      ...state,
      pacman,
      ghosts,
      pellets,
      score,
      status: "won",
    };
  }

  return {
    ...state,
    pacman,
    ghosts,
    pellets,
    score,
  };
}

export default function Home() {
  const [game, setGame] = useState(createInitialState);

  useEffect(() => {
    const onKeyDown = (event) => {
      const direction = DIRECTION_BY_KEY[event.key];
      if (!direction) {
        return;
      }
      event.preventDefault();
      setGame((previous) => ({
        ...previous,
        status: previous.status === "ready" ? "playing" : previous.status,
        pacman: {
          ...previous.pacman,
          queuedDirection: direction,
        },
      }));
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (game.status !== "playing") {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setGame((previous) => runTick(previous));
    }, TICK_MS);

    return () => window.clearInterval(timer);
  }, [game.status]);

  const ghostPositionMap = useMemo(() => {
    const map = new Map();
    game.ghosts.forEach((ghost) => {
      map.set(toKey(ghost.x, ghost.y), ghost);
    });
    return map;
  }, [game.ghosts]);

  const statusLabel =
    game.status === "won"
      ? "You cleared the maze!"
      : game.status === "lost"
        ? "Game over. Ghosts got you."
        : game.status === "ready"
          ? "Press arrow keys or WASD to start or resume"
          : "Use arrow keys or WASD";

  return (
    <main className="page">
      <section className="game-shell">
        <header className="hud">
          <h1>Pac-Man</h1>
          <div className="stats">
            <span>Score: {game.score}</span>
            <span>Lives: {game.lives}</span>
          </div>
          <p>{statusLabel}</p>
          <button type="button" onClick={() => setGame(createInitialState())}>
            Restart
          </button>
        </header>

        <div
          className="maze"
          style={{
            gridTemplateColumns: `repeat(${MAZE.cols}, 1fr)`,
          }}
        >
          {Array.from({ length: MAZE.rows * MAZE.cols }, (_, index) => {
            const x = index % MAZE.cols;
            const y = Math.floor(index / MAZE.cols);
            const key = toKey(x, y);
            const isWall = MAZE.walls.has(key);
            const hasPellet = game.pellets.has(key);
            const ghost = ghostPositionMap.get(key);
            const hasPacman = game.pacman.x === x && game.pacman.y === y;

            return (
              <div className={`cell ${isWall ? "wall" : "path"}`} key={key}>
                {hasPellet && (
                  <span
                    className={`pellet ${MAZE.powerPellets.has(key) ? "power" : ""}`}
                  />
                )}
                {ghost && (
                  <span className="ghost" style={{ background: ghost.color }}>
                    {ghost.label[0]}
                  </span>
                )}
                {hasPacman && <span className="pacman" />}
              </div>
            );
          })}
        </div>

        <footer className="legend">
          {MAZE.ghostStarts.map((ghost) => (
            <div key={ghost.id} className="legend-item">
              <span className="legend-dot" style={{ background: ghost.color }} />
              <span>
                {ghost.label}: {ghost.personality}
              </span>
            </div>
          ))}
        </footer>
      </section>
    </main>
  );
}
