/**
 * 范例:副本 A 的工作区(父文档)挂有三个子文档;副本 B 同步父文档后只看到
 * 目录与 guid 引用——手动 load() 或 autoLoad 的子文档才沿自己的通道(按 guid)
 * 拉取内容。读数对照「父 update 字节」与「全量直连」的总字节。
 * 输入:syncParent(是否把父 update 应用到 B)、loadTarget(B 端手动 load 哪个)、
 *      autoLoadArchive(archive.log 是否以 autoLoad: true 创建)。
 * 预期:同步父文档后 B 端列出三个文件但内容为空(父 update 约 110 B);
 *      load / autoLoad 的行变为已加载并出现内容预览;读数给出 B 端 subdocs
 *      事件 added / loaded 计数;全部加载时「B 端累计接收」与「全量直连对照」持平。
 * 阅读主线:update() → replay() 重建两个副本、按控件执行同步与加载并统计字节
 *      → draw() 画双面板文件清单、父通道箭头与各子文档内容通道。
 */
import * as Y from 'yjs';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type LoadTarget = 'none' | 'readme' | 'notes' | 'archive' | 'all';

export interface SubdocLazyLoadOptions {
  /** 是否把父文档的 update 应用到副本 B */
  syncParent: boolean;
  /** B 端对哪个子文档调用 load() */
  loadTarget: LoadTarget;
  /** archive.log 是否以 autoLoad: true 创建(对端收到引用即自动加载) */
  autoLoadArchive: boolean;
}

type FileStatus = 'ref-only' | 'loaded' | 'auto';

interface FileState {
  name: string;
  guidShort: string;
  /** 子文档正文字符数(A 端真源) */
  chars: number;
  status: FileStatus;
  preview: string;
  /** 内容通道字节数;未加载为 0 */
  bytes: number;
  autoLoadMark: boolean;
}

interface SourceFile {
  name: string;
  chars: number;
  autoLoadMark: boolean;
}

export interface SubdocLazyLoadSnapshot {
  parentBytes: number;
  subBytes: number;
  totalBytes: number;
  fullBytes: number;
  eventsAdded: number;
  eventsLoaded: number;
  loadedCount: number;
}

export interface SubdocLazyLoadInstance {
  update(options: SubdocLazyLoadOptions): void;
  dispose(): void;
}

interface FileSpec {
  name: string;
  guid: string;
  unit: string;
  repeat: number;
}

/** 固定 guid 与确定性内容:字节数可复现,与正文实测数字一致。 */
const SPECS: FileSpec[] = [
  { name: 'readme.txt', guid: 'file-readme', unit: 'readme: 工作区使用说明。', repeat: 4 },
  { name: 'notes.txt', guid: 'file-notes', unit: '会议纪要 ', repeat: 30 },
  { name: 'archive.log', guid: 'file-archive', unit: 'ARCHIVE ', repeat: 200 },
];

interface ReplayResult {
  synced: boolean;
  parentBytes: number;
  subBytes: number;
  fullBytes: number;
  eventsAdded: number;
  eventsLoaded: number;
  filesA: SourceFile[];
  filesB: FileState[];
}

const STATUS_STYLE: Record<FileStatus, { color: string; label: string }> = {
  'ref-only': { color: '#94a3b8', label: '未加载' },
  loaded: { color: '#10b981', label: '已加载' },
  auto: { color: '#4f7cff', label: '自动加载' },
};

export function createSubdocLazyLoad(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SubdocLazyLoadSnapshot) => void,
): SubdocLazyLoadInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const g: CanvasRenderingContext2D = context;

  let current: SubdocLazyLoadOptions = {
    syncParent: true,
    loadTarget: 'none',
    autoLoadArchive: false,
  };
  let result: ReplayResult = replay(current);

  function replay(options: SubdocLazyLoadOptions): ReplayResult {
    // A 端:父文档 + 三个内容就绪的子文档;引用通过共享类型挂进目录。
    const parentA = new Y.Doc();
    const filesA = parentA.getMap<Y.Doc>('files');
    const subsA = new Map<string, Y.Doc>();
    for (const spec of SPECS) {
      const autoLoad = spec.guid === 'file-archive' && options.autoLoadArchive;
      const sub = new Y.Doc({ guid: spec.guid, autoLoad });
      sub.getText('content').insert(0, spec.unit.repeat(spec.repeat));
      filesA.set(spec.name, sub);
      subsA.set(spec.guid, sub);
    }

    // 父 update 只装目录与引用(guid + 选项),不装任何子文档内容。
    const parentUpdate = Y.encodeStateAsUpdate(parentA);
    const fullBytes =
      parentUpdate.byteLength +
      SPECS.reduce(
        (total, spec) =>
          total + Y.encodeStateAsUpdate(subsA.get(spec.guid)!).byteLength,
        0,
      );

    // B 端:模拟新设备;subdocs 事件计数就是「目录到达 / 加载请求」的证据。
    const parentB = new Y.Doc();
    let eventsAdded = 0;
    let eventsLoaded = 0;
    parentB.on('subdocs', ({ added, loaded }) => {
      eventsAdded += added.size;
      eventsLoaded += loaded.size;
    });

    const filesB: FileState[] = [];
    let subBytes = 0;
    if (options.syncParent) {
      Y.applyUpdate(parentB, parentUpdate);

      const received = parentB.getMap<Y.Doc>('files');
      for (const spec of SPECS) {
        const subB = received.get(spec.name)!;
        const subA = subsA.get(spec.guid)!;
        const targeted =
          options.loadTarget === 'all' ||
          options.loadTarget === spec.guid.slice('file-'.length);
        // autoLoad: true 的引用物化时 shouldLoad 已为 true,loaded 事件随引用到达。
        const auto = subB.shouldLoad;
        if (!auto && targeted) {
          // load() 把 shouldLoad 翻成 true,并让父文档发出 subdocs.loaded。
          subB.load();
        }
        if (auto || targeted) {
          // 内容由 Provider 以 guid 为房间名单独同步;这里用 applyUpdate 扮演该通道。
          const contentUpdate = Y.encodeStateAsUpdate(subA);
          Y.applyUpdate(subB, contentUpdate);
          subBytes += contentUpdate.byteLength;
          const text = subB.getText('content').toString();
          filesB.push({
            name: spec.name,
            guidShort: subB.guid.slice(0, 8),
            chars: text.length,
            status: auto ? 'auto' : 'loaded',
            preview: text.slice(0, 12),
            bytes: contentUpdate.byteLength,
            autoLoadMark: auto,
          });
        } else {
          filesB.push({
            name: spec.name,
            guidShort: subB.guid.slice(0, 8),
            chars: subA.getText('content').length,
            status: 'ref-only',
            preview: '',
            bytes: 0,
            autoLoadMark: false,
          });
        }
      }
    }

    return {
      synced: options.syncParent,
      parentBytes: options.syncParent ? parentUpdate.byteLength : 0,
      subBytes,
      fullBytes,
      eventsAdded,
      eventsLoaded,
      filesA: SPECS.map((spec) => ({
        name: spec.name,
        chars: subsA.get(spec.guid)!.getText('content').length,
        autoLoadMark: spec.guid === 'file-archive' && options.autoLoadArchive,
      })),
      filesB,
    };
  }

  function drawArrow(x1: number, x2: number, y: number, color: string, dashed: boolean) {
    g.strokeStyle = color;
    g.lineWidth = 2;
    g.setLineDash(dashed ? [5, 4] : []);
    g.beginPath();
    g.moveTo(x1, y);
    g.lineTo(x2, y);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(x2, y);
    g.lineTo(x2 - 7, y - 4);
    g.lineTo(x2 - 7, y + 4);
    g.closePath();
    g.fill();
  }

  function drawPanel(x: number, top: number, width: number, bottom: number, title: string) {
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#cbd5e1';
    g.beginPath();
    g.rect(x, top, width, bottom - top);
    g.fill();
    g.stroke();
    g.fillStyle = '#172033';
    g.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    g.fillText(title, x + 12, top + 20);
  }

  function drawSourceRow(x: number, y: number, width: number, file: SourceFile) {
    g.fillStyle = '#172033';
    g.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    g.fillText(file.name, x, y + 16);
    g.fillStyle = '#64748b';
    g.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillText(`${file.chars} 字符`, x, y + 36);
    if (file.autoLoadMark) {
      g.fillStyle = '#4f7cff';
      g.textAlign = 'right';
      g.fillText('autoLoad', x + width, y + 16);
      g.textAlign = 'left';
    }
  }

  function drawReplicaRow(x: number, y: number, width: number, file: FileState) {
    const style = STATUS_STYLE[file.status];
    g.fillStyle = '#172033';
    g.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    g.fillText(file.name, x, y + 16);

    // 状态点 + 状态词:未加载(灰)/ 已加载(绿)/ 自动加载(蓝)。
    const nameWidth = g.measureText(file.name).width;
    g.fillStyle = style.color;
    g.beginPath();
    g.arc(x + nameWidth + 14, y + 12, 4, 0, Math.PI * 2);
    g.fill();
    g.font = '12px ui-sans-serif, system-ui, sans-serif';
    g.fillText(style.label, x + nameWidth + 23, y + 16);

    g.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    if (file.status === 'ref-only') {
      g.fillStyle = '#94a3b8';
      g.fillText(`${file.guidShort}… · 仅引用,内容未加载`, x, y + 36);
    } else {
      g.fillStyle = '#475569';
      g.fillText(`“${file.preview}…” · ${file.chars} 字符`, x, y + 36);
      g.fillStyle = style.color;
      g.textAlign = 'right';
      g.fillText(`+${file.bytes} B`, x + width, y + 36);
      g.textAlign = 'left';
    }
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(560, size.width);
    const height = Math.max(372, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    g.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    g.clearRect(0, 0, width, height);

    const gutter = 104;
    const panelWidth = (width - 32 - gutter) / 2;
    const ax = 16;
    const bx = ax + panelWidth + gutter;
    const panelTop = 62;
    const rowHeight = 62;
    const panelBottom = panelTop + 30 + SPECS.length * rowHeight + 8;

    // 父通道:A → B,只携带目录与引用。
    const channelX1 = ax + panelWidth + 8;
    const channelX2 = bx - 8;
    const channelY = 34;
    drawArrow(
      channelX1,
      channelX2,
      channelY,
      result.synced ? '#4f7cff' : '#cbd5e1',
      !result.synced,
    );
    g.textAlign = 'center';
    if (result.synced) {
      g.fillStyle = '#1d4ed8';
      g.font = '600 12px ui-sans-serif, system-ui, sans-serif';
      g.fillText(`父 update ${result.parentBytes} B`, (channelX1 + channelX2) / 2, channelY - 10);
      g.fillStyle = '#64748b';
      g.font = '11px ui-sans-serif, system-ui, sans-serif';
      g.fillText('只含目录与 guid 引用', (channelX1 + channelX2) / 2, channelY + 18);
    } else {
      g.fillStyle = '#94a3b8';
      g.font = '12px ui-sans-serif, system-ui, sans-serif';
      g.fillText('父文档未同步', (channelX1 + channelX2) / 2, channelY - 10);
    }
    g.textAlign = 'left';

    drawPanel(ax, panelTop, panelWidth, panelBottom, '副本 A · 工作区真源');
    drawPanel(bx, panelTop, panelWidth, panelBottom, '副本 B · 新设备');

    const rowWidth = panelWidth - 24;
    for (let i = 0; i < SPECS.length; i += 1) {
      const rowY = panelTop + 34 + i * rowHeight;
      drawSourceRow(ax + 12, rowY, rowWidth, result.filesA[i]);

      if (!result.synced) {
        continue;
      }
      const file = result.filesB[i];
      drawReplicaRow(bx + 12, rowY, rowWidth, file);

      // 已加载的子文档各有一条按 guid 对齐的内容通道,字节数独立计算。
      if (file.status !== 'ref-only') {
        const midY = rowY + 22;
        const color = STATUS_STYLE[file.status].color;
        drawArrow(channelX1, channelX2, midY, color, true);
      }
    }

    if (!result.synced) {
      g.fillStyle = '#94a3b8';
      g.font = '12px ui-sans-serif, system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillText('父 update 都没收到,B 连有哪些子文档都不知道', bx + panelWidth / 2, (panelTop + panelBottom) / 2);
      g.textAlign = 'left';
    }

    const loadedCount = result.filesB.filter((file) => file.status !== 'ref-only').length;
    const totalBytes = result.parentBytes + result.subBytes;
    const summary = result.synced
      ? `B 端累计接收 ${totalBytes} B(父 ${result.parentBytes} + 内容 ${result.subBytes}) · 已加载 ${loadedCount}/3 · 全量直连对照 ${result.fullBytes} B`
      : '开启「同步父文档」后,B 端才会看到目录';
    g.fillStyle = result.synced ? '#172033' : '#d97706';
    g.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText(summary, width / 2, Math.max(height - 18, panelBottom + 34));
    g.textAlign = 'left';

    emit({
      parentBytes: result.parentBytes,
      subBytes: result.subBytes,
      totalBytes,
      fullBytes: result.fullBytes,
      eventsAdded: result.eventsAdded,
      eventsLoaded: result.eventsLoaded,
      loadedCount,
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      result = replay(options);
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
