/**
 * 范例：automatic-speech-recognition 管线——音频输入、language/task 选项、
 * return_timestamps 分段输出与长音频 chunking 的完整行为。
 *
 * - 前置状态：首次运行按目标模型从 Hub 下载 q8 权重（whisper-tiny.en 与
 *   多语的 whisper-tiny 各约 41 MB），写入浏览器 Cache 后二次加载显著变快。
 * - 输入：Controls 的 示例音频 / 任务 / 语言 / 返回时间戳 / 长音频分段。
 *   任务选 translate 或指定语言时自动换用多语模型——.en 模型不接受这两项
 *   （传了会直接抛错，v4.3.0 源码行为）。
 * - 操作：等「状态」变为 就绪 后切换选项重新推理；右下角 audio 播放器可对照听
 *   原文件（你听到的是原采样率，模型吃的是重采样后的 16 kHz 数据）。
 * - 预期结果：画布绘制模型实际输入的 16 kHz 波形（开启时间戳时叠加 chunks 分段条）
 *   与转写文本；读数给出模型、音频时长、推理耗时与 chunks 段数。
 * - 阅读主线：resolveModel（.en 与多语模型选择）→ ensureAudio（load_audio 解码重采样）
 *   → getPipe（加载与 progress_callback）→ transcribe（推理选项拼装）→ draw（波形与文本渲染）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// Storybook 工作区未安装 npm 包，这里按官方 README 的 CDN 用法加载浏览器构建；
// npm 项目请改用：import { pipeline, load_audio } from '@huggingface/transformers'
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

// Whisper 模型族中用于演示的两个官方仓库：
// - MODEL_EN 仅英语，是 automatic-speech-recognition 任务的库默认模型；
//   解码前缀里没有语言/任务 token，传 language 或 task 会直接抛错。
// - MODEL_MULTI 多语：generation_config 里带 99 种语言的 lang_to_id 与
//   task_to_id（transcribe / translate），language 与 task 只在它上面生效。
const MODEL_EN = 'Xenova/whisper-tiny.en';
const MODEL_MULTI = 'Xenova/whisper-tiny';

// Whisper 要求输入 16 kHz 单声道；load_audio 负责把任意采样率的音频重采样到这个值
const SAMPLING_RATE = 16000;

export type AsrStatus = 'loading' | 'running' | 'ready' | 'error';

export interface AsrOptions {
  audioUrl: string;
  task: 'transcribe' | 'translate';
  /** '' 表示不指定（源码行为：多语模型警告并默认按英语处理） */
  language: string;
  returnTimestamps: boolean;
  chunked: boolean;
}

export interface AsrSnapshot {
  status: AsrStatus;
  message: string;
  modelId: string | null;
  audioInfo: string | null;
  elapsed: string | null;
  chunkInfo: string | null;
}

export interface AsrInstance {
  update(options: AsrOptions): void;
  dispose(): void;
}

/** pipeline 推理函数的最小形态：传 Float32Array 音频与选项，返回未细究的输出 */
type AsrPipe = (
  audio: Float32Array,
  options?: Record<string, unknown>,
) => Promise<unknown>;

interface AsrChunk {
  timestamp?: [number, number];
  text?: string;
}

interface TransformersLib {
  pipeline: (
    task: string,
    model: string,
    options?: Record<string, unknown>,
  ) => Promise<AsrPipe>;
  load_audio: (url: string, sampling_rate: number) => Promise<Float32Array>;
}

export function createSpeechRecognition(
  canvas: HTMLCanvasElement,
  emit: (snapshot: AsrSnapshot) => void,
): AsrInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  // 舞台右下角嵌一个 audio 播放器：播放的是原始文件，与波形（模型实际输入）对照听
  const stage = canvas.parentElement as HTMLElement;
  const audioPlayer = document.createElement('audio');
  audioPlayer.controls = true;
  audioPlayer.preload = 'metadata';
  audioPlayer.style.cssText =
    'position:absolute;right:12px;bottom:12px;width:280px;max-width:45%;';
  stage.append(audioPlayer);

  let current: AsrOptions = {
    audioUrl:
      'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav',
    task: 'transcribe',
    language: '',
    returnTimestamps: false,
    chunked: false,
  };

  let status: AsrStatus = 'loading';
  let message = '正在从 CDN 加载库…';
  let loadPhase: 'audio' | 'model' | null = null;
  let downloadProgress = 0;
  let modelId: string | null = null;
  let audioData: Float32Array | null = null;
  let loadedAudioUrl: string | null = null;
  let audioPromise: Promise<Float32Array> | null = null;
  let audioPromiseUrl: string | null = null;
  let elapsed: string | null = null;
  let text: string | null = null;
  let chunks: AsrChunk[] | null = null;
  let disposed = false;
  let runToken = 0;

  // 管线实例按模型 ID 缓存：tiny.en 与多语 tiny 是两个仓库，各自只加载一次
  const pipes = new Map<string, AsrPipe>();
  const pendingPipes = new Map<string, Promise<AsrPipe>>();

  // .en 模型不接受 language/task（会直接抛错）；translate 或指定语言 → 必须用多语模型
  function resolveModel(options: AsrOptions): string {
    const multilingual = options.task === 'translate' || options.language !== '';
    return multilingual ? MODEL_MULTI : MODEL_EN;
  }

  let libPromise: Promise<TransformersLib> | null = null;
  function getLib(): Promise<TransformersLib> {
    libPromise ??= import(
      /* @vite-ignore */ TRANSFORMERS_CDN
    ) as Promise<TransformersLib>;
    return libPromise;
  }

  async function getPipe(
    target: string,
    onProgress: (percent: number) => void,
  ): Promise<AsrPipe> {
    const cached = pipes.get(target);
    if (cached) {
      return cached;
    }
    let pending = pendingPipes.get(target);
    if (!pending) {
      pending = (async () => {
        const mod = await getLib();
        // 实例只创建一次：任务名 + 模型 ID + progress_callback；
        // dtype/device 不传，按环境默认——浏览器 WASM 下即 q8 档位
        const pipe = await mod.pipeline(
          'automatic-speech-recognition',
          target,
          {
            progress_callback: (info: { status?: string; progress?: number }) => {
              // 事件流：单文件 progress 与 v4 聚合的 progress_total 都带 0~100 百分比
              if (
                info.status === 'progress' ||
                info.status === 'progress_total'
              ) {
                onProgress(Math.round(info.progress ?? 0));
              }
            },
          },
        );
        pipes.set(target, pipe);
        pendingPipes.delete(target);
        return pipe;
      })();
      pendingPipes.set(target, pending);
      pending.catch(() => pendingPipes.delete(target));
    }
    return pending;
  }

  // 音频按 URL 缓存：切选项不重新下载；load_audio 把 URL 解码并重采样为 16 kHz 单声道
  async function ensureAudio(): Promise<Float32Array> {
    if (audioData && loadedAudioUrl === current.audioUrl) {
      return audioData;
    }
    if (!audioPromise || audioPromiseUrl !== current.audioUrl) {
      const url = current.audioUrl;
      audioPromiseUrl = url;
      // 清掉上一段音频的结果，让「状态」读数如实反映正在加载
      status = 'loading';
      text = null;
      chunks = null;
      loadPhase = 'audio';
      message = '正在加载音频：解码并重采样为 16 kHz 单声道 Float32Array…';
      draw();
      audioPromise = getLib()
        .then((mod) => mod.load_audio(url, SAMPLING_RATE))
        .then((data) => {
          audioData = data;
          loadedAudioUrl = url;
          return data;
        })
        .catch((error) => {
          audioPromise = null;
          throw error;
        });
    }
    return audioPromise;
  }

  async function transcribe() {
    if (disposed) {
      return;
    }
    const runId = ++runToken;
    try {
      // ① 音频输入：URL → load_audio → 16 kHz 单声道 Float32Array（PCM 采样值）
      const audio = await ensureAudio();
      if (disposed || runId !== runToken) {
        return;
      }

      // ② 模型选择：translate 或指定语言 → 多语模型（首次多一次约 41 MB 下载）
      const target = resolveModel(current);
      const pipe = await getPipe(target, (percent) => {
        if (disposed || runId !== runToken) {
          return;
        }
        loadPhase = 'model';
        downloadProgress = percent;
        message = `正在加载 ${target}（q8 约 41 MB，仅首次）：${percent}%`;
        draw();
      });
      if (disposed || runId !== runToken) {
        return;
      }
      modelId = target;

      // ③ 选项拼装：language/task 只在多语模型上有效（task 默认 transcribe）；
      //    return_timestamps 开启后输出多出 chunks；chunk_length_s 启用滑窗分段
      const options: Record<string, unknown> = {};
      if (target === MODEL_MULTI) {
        if (current.language) {
          options.language = current.language;
        }
        options.task = current.task;
      }
      if (current.returnTimestamps) {
        options.return_timestamps = true;
      }
      if (current.chunked) {
        options.chunk_length_s = 30; // 每窗 30 秒
        options.stride_length_s = 5; // 相邻窗重叠 5 秒（官方示例取值）
      }

      status = 'running';
      text = null;
      chunks = null;
      message = '推理中…（生成式任务，逐 token 解码）';
      draw();

      const startedAt = performance.now();
      const output = await pipe(audio, options);
      if (disposed || runId !== runToken) {
        return;
      }

      // ④ 输出：{ text }；开 return_timestamps 后多出 chunks: [{ timestamp: [起, 止], text }]
      const result = (output ?? {}) as { text?: unknown; chunks?: unknown };
      text = typeof result.text === 'string' ? result.text : '';
      chunks = Array.isArray(result.chunks) ? (result.chunks as AsrChunk[]) : null;
      elapsed = ((performance.now() - startedAt) / 1000).toFixed(1);
      status = 'ready';
      message = '推理完成；切换选项可再次推理（管线实例已复用）';
      draw();
    } catch (error) {
      if (disposed || runId !== runToken) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `音频加载或推理失败：${detail}。常见原因：网络受限（huggingface.co / cdn.jsdelivr.net），或给 .en 模型传了 language/task（应改用多语模型）。`;
      draw();
    }
  }

  function snapshot(): AsrSnapshot {
    return {
      status,
      message,
      modelId,
      audioInfo: audioData
        ? `${fileName(current.audioUrl)} · ${(audioData.length / SAMPLING_RATE).toFixed(1)} 秒 · Float32Array(${audioData.length.toLocaleString('en-US')} 采样)`
        : null,
      elapsed: elapsed ? `${elapsed} 秒` : null,
      chunkInfo: !current.returnTimestamps
        ? '未开启'
        : chunks
          ? `chunks ${chunks.length} 段`
          : '等待推理…',
    };
  }

  function fileName(url: string): string {
    return url.split('/').pop() ?? url;
  }

  // canvas 只画图形状态；readout 表依赖 emit 送出的快照，必须与重绘同步派发
  function draw() {
    render();
    emit(snapshot());
  }

  function render() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const contentWidth = width - 96;
    const x0 = 48;
    const x1 = width - 48;

    // 标题：当前模型 + 本次推理的选项拼装（与 Show code 中 options 的拼装逻辑一致）
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(modelId ?? 'automatic-speech-recognition', 48, 38);
    drawingContext.fillStyle = '#475569';
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      `task=${current.task} · language=${current.language || '(未指定)'} · return_timestamps=${current.returnTimestamps} · chunk_length_s=${current.chunked ? '30(stride 5)' : '0'}`,
      48,
      60,
    );

    // 波形 = 模型实际吃到的 16 kHz Float32Array；chunk 分段条叠在波形下方
    if (audioData) {
      drawWaveform(x0, x1, 74, 112);
      if (chunks && current.returnTimestamps) {
        drawChunkStrip(x0, x1, 126, 144);
      }
    }

    if (status === 'error') {
      drawingContext.fillStyle = '#b91c1c';
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(message, contentWidth).forEach((line, index) => {
        drawingContext.fillText(line, 48, 178 + index * 20);
      });
      return;
    }

    if (status === 'loading') {
      if (loadPhase === 'model') {
        // 首次运行的主要等待：模型下载。不接 progress_callback 时这个过程完全静默
        drawingContext.fillStyle = '#e2e8f0';
        drawingContext.fillRect(48, 172, contentWidth, 16);
        drawingContext.fillStyle = '#4f7cff';
        drawingContext.fillRect(
          48,
          172,
          (contentWidth * Math.min(100, downloadProgress)) / 100,
          16,
        );
      }
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(message, contentWidth).forEach((line, index) => {
        drawingContext.fillText(line, 48, 208 + index * 20);
      });
      return;
    }

    if (status === 'running' && text === null) {
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '14px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(message, 48, 180);
      return;
    }

    if (text !== null) {
      // 输出 { text }：Whisper 的文本常以空格开头、标点由模型生成，展示前自行处理
      const lines = wrapText(text, contentWidth);
      drawingContext.fillStyle = '#172033';
      drawingContext.font = '14px ui-sans-serif, system-ui, sans-serif';
      const maxLines = 5;
      lines.slice(0, maxLines).forEach((line, index) => {
        drawingContext.fillText(line, 48, 180 + index * 20);
      });
      drawingContext.fillStyle = '#5d6f67';
      drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      const suffix =
        lines.length > maxLines
          ? `…（共 ${text.length} 字符）`
          : `共 ${text.length} 字符`;
      drawingContext.fillText(suffix, 48, 180 + Math.min(lines.length, maxLines) * 20 + 4);
    }
  }

  // 按列取峰值把波形归一化到轨道高度；画的就是 load_audio 产出的那段 Float32Array
  function drawWaveform(x0: number, x1: number, top: number, bottom: number) {
    const data = audioData;
    if (!data) {
      return;
    }
    const mid = (top + bottom) / 2;
    const half = (bottom - top) / 2;
    const columns = Math.max(1, Math.floor(x1 - x0));
    const step = Math.max(1, Math.floor(data.length / columns));
    drawingContext.fillStyle = '#4f7cff';
    for (let column = 0; column < columns; column += 1) {
      const start = column * step;
      const end = Math.min(data.length, start + step);
      let peak = 0;
      for (let i = start; i < end; i += 1) {
        const value = Math.abs(data[i]);
        if (value > peak) {
          peak = value;
        }
      }
      const barHeight = Math.max(1, peak * half);
      drawingContext.fillRect(x0 + column, mid - barHeight, 1, barHeight * 2);
    }
    drawingContext.fillStyle = '#5d6f67';
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      `16 kHz 单声道 · ${data.length.toLocaleString('en-US')} 采样（load_audio 输出形态）`,
      x0,
      bottom + 14,
    );
  }

  // chunks 的段级时间戳按比例画在波形下方：每段一个色块，起点标注秒数
  function drawChunkStrip(x0: number, x1: number, top: number, bottom: number) {
    const duration = (audioData?.length ?? 0) / SAMPLING_RATE;
    if (!duration || !chunks) {
      return;
    }
    const span = x1 - x0;
    chunks.forEach((chunk, index) => {
      const [start, end] = chunk.timestamp ?? [0, 0];
      const sx = x0 + (start / duration) * span;
      const ex = x0 + (Math.min(end, duration) / duration) * span;
      drawingContext.fillStyle =
        index % 2 === 0 ? 'rgba(79, 124, 255, 0.30)' : 'rgba(79, 124, 255, 0.55)';
      drawingContext.fillRect(sx, top, Math.max(2, ex - sx), bottom - top);
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(`${start.toFixed(1)}s`, sx, bottom + 12);
    });
  }

  function wrapText(text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const char of text) {
      const candidate = line + char;
      if (line && drawingContext.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = char;
      } else {
        line = candidate;
      }
    }
    if (line) {
      lines.push(line);
    }
    return lines;
  }

  const resizeObserver = createResizeObserver(canvas, draw);
  audioPlayer.src = current.audioUrl;
  void transcribe();

  return {
    update(options) {
      const audioChanged = options.audioUrl !== current.audioUrl;
      const optionsChanged =
        options.task !== current.task ||
        options.language !== current.language ||
        options.returnTimestamps !== current.returnTimestamps ||
        options.chunked !== current.chunked;
      current = options;
      if (disposed) {
        return;
      }
      if (audioChanged) {
        // 换音频：播放器换源并清缓存，下次推理走 load_audio 重新加载
        audioPlayer.src = options.audioUrl;
        audioData = null;
        loadedAudioUrl = null;
      }
      if (audioChanged || optionsChanged || status === 'error') {
        // 换音频或选项只触发重新推理，不重建实例；出错后给一次重试机会
        void transcribe();
      } else {
        draw();
      }
    },
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
      // 离开页面时停播：audio 元素脱离 DOM 后不会自动暂停
      audioPlayer.pause();
      audioPlayer.removeAttribute('src');
      audioPlayer.load();
    },
  };
}
