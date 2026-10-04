/**
 * 范例介绍：模拟一条捕获流进入下游处理，演示录制体积、抽帧成本与「用户停止共享」的收尾。
 * 输入（读者控件）：源帧率 fps、videoBitsPerSecond（kbps）、是否带音轨、抽帧节奏、共享是否仍在进行。
 * 主要操作：调节控件观察读数变化；关掉「共享中」模拟用户点浏览器自带的停止共享。
 * 预期结果：体积按 (视频码率 + 音轨 128kbps) × 时长线性累积；抽帧张数只随抽帧节奏增长；
 *          停止共享后状态回到 inactive、最后一块落库，重新打开共享即开始一段新录制。
 * 阅读主线：左侧为被捕获画面，右上为抽帧缩略图，右下为 1 秒一个的录制分块，底部读数为累计结论。
 */
import {
  createRenderLoop,
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type ExtractMode = 'none' | 'every-frame' | 'every-500ms';

export interface RecordingOptions {
  fps: number;
  bitrate: number;
  audio: boolean;
  extract: ExtractMode;
  shared: boolean;
}

export interface RecordingSnapshot {
  state: string;
  elapsed: string;
  volume: string;
  perSecond: string;
  extracted: string;
  cost: string;
}

export interface RecordingInstance {
  update(options: RecordingOptions): void;
  dispose(): void;
}

interface Thumb {
  hue: number;
  offset: number;
}

const CHUNK_SECONDS = 1;
const AUDIO_KBPS = 128;
const MAX_THUMBS = 12;

function formatSize(kb: number): string {
  if (kb < 1024) {
    return `${kb.toFixed(0)} KB`;
  }
  return `${(kb / 1024).toFixed(2)} MB`;
}

export function createRecordingExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: RecordingSnapshot) => void,
): RecordingInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: RecordingOptions = {
    fps: 30,
    bitrate: 2500,
    audio: true,
    extract: 'every-frame',
    shared: true,
  };

  let elapsed = 0;
  let extracted = 0;
  let chunks: number[] = [];
  let finalChunk: number | null = null;
  let lastChunkAt = 0;
  let extractAcc = 0;
  let timeAcc = 0;
  let thumbs: Thumb[] = [];

  function ratePerSecond(): number {
    return (current.bitrate + (current.audio ? AUDIO_KBPS : 0)) / 8;
  }

  function volume(): number {
    const sum = chunks.reduce((total, size) => total + size, 0);
    return sum + (finalChunk ?? 0);
  }

  function reset() {
    elapsed = 0;
    extracted = 0;
    chunks = [];
    finalChunk = null;
    lastChunkAt = 0;
    extractAcc = 0;
    timeAcc = 0;
    thumbs = [];
  }

  function pushThumb() {
    thumbs.push({
      hue: (elapsed * 47 + extracted * 23) % 360,
      offset: (elapsed * 90) % 100,
    });
    if (thumbs.length > MAX_THUMBS) {
      thumbs.shift();
    }
  }

  function advance(delta: number) {
    elapsed += delta;

    if (current.extract === 'every-frame') {
      extractAcc += current.fps * delta;
      while (extractAcc >= 1) {
        extractAcc -= 1;
        extracted += 1;
        pushThumb();
      }
    } else if (current.extract === 'every-500ms') {
      timeAcc += delta;
      while (timeAcc >= 0.5) {
        timeAcc -= 0.5;
        extracted += 1;
        pushThumb();
      }
    }

    while (elapsed - lastChunkAt >= CHUNK_SECONDS) {
      lastChunkAt += CHUNK_SECONDS;
      chunks.push(ratePerSecond() * CHUNK_SECONDS);
    }
  }

  function stopSharing() {
    const partial = elapsed - lastChunkAt;
    if (partial > 0.15) {
      finalChunk = ratePerSecond() * partial;
      lastChunkAt = elapsed;
    }
  }

  function mainThreadCost(): string {
    if (current.extract === 'none') {
      return '无（不抽帧）';
    }
    if (current.extract === 'every-500ms') {
      return '低：每 500ms 一次';
    }
    return current.fps >= 45
      ? `高：每帧 drawImage（${current.fps}fps 接近满载）`
      : `中：每帧 drawImage（${current.fps}fps）`;
  }

  function drawScene(x: number, y: number, width: number, height: number) {
    const gradient = drawingContext.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, '#1e293b');
    drawingContext.fillStyle = gradient;
    drawingContext.fillRect(x, y, width, height);

    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(x, y, width, height);
    drawingContext.clip();

    const colors = ['#38bdf8', '#f472b6', '#facc15'];
    colors.forEach((color, index) => {
      const phase = elapsed * 0.9 + index * 2.1;
      const cx = x + width * (0.25 + 0.5 * (0.5 + 0.5 * Math.sin(phase)));
      const cy = y + height * (0.3 + 0.4 * (0.5 + 0.5 * Math.cos(phase * 0.8)));
      drawingContext.beginPath();
      drawingContext.fillStyle = color;
      drawingContext.globalAlpha = 0.85;
      drawingContext.arc(cx, cy, Math.min(width, height) * 0.13, 0, Math.PI * 2);
      drawingContext.fill();
    });
    drawingContext.globalAlpha = 1;

    const playhead = x + ((elapsed * 60) % width);
    drawingContext.fillStyle = 'rgba(255,255,255,0.55)';
    drawingContext.fillRect(playhead, y, 1.5, height);

    drawingContext.restore();

    if (!current.shared) {
      drawingContext.fillStyle = 'rgba(15,23,42,0.72)';
      drawingContext.fillRect(x, y, width, height);
      drawingContext.fillStyle = '#f8fafc';
      drawingContext.font = '600 14px ui-sans-serif, system-ui, sans-serif';
      drawingContext.textAlign = 'center';
      drawingContext.fillText(
        '流已结束：用户点了浏览器自带的「停止共享」',
        x + width / 2,
        y + height / 2 - 8,
      );
      drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(
        '重新打开「共享中」即开始一段新录制',
        x + width / 2,
        y + height / 2 + 16,
      );
    }
  }

  function drawThumbStrip(x: number, y: number, width: number) {
    drawingContext.fillStyle = '#475569';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.textAlign = 'left';
    drawingContext.fillText(`抽帧缩略图（${extracted} 张）`, x, y);

    const size = 26;
    const gap = 6;
    const count = Math.min(MAX_THUMBS, Math.floor((width + gap) / (size + gap)));
    const visible = thumbs.slice(-count);
    visible.forEach((thumb, index) => {
      const tx = x + index * (size + gap);
      const ty = y + 8;
      drawingContext.fillStyle = `hsl(${thumb.hue}, 65%, 55%)`;
      drawingContext.fillRect(tx, ty, size, size);
      drawingContext.beginPath();
      drawingContext.fillStyle = `hsl(${(thumb.hue + 40) % 360}, 85%, 78%)`;
      drawingContext.arc(
        tx + size * (0.3 + (thumb.offset / 100) * 0.4),
        ty + size * 0.5,
        size * 0.16,
        0,
        Math.PI * 2,
      );
      drawingContext.fill();
    });
    return y + 8 + size;
  }

  function drawChunkStrip(
    x: number,
    y: number,
    width: number,
    baseline: number,
  ) {
    drawingContext.fillStyle = '#475569';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.textAlign = 'left';
    drawingContext.fillText(
      `MediaRecorder 分块（${CHUNK_SECONDS}s × ${chunks.length}）`,
      x,
      y,
    );

    const barWidth = 14;
    const gap = 6;
    const maxHeight = Math.max(24, baseline - y - 16);
    const maxSize = Math.max(
      ratePerSecond() * CHUNK_SECONDS,
      ...chunks,
      finalChunk ?? 0,
      1,
    );
    const total = chunks.length + (finalChunk ? 1 : 0);
    const count = Math.min(
      MAX_THUMBS,
      Math.floor((width + gap) / (barWidth + gap)),
    );

    const start = Math.max(0, total - count);
    for (let index = start; index < total; index += 1) {
      const isFinal = index === chunks.length;
      const size = isFinal ? (finalChunk ?? 0) : chunks[index];
      const height = Math.max(2, (size / maxSize) * maxHeight);
      const bx = x + (index - start) * (barWidth + gap);
      drawingContext.fillStyle = isFinal ? '#f59e0b' : '#4f7cff';
      drawingContext.fillRect(bx, baseline - height, barWidth, height);
    }
    return baseline;
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 17px ui-sans-serif, system-ui, sans-serif';
    drawingContext.textAlign = 'left';
    drawingContext.fillText('捕获流 → 抽帧 / 录制（模拟）', 24, 56);
    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.textAlign = 'right';
    drawingContext.fillText(
      '体积按码率线性估算，真实体积随内容复杂度波动',
      width - 24,
      56,
    );

    const contentBottom = height - 148;
    const frameWidth = Math.max(200, Math.min(300, (width - 48) * 0.46));
    const frameX = 24;
    const frameY = 74;
    const frameHeight = Math.max(120, contentBottom - frameY);
    drawScene(frameX, frameY, frameWidth, frameHeight);

    const rightX = frameX + frameWidth + 20;
    const rightWidth = Math.max(120, width - 24 - rightX);
    const thumbBottom = drawThumbStrip(rightX, frameY + 12, rightWidth);
    drawChunkStrip(rightX, thumbBottom + 34, rightWidth, contentBottom);

    emit({
      state: current.shared ? 'recording' : 'inactive',
      elapsed: `${elapsed.toFixed(1)} s`,
      volume: formatSize(volume()),
      perSecond: `${formatSize(ratePerSecond())}/s`,
      extracted: `${extracted} 张`,
      cost: mainThreadCost(),
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);
  const renderLoop = createRenderLoop(canvas, (delta: number) => {
    if (current.shared) {
      advance(delta);
    }
    draw();
  });

  let previousShared = current.shared;

  return {
    update(options) {
      const startedSharing = !previousShared && options.shared;
      const endedSharing = previousShared && !options.shared;
      current = options;
      previousShared = options.shared;

      if (startedSharing) {
        reset();
      }
      if (endedSharing) {
        stopSharing();
      }
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
      renderLoop.dispose();
    },
  };
}
