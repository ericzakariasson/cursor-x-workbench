import test from "node:test";
import assert from "node:assert/strict";

import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  buildInitialState,
  clearCompletedLines,
  createEmptyBoard,
  settleCurrentPiece
} from "./tetris-core.js";

test("clearCompletedLines removes exactly one full row", () => {
  const board = createEmptyBoard();
  board[BOARD_HEIGHT - 1] = Array(BOARD_WIDTH).fill("#fff");
  board[BOARD_HEIGHT - 2][0] = "#abc";

  const result = clearCompletedLines(board);

  assert.equal(result.linesCleared, 1);
  assert.deepEqual(result.board[BOARD_HEIGHT - 1][0], "#abc");
  assert.ok(result.board[0].every((cell) => cell === null));
});

test("clearCompletedLines removes multiple rows and keeps partial rows", () => {
  const board = createEmptyBoard();
  board[BOARD_HEIGHT - 1] = Array(BOARD_WIDTH).fill("#111");
  board[BOARD_HEIGHT - 2] = Array(BOARD_WIDTH).fill("#222");
  board[BOARD_HEIGHT - 3][3] = "#333";

  const result = clearCompletedLines(board);

  assert.equal(result.linesCleared, 2);
  assert.equal(result.board[BOARD_HEIGHT - 1][3], "#333");
  assert.ok(result.board[0].every((cell) => cell === null));
  assert.ok(result.board[1].every((cell) => cell === null));
});

test("settleCurrentPiece sets game over when lock occurs above top row", () => {
  const state = buildInitialState();
  state.running = true;
  state.gameOver = false;
  state.current = {
    type: "O",
    matrix: [
      [1, 1],
      [1, 1]
    ],
    row: -1,
    col: 4
  };
  state.next = {
    type: "I",
    matrix: [[1, 1, 1, 1]],
    row: -1,
    col: 3
  };
  state.board[0][4] = "#block";
  state.board[0][5] = "#block";

  const nextState = settleCurrentPiece(state);

  assert.equal(nextState.gameOver, true);
  assert.equal(nextState.running, false);
});
