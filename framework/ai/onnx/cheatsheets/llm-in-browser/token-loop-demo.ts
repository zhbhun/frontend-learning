/**
 * 范例：生成循环的状态机示意——prefill 与 decode 两阶段里 feeds 的逐 token 演化。
 * 机制示意，不是真实大模型：打分函数是一张写死的「下一个 token」转移表，不加载任何
 * 模型、不调用 onnxruntime；循环协议（feeds 组装、present 改名回喂 KV 缓存、argmax 选
 * token）与官方 chat 示例（microsoft/onnxruntime-inference-examples · js/chat · llm.js）
 * 同构，用来观察协议本身。
 * 操作：Controls 切换「循环操作」（重置 / 预填 prefill / 单步 decode / 自动生成）；
 * 点击画布执行一步（未预填时先预填，已结束则重置）。
 * 预期结果：
 *  - 预填一步吃进整个 prompt：input_ids [1,2]，两层 KV 缓存 seq 0 → 2，argmax 选出第一个 token；
 *  - 之后每步 input_ids 只有 [1,1]，attention_mask / position_ids 随序列增长，每层 KV seq +1，
 *    输出文本逐 token 生长；
 *  - 遇到 <eos> 循环结束、文本定格；「重置」后可再走一遍。
 * 阅读主线：performStep()（组装 feeds → 伪 run → argmax → present 改名回喂 past_key_values）；
 * 画布与读数属于演示外壳。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type TokenLoopAction = 'reset' | 'prefill' | 'step' | 'auto';

export const TOKEN_LOOP_ACTION_LABELS: Record<TokenLoopAction, string> = {
  reset: '重置',
  prefill: '预填 prefill',
  step: '单步 decode',
  auto: '自动生成',
};

// —— 玩具语料与写死的转移表：机制示意，不代表任何真实模型的权重 ——

const VOCAB = [
  '很久', '以前', '，', '海边', '有', '一座', '灯塔', '。', '它', '为', '船只', '指引', '方向', '。', '<eos>',
];
const EOS_ID = 14;
const PROMPT = [0, 1]; // 「很久 以前」

/** 写死的「下一个 token」表：由上一个 token id 决定下一个 id（真实模型这里是一份 logits）。 */
const NEXT: Record<number, number> = {
  0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10,
  10: 11, 11: 12, 12: 13, 13: 14, 14: 14,
};

/** 玩具会话的形状：2 层、单 KV 头、head_dim 4——只保留演示协议所需的最小结构。 */
const NUM_LAYERS = 2;
const AUTO_STEP_MS = 420;
const MAX_DRAWN_KV = 12;

interface Logits {
  dims: [number, number, number];
  data: Float32Array;
}

export interface TokenLoopSnapshot {
  stage: string;
  inputIds: string;
  attentionMask: string;
  positionIds: string;
  kvCache: string;
  lastToken: string;
  outputText: string;
}

export interface TokenLoopInstance {
  update(options: { action: TokenLoopAction }): void;
  dispose(): void;
}

/** 与官方示例 llm.js 的 argmax 同构：prefill 步 logits 是 [1, seq, vocab]，只扫最后一个位置。 */
function argmaxLast(logits: Logits): number {
  const [, seqLen, vocabSize] = logits.dims;
  const start = vocabSize * (seqLen - 1);
  let max = logits.data[start];
  let maxIndex = 0;
  for (let i = 0; i < vocabSize; ++i) {
    const value = logits.data[i + start];
    if (value > max) {
      max = value;
      maxIndex = i;
    }
  }
  return maxIndex;
}

/** 伪 run 的打分：按转移表指定胜者，其余给固定低分——argmax 因此「真的」在算。 */
function buildLogits(seqLen: number, winner: number): Logits {
  const data = new Float32Array(VOCAB.length);
  for (let i = 0; i < data.length; ++i) {
    data[i] = 1 + ((i * 5) % 7) * 0.3;
  }
  data[winner] = 9.4;
  return { dims: [1, seqLen, VOCAB.length], data };
}

export function createTokenLoop(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TokenLoopSnapshot) => void,
): TokenLoopInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let prefilled = false;
  let done = false;
  // 与 llm.js 相同口径：output_tokens 从 prompt 起算，生成 token 逐个追加。
  let tokens: number[] = [...PROMPT];
  let kvSeq = 0;
  let stepCount = 0;
  let inputLabel = '—';
  let maskLabel = '—';
  let positionLabel = '—';
  let lastTokenLabel = '—';
  let autoTimer = 0;
  let message = '切到「预填 prefill」或点击画布开始';
  let layout = { width: 620, height: 400 };

  function textOf(ids: number[]): string {
    return ids.map((id) => VOCAB[id]).join(' ');
  }

  function emitSnapshot(): void {
    const stage = !prefilled
      ? '未开始（下一步：prefill）'
      : done
        ? '已结束（命中 <eos>）'
        : `decode 第 ${stepCount - 1} 步`;
    emit({
      stage,
      inputIds: inputLabel,
      attentionMask: maskLabel,
      positionIds: positionLabel,
      kvCache: `2 层 × seq=${kvSeq}`,
      lastToken: lastTokenLabel,
      outputText: textOf(tokens),
    });
  }

  /** 一步 = 一次 run：组装 feeds → 伪 run（转移表出 logits）→ argmax → present 回喂。 */
  function performStep(): void {
    stopAuto();
    if (done) {
      message = '已到 <eos>：循环结束——切「重置」再走一遍';
      draw();
      emitSnapshot();
      return;
    }
    const inputLen = prefilled ? 1 : tokens.length;
    const inputIds = prefilled ? [tokens[tokens.length - 1]] : [...tokens];
    // attention_mask 长度 = 已缓存的 KV 长度 + 本步输入长度；prefill 位置 0..n-1，
    // decode 只标新 token 的 0 起始位置（= 已缓存 token 数）。
    const maskLen = kvSeq + inputLen;
    const positionIds = prefilled ? [kvSeq] : inputIds.map((_, index) => index);

    const winner = NEXT[inputIds[inputIds.length - 1]];
    const logits = buildLogits(inputLen, winner);
    const newToken = argmaxLast(logits); // 真实的 argmax 计算，打分表是假的

    // present.{i}.key/value → 改名为 past_key_values.{i}.key/value 回喂下一轮
    kvSeq += inputLen;
    tokens.push(newToken);
    prefilled = true;
    done = newToken === EOS_ID;
    stepCount += 1;

    inputLabel = `[1, ${inputLen}] 「${textOf(inputIds)}」`;
    maskLabel = `[1, ${maskLen}] 全 1`;
    positionLabel = `[${positionIds.join(',')}]`;
    lastTokenLabel = `「${VOCAB[newToken]}」（id ${newToken}）· argmax`;
    message = done ? '输出 <eos>：停止条件命中，循环退出' : '就绪——继续单步或自动生成';
    draw();
    emitSnapshot();
    emitSoon();
  }

  function reset(): void {
    stopAuto();
    prefilled = false;
    done = false;
    tokens = [...PROMPT];
    kvSeq = 0;
    stepCount = 0;
    inputLabel = '—';
    maskLabel = '—';
    positionLabel = '—';
    lastTokenLabel = '—';
    message = '已重置：切「预填 prefill」开始';
    draw();
    emitSnapshot();
    emitSoon();
  }

  function perform(action: TokenLoopAction): void {
    if (action === 'reset') {
      reset();
      return;
    }
    if (action === 'auto') {
      if (done) {
        reset();
      }
      if (!prefilled) {
        performStep();
      }
      stopAuto();
      autoTimer = window.setInterval(() => {
        if (done) {
          stopAuto();
          return;
        }
        performStep();
      }, AUTO_STEP_MS);
      message = '自动生成中…';
      draw();
      return;
    }
    // prefill / step 统一走「一步一次 run」：未预填时这步就是 prefill。
    performStep();
  }

  function stopAuto(): void {
    if (autoTimer !== 0) {
      window.clearInterval(autoTimer);
      autoTimer = 0;
    }
  }

  function draw(): void {
    const { width, height } = layout;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#172033';
    ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('生成循环：prefill 一次吃进 prompt，decode 每步 1 个 token', 28, 32);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('机制示意：打分表写死、不加载模型；循环协议与官方 chat 示例 llm.js 同构', 28, 54);

    // 左：本轮 feeds（下一步 run 的输入）。
    ctx.fillStyle = '#172033';
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('本轮 feeds（下一步 run 的输入）', 28, 92);
    const rows: Array<[string, string]> = [
      ['input_ids', inputLabel],
      ['attention_mask', maskLabel],
      ['position_ids', positionLabel],
      ['past_key_values', `2 层 × seq=${kvSeq}`],
    ];
    rows.forEach(([label, value], index) => {
      const y = 122 + index * 30;
      ctx.fillStyle = '#64748b';
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(label, 28, y);
      ctx.fillStyle = '#172033';
      ctx.fillText(truncate(value, 200), 160, y);
    });
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('首步喂 seq=0 的空 KV 张量；int64 用 BigInt64Array', 28, 122 + rows.length * 30);

    // 右：KV 缓存逐层生长 + present → past_key_values 的改名回喂。
    const panelX = 372;
    ctx.fillStyle = '#172033';
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('KV 缓存（每层 K/V 各一份）', panelX, 92);
    for (let layer = 0; layer < NUM_LAYERS; ++layer) {
      const y = 116 + layer * 44;
      ctx.fillStyle = '#64748b';
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(`layer ${layer}`, panelX, y + 13);
      const drawn = Math.min(kvSeq, MAX_DRAWN_KV);
      for (let i = 0; i < drawn; ++i) {
        ctx.beginPath();
        ctx.roundRect(panelX + 64 + i * 18, y, 15, 18, 3);
        ctx.fillStyle = '#dbe6ff';
        ctx.fill();
        ctx.strokeStyle = '#4f7cff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.fillStyle = '#172033';
      ctx.fillText(`seq=${kvSeq}`, panelX + 64 + MAX_DRAWN_KV * 18 + 8, y + 13);
    }
    ctx.fillStyle = '#475569';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('每轮输出 present.*.key/value', panelX, 216);
    ctx.fillStyle = '#4f7cff';
    ctx.fillText('↓ 改名 past_key_values.* 回喂下一轮（前文不重算）', panelX, 236);

    // 下：argmax 读数与逐 token 生长的输出文本。
    ctx.fillStyle = '#64748b';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('argmax(logits 最后一行) →', 28, 276);
    ctx.fillStyle = '#172033';
    ctx.fillText(lastTokenLabel, 232, 276);
    ctx.fillStyle = '#64748b';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('输出文本（逐 token 到达）', 28, 306);
    ctx.fillStyle = '#172033';
    ctx.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    wrapText(textOf(tokens), width - 56).forEach((line, index) => {
      ctx.fillText(line, 28, 332 + index * 24);
    });

    ctx.fillStyle = '#64748b';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('点击画布：执行一步（未预填时先预填，已结束则重置）', 28, height - 12);
  }

  function truncate(text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) {
      return text;
    }
    let result = text;
    while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
      result = result.slice(0, -1);
    }
    return `${result}…`;
  }

  function wrapText(text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const char of text) {
      if (ctx.measureText(line + char).width > maxWidth) {
        lines.push(line);
        line = char;
        if (lines.length >= 2) {
          return lines;
        }
      } else {
        line += char;
      }
    }
    if (line) {
      lines.push(line);
    }
    return lines;
  }

  function replay(): void {
    if (done) {
      reset();
      return;
    }
    performStep();
  }

  const resizeObserver = createResizeObserver(canvas, () => {
    const size = readCanvasSize(canvas);
    layout = {
      width: Math.max(620, size.width),
      height: 400,
    };
    draw();
  });
  layout = { width: Math.max(620, readCanvasSize(canvas).width), height: 400 };
  canvas.addEventListener('pointerdown', replay);

  // 共享外壳的读数有 100ms 节流：状态定格后补发一次，确保最终值被绘制。
  let emitTimer = 0;
  function emitSoon(): void {
    window.clearTimeout(emitTimer);
    emitTimer = window.setTimeout(() => {
      draw();
      emitSnapshot();
    }, 130);
  }

  draw();
  emitSnapshot();

  return {
    update(options) {
      perform(options.action);
    },
    dispose() {
      stopAuto();
      window.clearTimeout(emitTimer);
      canvas.removeEventListener('pointerdown', replay);
      resizeObserver.disconnect();
    },
  };
}
