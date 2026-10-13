/**
 * 范例介绍：文档的离线搬运——export 把文档装进字节，import 把字节装进另一个 Repo。
 * 输入：搬运方式（find 上门索取 / import 保住 docId / import 不带 docId）与 B 端
 *       追加的一行内容。两个内存仓库扮演两台设备，互不知晓、没有网络。
 * 预期：内存仓库之间 find 无法跨越（立即 unavailable）；import 带 docId 时 B 拿到
 *       同一 URL，双方是同一文档的两个副本，但 B 的追加 A 看不见（没有网络）；
 *       不带 docId 的 import 生成全新 documentId，内容相同、身份不同。
 * 阅读主线：buildTransferSnapshot 的三个分支；对比 urlB 与 urlA、A 是否看到 B 的追加。
 */
import {
  parseAutomergeUrl,
  Repo,
  type PeerId,
} from '@automerge/automerge-repo';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type TransferMode = 'find' | 'import-docid' | 'import-new';

export const TRANSFER_MODE_LABELS: Record<TransferMode, string> = {
  find: 'B 按 URL 向 A 要（find）',
  'import-docid': 'A export → B import（保住 docId）',
  'import-new': 'A export → B import（不带 docId）',
};

/** Controls 面板里搬运方式选择器的候选标签（中文）。 */
export const TRANSFER_MODE_OPTIONS: string[] = Object.values(
  TRANSFER_MODE_LABELS,
);

export function modeFromLabel(label: string): TransferMode {
  const entry = Object.entries(TRANSFER_MODE_LABELS).find(
    ([, value]) => value === label,
  );
  return (entry?.[0] as TransferMode | undefined) ?? 'import-docid';
}

/** stories 传入的参数：mode 是 Controls 里选中的中文标签。 */
export interface TransferArgsView {
  mode: string;
  note: string;
}

export interface TransferOptions {
  mode: TransferMode;
  note: string;
}

export interface TransferSnapshot {
  mode: TransferMode;
  urlA: string;
  /** null 表示 find 被拒绝，B 没有拿到文档 */
  urlB: string | null;
  /** null 表示 find 被拒绝 */
  sameUrl: boolean | null;
  titleB: string | null;
  itemsA: string[];
  itemsB: string[];
  /** null 表示 B 没有写入（find 被拒绝） */
  aSeesB: boolean | null;
  bytes: number | null;
  lastResult: string;
}

export interface TransferInstance {
  update(options: TransferArgsView): void;
  dispose(): void;
}

type NoteDoc = { title: string; items: string[] };

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * 搬运主线的纯逻辑部分：两个内存仓库、一次传输、B 的一次追加。
 * 每次调用都从全新的仓库开始，结果只由输入决定。
 */
export async function buildTransferSnapshot(
  options: TransferOptions,
): Promise<TransferSnapshot> {
  const repoA = new Repo({ peerId: 'device-a' as PeerId });
  const repoB = new Repo({ peerId: 'device-b' as PeerId });
  const handleA = repoA.create<NoteDoc>({
    title: '共享笔记',
    items: ['A 写的第一行'],
  });

  if (options.mode === 'find') {
    let rejection: string;
    try {
      await repoB.find<NoteDoc>(handleA.url);
      rejection = '意外成功（不应发生）';
    } catch (cause) {
      rejection = message(cause);
    }
    const docA = handleA.doc();
    return {
      mode: options.mode,
      urlA: handleA.url,
      urlB: null,
      sameUrl: null,
      titleB: null,
      itemsA: docA ? [...docA.items] : [],
      itemsB: [],
      aSeesB: null,
      bytes: null,
      lastResult: `find 立即被拒绝：${rejection}——find 只问自己的存储与自己的同伴，两个仓库互不相识`,
    };
  }

  const bytes = await repoA.export(handleA.url);
  if (!bytes) {
    throw new Error('export 意外返回空（不应发生）');
  }
  const handleB =
    options.mode === 'import-docid'
      ? repoB.import<NoteDoc>(bytes, {
          docId: parseAutomergeUrl(handleA.url).documentId,
        })
      : repoB.import<NoteDoc>(bytes);

  handleB.change((d) => {
    d.items.push(options.note);
  });

  const docA = handleA.doc();
  const docB = handleB.doc();
  const itemsA = docA ? [...docA.items] : [];
  const itemsB = docB ? [...docB.items] : [];
  return {
    mode: options.mode,
    urlA: handleA.url,
    urlB: handleB.url,
    sameUrl: handleB.url === handleA.url,
    titleB: docB?.title ?? null,
    itemsA,
    itemsB,
    aSeesB: itemsA.includes(options.note),
    bytes: bytes.length,
    lastResult:
      options.mode === 'import-docid'
        ? '同一 URL 的两个副本：内容已送达，但 B 的追加 A 看不见——搬运是快照，持续协作要靠同步（2.3）'
        : '内容相同但 documentId 是全新的：相当于「另存为」，两份文档从此是不同身份',
  };
}

interface DrawLine {
  text: string;
  color: string;
  bold?: boolean;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function shortenUrl(url: string): string {
  const prefix = 'automerge:';
  const body = url.startsWith(prefix) ? url.slice(prefix.length) : url;
  return body.length > 14 ? `${prefix}${body.slice(0, 14)}…` : url;
}

export function createTransferDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TransferSnapshot) => void,
): TransferInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let latest: TransferSnapshot | null = null;
  let runId = 0;

  function draw(snapshot: TransferSnapshot): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const relation =
      snapshot.sameUrl === null
        ? '—（B 没拿到文档）'
        : snapshot.sameUrl
          ? '是（URL 相同）'
          : '否（全新 documentId）';
    const lines: DrawLine[] = [
      {
        text: `搬运方式：${TRANSFER_MODE_LABELS[snapshot.mode]}`,
        color: '#172033',
        bold: true,
      },
      {
        text: `设备 A  url=${shortenUrl(snapshot.urlA)}  items=[${snapshot.itemsA.join('、')}]`,
        color: '#334155',
      },
      {
        text:
          snapshot.bytes === null
            ? '传输：（find 被拒绝，没有字节过境）'
            : `传输：${snapshot.bytes} 字节（整份文档的序列化结果）`,
        color: '#7c3aed',
        bold: true,
      },
      {
        text:
          snapshot.urlB === null
            ? '设备 B  url=—  items=[]'
            : `设备 B  url=${shortenUrl(snapshot.urlB)}  items=[${snapshot.itemsB.join('、')}]`,
        color: '#334155',
      },
      { text: `B 与 A 是同一份文档吗：${relation}`, color: '#334155' },
      { text: `观察：${snapshot.lastResult}`, color: '#166534', bold: true },
    ];

    let y = 40;
    for (const line of lines) {
      drawingContext.fillStyle = line.color;
      drawingContext.font = `${line.bold ? '600 ' : ''}14px ui-monospace, SFMono-Regular, Menlo, monospace`;
      drawingContext.fillText(truncate(line.text, 66), 24, y);
      y += 28;
    }

    emit(snapshot);
  }

  async function run(options: TransferArgsView): Promise<void> {
    const id = ++runId;
    const snapshot = await buildTransferSnapshot({
      mode: modeFromLabel(options.mode),
      note: options.note,
    });
    if (id !== runId) {
      return; // 只有最新一次运行才有资格画与发
    }
    latest = snapshot;
    draw(snapshot);
  }

  const resizeObserver = createResizeObserver(canvas, () => {
    if (latest) {
      draw(latest);
    }
  });

  return {
    update(options) {
      void run(options);
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
