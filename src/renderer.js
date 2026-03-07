const canvas = document.getElementById("paintCanvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

const strokeColorInput = document.getElementById("strokeColor");
const fillColorInput = document.getElementById("fillColor");
const sizeRange = document.getElementById("sizeRange");
const sizeValue = document.getElementById("sizeValue");
const fillShapesCheckbox = document.getElementById("fillShapes");
const toolStatus = document.getElementById("toolStatus");
const coordsStatus = document.getElementById("coordsStatus");

const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const newBtn = document.getElementById("newBtn");
const saveBtn = document.getElementById("saveBtn");
const openBtn = document.getElementById("openBtn");
const openInput = document.getElementById("openInput");

const toolButtons = [...document.querySelectorAll(".tool")];

const MAX_HISTORY = 35;
const toolNames = {
  pencil: "Pencil",
  brush: "Brush",
  eraser: "Eraser",
  line: "Line",
  rectangle: "Rectangle",
  circle: "Circle",
  bucket: "Fill",
};

let activeTool = "pencil";
let drawing = false;
let startX = 0;
let startY = 0;
let lastX = 0;
let lastY = 0;
let shapeSnapshot = null;
let undoStack = [];
let redoStack = [];

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.max(0, Math.min(canvas.width - 1, Math.floor(event.clientX - rect.left)));
  const y = Math.max(0, Math.min(canvas.height - 1, Math.floor(event.clientY - rect.top)));
  return { x, y };
}

function rgbaFromHex(hex) {
  const cleanHex = hex.replace("#", "");
  const value = Number.parseInt(cleanHex, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
    a: 255,
  };
}

function colorsEqual(data, index, color) {
  return (
    data[index] === color.r &&
    data[index + 1] === color.g &&
    data[index + 2] === color.b &&
    data[index + 3] === color.a
  );
}

function fillCanvasWhite() {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function configureStroke(toolOverride) {
  const tool = toolOverride || activeTool;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (tool === "eraser") {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Number(sizeRange.value) * 2;
    ctx.globalCompositeOperation = "source-over";
    return;
  }

  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = strokeColorInput.value;
  ctx.lineWidth = tool === "brush" ? Number(sizeRange.value) * 2 : Number(sizeRange.value);
}

function updateStatus() {
  toolStatus.textContent = `Tool: ${toolNames[activeTool]}`;
}

function setActiveTool(nextTool) {
  activeTool = nextTool;
  toolButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === nextTool);
  });
  updateStatus();
}

function snapshotState() {
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function pushUndoState({ clearRedo = true } = {}) {
  undoStack.push(snapshotState());
  if (undoStack.length > MAX_HISTORY) {
    undoStack.shift();
  }
  if (clearRedo) {
    redoStack = [];
  }
  updateHistoryButtons();
}

function restoreImageData(imageData) {
  ctx.putImageData(imageData, 0, 0);
}

function undo() {
  if (undoStack.length <= 1) {
    return;
  }
  const current = undoStack.pop();
  redoStack.push(current);
  restoreImageData(undoStack[undoStack.length - 1]);
  updateHistoryButtons();
}

function redo() {
  if (redoStack.length === 0) {
    return;
  }
  const state = redoStack.pop();
  undoStack.push(state);
  restoreImageData(state);
  updateHistoryButtons();
}

function updateHistoryButtons() {
  undoBtn.disabled = undoStack.length <= 1;
  redoBtn.disabled = redoStack.length === 0;
}

function resizeCanvasPreservingContent() {
  const parent = canvas.parentElement;
  const oldCanvas = document.createElement("canvas");
  oldCanvas.width = canvas.width || 1;
  oldCanvas.height = canvas.height || 1;
  oldCanvas.getContext("2d").drawImage(canvas, 0, 0);

  const parentRect = parent.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(parentRect.width));
  canvas.height = Math.max(1, Math.floor(parentRect.height));

  fillCanvasWhite();
  ctx.drawImage(oldCanvas, 0, 0);

  pushUndoState({ clearRedo: false });
}

function clearCanvasAndResetHistory() {
  fillCanvasWhite();
  undoStack = [];
  redoStack = [];
  pushUndoState();
}

function startFreehand(x, y) {
  configureStroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
  lastX = x;
  lastY = y;
}

function drawFreehand(x, y) {
  configureStroke();
  ctx.lineTo(x, y);
  ctx.stroke();
  lastX = x;
  lastY = y;
}

function drawShape(tool, x1, y1, x2, y2) {
  configureStroke(tool);

  const w = x2 - x1;
  const h = y2 - y1;
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const width = Math.abs(w);
  const height = Math.abs(h);

  if (tool === "line") {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    return;
  }

  if (tool === "rectangle") {
    if (fillShapesCheckbox.checked) {
      ctx.fillStyle = fillColorInput.value;
      ctx.fillRect(left, top, width, height);
    }
    ctx.strokeRect(left, top, width, height);
    return;
  }

  if (tool === "circle") {
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const radiusX = width / 2;
    const radiusY = height / 2;

    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    if (fillShapesCheckbox.checked) {
      ctx.fillStyle = fillColorInput.value;
      ctx.fill();
    }
    ctx.stroke();
  }
}

function floodFill(startXPoint, startYPoint, colorHex) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width } = imageData;
  const targetIndex = (startYPoint * width + startXPoint) * 4;
  const fillColor = rgbaFromHex(colorHex);
  const targetColor = {
    r: data[targetIndex],
    g: data[targetIndex + 1],
    b: data[targetIndex + 2],
    a: data[targetIndex + 3],
  };

  if (
    targetColor.r === fillColor.r &&
    targetColor.g === fillColor.g &&
    targetColor.b === fillColor.b &&
    targetColor.a === fillColor.a
  ) {
    return;
  }

  const stack = [[startXPoint, startYPoint]];
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
      continue;
    }

    const index = (y * width + x) * 4;
    if (!colorsEqual(data, index, targetColor)) {
      continue;
    }

    data[index] = fillColor.r;
    data[index + 1] = fillColor.g;
    data[index + 2] = fillColor.b;
    data[index + 3] = fillColor.a;

    stack.push([x + 1, y]);
    stack.push([x - 1, y]);
    stack.push([x, y + 1]);
    stack.push([x, y - 1]);
  }

  ctx.putImageData(imageData, 0, 0);
}

function handlePointerDown(event) {
  if (event.button !== 0) {
    return;
  }

  const { x, y } = getCanvasPoint(event);
  startX = x;
  startY = y;
  drawing = true;

  if (activeTool === "bucket") {
    floodFill(x, y, fillColorInput.value);
    pushUndoState();
    drawing = false;
    return;
  }

  if (activeTool === "pencil" || activeTool === "brush" || activeTool === "eraser") {
    startFreehand(x, y);
    return;
  }

  shapeSnapshot = snapshotState();
}

function handlePointerMove(event) {
  const { x, y } = getCanvasPoint(event);
  coordsStatus.textContent = `x: ${x}, y: ${y}`;

  if (!drawing) {
    return;
  }

  if (activeTool === "pencil" || activeTool === "brush" || activeTool === "eraser") {
    drawFreehand(x, y);
    return;
  }

  if (shapeSnapshot) {
    restoreImageData(shapeSnapshot);
  }
  drawShape(activeTool, startX, startY, x, y);
}

function handlePointerUp(event) {
  if (!drawing) {
    return;
  }

  drawing = false;
  const { x, y } = getCanvasPoint(event);

  if (activeTool === "pencil" || activeTool === "brush" || activeTool === "eraser") {
    drawFreehand(x, y);
    ctx.beginPath();
    pushUndoState();
    return;
  }

  if (activeTool !== "bucket") {
    if (shapeSnapshot) {
      restoreImageData(shapeSnapshot);
    }
    drawShape(activeTool, startX, startY, x, y);
    shapeSnapshot = null;
    pushUndoState();
  }
}

function saveCanvasAsPng() {
  const link = document.createElement("a");
  const now = new Date().toISOString().replace(/[:.]/g, "-");
  link.download = `paint-${now}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function openImageFromFile(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const image = new Image();
    image.onload = () => {
      fillCanvasWhite();
      const fitScale = Math.min(canvas.width / image.width, canvas.height / image.height);
      const drawWidth = Math.floor(image.width * fitScale);
      const drawHeight = Math.floor(image.height * fitScale);
      const dx = Math.floor((canvas.width - drawWidth) / 2);
      const dy = Math.floor((canvas.height - drawHeight) / 2);
      ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
      pushUndoState();
    };
    image.src = String(event.target?.result || "");
  };
  reader.readAsDataURL(file);
}

toolButtons.forEach((button) => {
  button.addEventListener("click", () => setActiveTool(button.dataset.tool));
});

sizeRange.addEventListener("input", () => {
  sizeValue.textContent = sizeRange.value;
});

undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);
newBtn.addEventListener("click", clearCanvasAndResetHistory);
saveBtn.addEventListener("click", saveCanvasAsPng);
openBtn.addEventListener("click", () => openInput.click());
openInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  openImageFromFile(file);
  openInput.value = "";
});

canvas.addEventListener("pointerdown", handlePointerDown);
canvas.addEventListener("pointermove", handlePointerMove);
canvas.addEventListener("pointerup", handlePointerUp);
canvas.addEventListener("pointerleave", handlePointerUp);
window.addEventListener("pointerup", handlePointerUp);

window.addEventListener("resize", () => {
  resizeCanvasPreservingContent();
});

window.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.key.toLowerCase() === "z") {
    event.preventDefault();
    if (event.shiftKey) {
      redo();
    } else {
      undo();
    }
  }

  if (event.ctrlKey && event.key.toLowerCase() === "y") {
    event.preventDefault();
    redo();
  }

  if (event.ctrlKey && event.key.toLowerCase() === "s") {
    event.preventDefault();
    saveCanvasAsPng();
  }

  if (event.ctrlKey && event.key.toLowerCase() === "n") {
    event.preventDefault();
    clearCanvasAndResetHistory();
  }
});

resizeCanvasPreservingContent();
clearCanvasAndResetHistory();
updateStatus();
sizeValue.textContent = sizeRange.value;
