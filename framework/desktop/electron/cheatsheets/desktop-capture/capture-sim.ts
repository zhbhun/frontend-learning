/**
 * 范例介绍：模拟 desktopCapturer.getSources 的「输入 → source 清单 → 链路分叉」。
 * （desktopCapturer 只在主进程可用，真实调用需要 Electron 环境；本模拟按官方文档
 * 行为复现，真实环境的核对方式见正文快速上手。）
 *
 * 输入与前置状态：控件 types 对应 getSources 的捕获类型；thumbnailSize 对应缩略图
 * 目标尺寸（默认 150×150，宽或高为 0 跳过生成）；fetchWindowIcons 决定 appIcon 是否抓取。
 * 主要操作：点击画布中的 source 卡片，看这条 source 在两条链路里各被拿走什么。
 * 预期结果：types 过滤清单；thumbnail 实际尺寸按缩放浮动、0×0 时静帧链断裂而录屏链
 * 不受影响；appIcon 只在窗口类型且开关打开时非 null。
 * 阅读主线：先「全类型 + 默认尺寸」看清单形状，再切「0×0（跳过）」对照两条链路差异。
 */

export type CaptureTypes = 'screen 和 window' | '仅 screen' | '仅 window';
export type CaptureThumbSize = '150×150（默认）' | '640×360' | '0×0（跳过）';

export interface CaptureSimOptions {
  types: CaptureTypes;
  thumbnailSize: CaptureThumbSize;
  fetchWindowIcons: boolean;
}

export interface CaptureSimSnapshot {
  count: string;
  selectedName: string;
  thumbnailSize: string;
  appIcon: string;
  captureId: string;
}

export interface CaptureSimInstance {
  update(options: CaptureSimOptions): void;
  dispose(): void;
}

interface MockSource {
  id: string;
  name: string;
  kind: 'screen' | 'window';
  aspect: number; // 缩略图等比缩放用的宽高比
  ownProcess?: boolean; // 窗口 id 第三段为 1：当前进程的窗口
}

interface ChainPanel {
  title: string;
  steps: string[];
  broken: boolean;
}

// 模拟桌面：两块屏幕 + 三扇窗口（含一扇属于「当前进程」，id 第三段为 1）
const MOCK_SOURCES: MockSource[] = [
  { id: 'screen:0:0', name: 'Entire Screen', kind: 'screen', aspect: 16 / 10 },
  { id: 'screen:1:0', name: 'Screen 1', kind: 'screen', aspect: 16 / 9 },
  { id: 'window:212:0', name: '访达', kind: 'window', aspect: 3 / 2 },
  { id: 'window:305:0', name: 'Safari 浏览器', kind: 'window', aspect: 16 / 10 },
  {
    id: 'window:318:1',
    name: '屏幕捕获演示（本应用）',
    kind: 'window',
    aspect: 16 / 10,
    ownProcess: true,
  },
];

const THUMB_BOXES: Record<CaptureThumbSize, { width: number; height: number }> = {
  '150×150（默认）': { width: 150, height: 150 },
  '640×360': { width: 640, height: 360 },
  '0×0（跳过）': { width: 0, height: 0 },
};

// 文档语义：thumbnailSize 是「缩放目标」——等比放进目标框，实际尺寸按缩放浮动
function fitThumbnail(
  source: MockSource,
  box: { width: number; height: number },
): { width: number; height: number } | null {
  if (box.width === 0 || box.height === 0) {
    return null;
  }
  const width = Math.round(Math.min(box.width, box.height * source.aspect));
  return { width, height: Math.round(width / source.aspect) };
}

export function createCaptureSim(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CaptureSimSnapshot) => void,
): CaptureSimInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let types: CaptureTypes = 'screen 和 window';
  let thumbnailSize: CaptureThumbSize = '150×150（默认）';
  let fetchWindowIcons = false;
  let selectedIndex: number | null = null;
  let hoveredIndex: number | null = null;
  let cardRects: Array<{ x: number; y: number; w: number; h: number }> = [];

  function visibleSources(): MockSource[] {
    return MOCK_SOURCES.filter((source) => {
      if (types === '仅 screen') return source.kind === 'screen';
      if (types === '仅 window') return source.kind === 'window';
      return true;
    });
  }

  function selectedSource(): MockSource | null {
    const list = visibleSources();
    return selectedIndex === null ? null : (list[selectedIndex] ?? null);
  }

  // 两条链路在 source 处分叉：静帧链拿 thumbnail，录屏链只带走 id
  function buildChains(source: MockSource): [ChainPanel, ChainPanel] {
    const box = THUMB_BOXES[thumbnailSize];
    const thumb = fitThumbnail(source, box);
    const still: ChainPanel = thumb
      ? {
          title: '静帧链：thumbnail → PNG',
          broken: false,
          steps: [
            'thumbnail 已随 getSources 返回（NativeImage）',
            `toPNG() → PNG 字节（本次实际 ${thumb.width}×${thumb.height}）`,
            'fs.writeFile 写成 capture.png',
          ],
        }
      : {
          title: '静帧链：thumbnail → PNG',
          broken: true,
          steps: [
            'thumbnailSize 宽或高为 0：thumbnail 是空图（isEmpty()）',
            'toPNG() 只有空字节——静帧链断在这里',
            '要截图：重新调用 getSources，把 thumbnailSize 设为目标尺寸',
          ],
        };
    const video: ChainPanel = {
      title: '录屏链：id → getUserMedia → MediaRecorder',
      broken: false,
      steps: [
        `id '${source.id}' 进入 mandatory.chromeMediaSourceId`,
        'getUserMedia 拿到 desktop 源的 MediaStream',
        "new MediaRecorder(stream, { mimeType: 'video/webm' })",
        'stop() 后分片拼成 webm Blob',
      ],
    };
    return [still, video];
  }

  function snapshot(): CaptureSimSnapshot {
    const source = selectedSource();
    const thumb = source ? fitThumbnail(source, THUMB_BOXES[thumbnailSize]) : null;
    const hasIcon = Boolean(source && fetchWindowIcons && source.kind === 'window');
    return {
      count: `${visibleSources().length} 条（types=${types}）`,
      selectedName: source?.name ?? '—',
      thumbnailSize: thumb ? `${thumb.width}×${thumb.height}` : source ? '空图（已跳过）' : '—',
      appIcon: source ? (hasIcon ? '有（窗口 + 开关开）' : 'null') : '—',
      captureId: source?.id ?? '—',
    };
  }

  function refresh(): void {
    emit(snapshot());
    draw();
  }

  function wrapText(text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const ch of text) {
      if (ctx.measureText(line + ch).width > maxWidth && line) {
        lines.push(line);
        line = ch;
      } else {
        line += ch;
      }
    }
    if (line) {
      lines.push(line);
    }
    return lines;
  }

  function truncated(text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) {
      return text;
    }
    let out = text;
    while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
      out = out.slice(0, -1);
    }
    return `${out}…`;
  }

  const GRID_TOP = 64;
  const CARD_H = 54;
  const CARD_GAP = 10;
  const MARGIN = 20;

  function drawCard(
    source: MockSource,
    index: number,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    const selected = index === selectedIndex;
    const hovered = index === hoveredIndex;
    const box = THUMB_BOXES[thumbnailSize];
    const thumb = fitThumbnail(source, box);
    const hasIcon = fetchWindowIcons && source.kind === 'window';

    ctx.save();
    if (selected || hovered) {
      ctx.shadowColor = 'rgba(15, 23, 42, 0.14)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 2;
    }
    ctx.fillStyle = selected ? '#eef3ff' : '#ffffff';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = selected ? '#4f7cff' : hovered ? '#a9bdf3' : '#dbe3f0';
    ctx.lineWidth = selected ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.stroke();

    // 类型徽标 + name
    ctx.fillStyle = source.kind === 'screen' ? '#0e9f6e' : '#4f7cff';
    ctx.beginPath();
    ctx.arc(x + 14, y + 15, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#172033';
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(
      truncated(`${source.kind === 'screen' ? '屏幕' : '窗口'} · ${source.name}`, w - 28),
      x + 24,
      y + 15,
    );

    // id：完整格式就是录屏约束里 chromeMediaSourceId 的取值
    ctx.fillStyle = '#64748b';
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(truncated(source.id, w - 24), x + 12, y + 31);

    // thumbnail 实际尺寸 + appIcon
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    const meta = thumb
      ? `thumbnail: ${thumb.width}×${thumb.height}`
      : 'thumbnail: 空图（0×0 跳过）';
    const icon = hasIcon ? 'appIcon: 有' : 'appIcon: null';
    ctx.fillText(truncated(`${meta} · ${icon}`, w - 24), x + 12, y + 45);
  }

  function drawPanel(width: number, top: number): void {
    const source = selectedSource();
    const colW = (width - MARGIN * 2 - 10) / 2;
    const maxWidth = colW - 24;
    const panels = source
      ? buildChains(source)
      : ([
          { title: '静帧链：thumbnail → PNG', steps: [], broken: false },
          { title: '录屏链：id → getUserMedia → MediaRecorder', steps: [], broken: false },
        ] as [ChainPanel, ChainPanel]);

    panels.forEach((panel, column) => {
      const x = MARGIN + column * (colW + 10);
      ctx.strokeStyle = '#dbe3f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, top, colW, 140, 8);
      ctx.stroke();

      ctx.fillStyle = panel.broken ? '#d97706' : '#4f7cff';
      ctx.fillRect(x, top, 3, 140);

      ctx.fillStyle = panel.broken ? '#b45309' : '#172033';
      ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(truncated(panel.title, maxWidth), x + 14, top + 16);

      if (!source) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText('点击上方 source 卡片', x + 14, top + 42);
        ctx.fillText('看这条 source 在链路里被拿走什么', x + 14, top + 60);
        return;
      }

      let y = top + 38;
      panel.steps.forEach((step) => {
        const lines = wrapText(step, maxWidth - 8);
        ctx.fillStyle = panel.broken ? '#92400e' : '#334155';
        ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
        lines.forEach((line, lineIndex) => {
          ctx.fillText(line, x + 14, y + lineIndex * 14);
        });
        y += lines.length * 14 + 4;
      });
    });
  }

  function draw(): void {
    const width = canvas.clientWidth || 640;
    const height = canvas.clientHeight || 400;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);
    ctx.textBaseline = 'middle';

    // 顶部状态行：本次 getSources 的关键输入
    ctx.textAlign = 'left';
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('getSources 输入', MARGIN, 28);
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = '#172033';
    ctx.fillText(
      `types: [${types === '仅 screen' ? "'screen'" : types === '仅 window' ? "'window'" : "'screen', 'window'"}] · thumbnailSize: ${thumbnailSize} · fetchWindowIcons: ${fetchWindowIcons}`,
      MARGIN + 104,
      28,
    );

    // source 清单：getSources 返回的 DesktopCapturerSource[]
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('返回的 DesktopCapturerSource[]', MARGIN, 50);

    const list = visibleSources();
    const cardW = (width - MARGIN * 2 - CARD_GAP * 2) / 3;
    cardRects = list.map((source, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = MARGIN + column * (cardW + CARD_GAP);
      const y = GRID_TOP + row * (CARD_H + CARD_GAP);
      drawCard(source, index, x, y, cardW, CARD_H);
      return { x, y, w: cardW, h: CARD_H };
    });

    const panelTop = GRID_TOP + 2 * (CARD_H + CARD_GAP) + 6;
    drawPanel(width, panelTop);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('点击 source 卡片 = 拿到这条 source 之后能做什么', width - MARGIN, height - 16);
    ctx.textAlign = 'left';
  }

  function canvasPoint(event: MouseEvent): { x: number; y: number } {
    const bounds = canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function cardAt(x: number, y: number): number | null {
    const index = cardRects.findIndex(
      (rect) => x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h,
    );
    return index === -1 ? null : index;
  }

  function onClick(event: MouseEvent): void {
    const { x, y } = canvasPoint(event);
    const index = cardAt(x, y);
    if (index === null) {
      return;
    }
    selectedIndex = index === selectedIndex ? null : index;
    refresh();
  }

  function onMouseMove(event: MouseEvent): void {
    const { x, y } = canvasPoint(event);
    const index = cardAt(x, y);
    if (index !== hoveredIndex) {
      hoveredIndex = index;
      draw();
    }
    canvas.style.cursor = index === null ? 'default' : 'pointer';
  }

  function onMouseLeave(): void {
    if (hoveredIndex !== null) {
      hoveredIndex = null;
      draw();
    }
    canvas.style.cursor = 'default';
  }

  canvas.addEventListener('click', onClick);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseleave', onMouseLeave);

  return {
    update(options) {
      types = options.types;
      thumbnailSize = options.thumbnailSize;
      fetchWindowIcons = options.fetchWindowIcons;
      // 输入变了，旧选中不再对应新的 getSources 调用：回到未选中状态
      selectedIndex = null;
      hoveredIndex = null;
      refresh();
    },
    dispose() {
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
    },
  };
}
