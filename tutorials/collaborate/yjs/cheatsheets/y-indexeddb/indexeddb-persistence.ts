/**
 * 范例:一个 Y.Doc 挂上 IndexeddbPersistence,使用固定库名
 * cheatsheet-y-indexeddb-demo —— 每次非空事务的增量 update 立即追加为
 * IndexedDB updates store 的一条记录;冷启动时把库中全部记录重放合并进全新文档。
 * 库名固定:直接刷新浏览器页面,内容仍在,这本身就是持久化证据。
 * 输入:Controls 的「文档内容」(text,修改即作为一个事务写入并落盘;控件保持
 *      初始文案时不覆盖库中恢复的内容,因此刷新后能看到恢复结果)与「操作」(action):
 *      模拟刷新(销毁并重建 doc + persistence,从库重放)/ 写入 520 次小编辑
 *      (越过 500 条阈值,观察自动压缩)/ 清空本地库(clearData 后重建)。
 * 预期:条目数 = 本地事务数 + 1(构造时先存一条当前全量);「模拟刷新」后内容
 *      原样恢复;520 次小编辑停顿约 1 秒后条目塌缩为 1 条全量快照;「清空」后
 *      条目归零、文档为空。
 * 阅读主线:createIndexeddbPersistenceDemo → boot(建 doc + persistence,
 *      等 whenSynced)→ applyText / runAction → statStore(复用 persistence.db
 *      只读统计 updates store)→ draw。
 */
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type PersistenceAction = 'none' | 'reload' | 'bulk' | 'clear';

export interface IndexeddbPersistenceOptions {
  text: string;
  action: PersistenceAction;
}

export interface IndexeddbPersistenceSnapshot {
  dbName: string;
  synced: boolean;
  entries: number;
  bytes: number;
  docLen: number;
  lastEvent: string;
}

export interface IndexeddbPersistenceInstance {
  update(options: IndexeddbPersistenceOptions): void;
  dispose(): void;
}

/** 固定库名:刷新整个浏览器页面后内容仍可恢复。 */
export const DB_NAME = 'cheatsheet-y-indexeddb-demo';

/** 控件初始文案;保持它不改动视为「未动过」,不覆盖库中恢复的内容。 */
export const DEFAULT_TEXT = '你好,离线世界!';

/** 「写入 N 次小编辑」的事务次数;越过 PREFERRED_TRIM_SIZE(500)即触发压缩。 */
const BULK_EDITS = 520;

interface StoreStat {
  entries: number;
  bytes: number;
  /** 前若干条记录的字节数,用于按大小画条目块 */
  sizes: number[];
}

const MAX_SIZES = 120;

export function createIndexeddbPersistenceDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: IndexeddbPersistenceSnapshot) => void,
): IndexeddbPersistenceInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const g: CanvasRenderingContext2D = context;

  let doc: Y.Doc | null = null;
  let persistence: IndexeddbPersistence | null = null;
  let synced = false;
  let stat: StoreStat = { entries: 0, bytes: 0, sizes: [] };
  let lastEvent = '正在打开本地库…';
  // 控件当输入事件源而非状态镜像:只在上次 apply 的值变化时写入,
  // 否则 bulk 填充、重放恢复等会改变文档内容,下一次 apply 把控件旧值覆盖回去。
  // 首次 apply 且控件仍是初始文案时视为未动过——不覆盖库中恢复的内容。
  let lastText: string | null = null;
  let pendingText: string | null = null;
  let lastAction: PersistenceAction = 'none';
  /** 重建 / 清空进行期间吞掉文本写入,避免写进即将销毁的文档 */
  let busy = false;
  let disposed = false;

  // 只读统计 updates store。复用 persistence 已打开的连接:另开裸 indexedDB.open
  // 会与 openDB 的建库流程产生版本竞态;连接被关闭(clearData 后)时读数归零。
  function statStore(p: IndexeddbPersistence): Promise<StoreStat> {
    const db = p.db;
    if (!db) {
      return Promise.resolve({ entries: 0, bytes: 0, sizes: [] });
    }
    return new Promise((resolve) => {
      try {
        const req = db
          .transaction('updates', 'readonly')
          .objectStore('updates')
          .getAll();
        req.onsuccess = () => {
          const items = req.result as Uint8Array[];
          resolve({
            entries: items.length,
            bytes: items.reduce((n, u) => n + u.byteLength, 0),
            sizes: items.slice(0, MAX_SIZES).map((u) => u.byteLength),
          });
        };
        req.onerror = () => resolve({ entries: 0, bytes: 0, sizes: [] });
      } catch {
        resolve({ entries: 0, bytes: 0, sizes: [] });
      }
    });
  }

  async function refreshStat() {
    const p = persistence;
    if (!p || disposed) {
      return;
    }
    stat = await statStore(p);
    if (!disposed) {
      draw();
    }
  }

  function watchDoc(d: Y.Doc) {
    // 落盘是 IndexedDB 异步事务:每次文档变更后稍候补一次统计,读数即跟上。
    d.on('update', () => {
      window.setTimeout(() => void refreshStat(), 150);
      draw();
    });
  }

  // 建 doc + persistence 并等本地库重放完成;构造即开始加载,也立即开始写库。
  async function boot() {
    const d = new Y.Doc();
    const p = new IndexeddbPersistence(DB_NAME, d);
    doc = d;
    persistence = p;
    watchDoc(d);
    await p.whenSynced;
    if (disposed) {
      return;
    }
    synced = true;
    if (pendingText !== null) {
      writeText(pendingText);
      pendingText = null;
    }
    await refreshStat();
    const len = d.getText('t').length;
    lastEvent =
      len > 0 ? `本地库就绪:已恢复 ${len} 字符` : '本地库就绪(首次使用,暂无内容)';
    draw();
  }

  function writeText(text: string) {
    const d = doc;
    if (!d) {
      return;
    }
    const t = d.getText('t');
    if (t.toString() === text) {
      return;
    }
    // delete + insert 包进一个事务,只产生一条增量 update、落一条记录。
    d.transact(() => {
      t.delete(0, t.length);
      if (text.length > 0) {
        t.insert(0, text);
      }
    });
  }

  function applyText(text: string) {
    // 首次 apply 且控件保持初始文案时不写——刷新页面后库中恢复的内容原样显示;
    // 之后控件值每变一次写入一次并落盘。
    if (busy || text === lastText) {
      return;
    }
    if (lastText === null && text === DEFAULT_TEXT) {
      lastText = text;
      return;
    }
    lastText = text;
    if (doc) {
      writeText(text);
    } else {
      pendingText = text;
    }
  }

  // 模拟刷新:新 doc + 新 persistence 挂同一库名,等 whenSynced 后内容从库重放。
  // 旧实例在新实例就绪后才销毁,读数全程有值。
  async function runReload() {
    busy = true;
    lastEvent = '模拟刷新:销毁旧实例,全新文档从本地库重放…';
    draw();
    const oldDoc = doc;
    const oldP = persistence;
    const nextDoc = new Y.Doc();
    const nextP = new IndexeddbPersistence(DB_NAME, nextDoc);
    await nextP.whenSynced;
    if (disposed) {
      void nextP.destroy();
      nextDoc.destroy();
      return;
    }
    if (oldP) {
      void oldP.destroy();
    }
    oldDoc?.destroy();
    doc = nextDoc;
    persistence = nextP;
    watchDoc(nextDoc);
    await refreshStat();
    lastEvent = `已从本地库恢复 ${nextDoc.getText('t').length} 字符(库中共 ${stat.entries} 条记录,重放即合并)`;
    busy = false;
    draw();
  }

  // 清空:clearData 销毁实例并删除整个库。其 Promise 不等删除完成
  // (9.0.12 实测 resolve 时库仍在,数百毫秒后才消失),稍候再重建,
  // 浏览器对同名的 delete 与 open 按序执行,新实例得到全新空库。
  async function runClear() {
    busy = true;
    lastEvent = '清空本地库…';
    draw();
    const oldDoc = doc;
    const oldP = persistence;
    doc = null;
    persistence = null;
    synced = false;
    if (oldP) {
      await oldP.clearData();
    }
    oldDoc?.destroy();
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    if (disposed) {
      return;
    }
    await boot();
    lastEvent = '本地库已清空,文档重建为空';
    busy = false;
    draw();
  }

  // 越过压缩阈值:520 次小编辑 = 520 条增量记录;停止编辑约 1 秒后
  // 自动压缩为 1 条全量快照(防抖期间持续编辑会一直推迟,读数轮询可见塌缩)。
  function runBulk() {
    const d = doc;
    if (!d) {
      return;
    }
    const t = d.getText('t');
    for (let i = 0; i < BULK_EDITS; i += 1) {
      t.insert(t.length, '·');
    }
    lastEvent = `已写入 ${BULK_EDITS} 次小编辑;停顿约 1 秒后自动压缩,观察条目数塌缩`;
    window.setTimeout(() => void refreshStat(), 200);
    draw();
  }

  function runAction(action: PersistenceAction) {
    // 同一选择不重复执行(控件保持该值期间每次 apply 都会带上它);
    // 选回「无」后重置,之后才能再次触发同一操作。
    if (action === lastAction) {
      return;
    }
    lastAction = action;
    if (action === 'none') {
      return;
    }
    if (action === 'reload') {
      void runReload();
    } else if (action === 'clear') {
      void runClear();
    } else if (action === 'bulk') {
      runBulk();
    }
  }

  function snapshot(): IndexeddbPersistenceSnapshot {
    return {
      dbName: DB_NAME,
      synced,
      entries: stat.entries,
      bytes: stat.bytes,
      docLen: doc?.getText('t').length ?? 0,
      lastEvent,
    };
  }

  function drawWrappedText(
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number,
  ) {
    g.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillStyle = '#172033';
    let line = '';
    let cy = y;
    let drawn = 0;
    const flush = (content: string) => {
      g.fillText(content, x, cy);
      cy += lineHeight;
      drawn += 1;
    };
    for (const ch of text) {
      if (g.measureText(line + ch).width > maxWidth && line !== '') {
        if (drawn === maxLines - 1) {
          flush(`${line} …`);
          return;
        }
        flush(line);
        line = ch;
      } else {
        line += ch;
      }
    }
    if (line !== '' || drawn === 0) {
      flush(line === '' ? '(空)' : line);
    }
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(480, size.width);
    const height = Math.max(300, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    g.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    g.clearRect(0, 0, width, height);

    const d = doc;

    // 内存文档面板。
    const docTop = 34;
    const docBottom = 128;
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#cbd5e1';
    g.beginPath();
    g.rect(20, docTop, width - 40, docBottom - docTop);
    g.fill();
    g.stroke();
    g.font = '11px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = '#64748b';
    g.fillText('内存文档(Y.Doc)', 32, docTop + 18);
    g.textAlign = 'right';
    g.fillStyle = synced ? '#059669' : '#d97706';
    g.fillText(synced ? 'whenSynced 已 resolve' : '加载中…', width - 32, docTop + 18);
    g.textAlign = 'left';
    if (d) {
      drawWrappedText(d.getText('t').toString(), 32, docTop + 42, width - 64, 19, 2);
    } else {
      g.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      g.fillStyle = '#94a3b8';
      g.fillText('(重建中…)', 32, docTop + 42);
    }
    g.font = '12px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = '#64748b';
    g.fillText(`${d?.getText('t').length ?? 0} 字符`, 32, docBottom - 12);

    // IndexedDB 面板:每个块 = updates store 的一条记录,宽度随字节数变化;
    // 压缩后塌缩为 1 个绿色宽块(全量快照)。
    const dbTop = docBottom + 30;
    const dbBottom = height - 56;
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#cbd5e1';
    g.beginPath();
    g.rect(20, dbTop, width - 40, dbBottom - dbTop);
    g.fill();
    g.stroke();
    g.font = '11px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = '#64748b';
    g.fillText(`IndexedDB · ${DB_NAME} · updates store`, 32, dbTop + 18);

    const blockAreaTop = dbTop + 28;
    const blockAreaBottom = dbBottom - 26;
    const rowHeight = 22;
    const maxRows = Math.max(
      1,
      Math.floor((blockAreaBottom - blockAreaTop) / rowHeight),
    );
    let bx = 32;
    let by = blockAreaTop;
    let row = 0;
    let shown = 0;
    const single = stat.entries === 1;
    for (const bytes of stat.sizes) {
      const bw = Math.max(5, Math.min(40, 4 + bytes / 3));
      if (bx + bw > width - 52) {
        row += 1;
        by += rowHeight;
        bx = 32;
        if (row >= maxRows) {
          break;
        }
      }
      g.fillStyle = single ? '#10b981' : '#4f7cff';
      g.beginPath();
      g.rect(bx, by, bw, 16);
      g.fill();
      bx += bw + 3;
      shown += 1;
    }
    if (stat.entries === 0) {
      g.font = '12px ui-sans-serif, system-ui, sans-serif';
      g.fillStyle = '#94a3b8';
      g.fillText('(暂无记录)', 32, blockAreaTop + 12);
    }
    g.font = '12px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = '#64748b';
    const summary = single
      ? `共 1 条 · ${stat.bytes} B —— 全量快照(压缩后)`
      : `共 ${stat.entries} 条 · ${stat.bytes} B${stat.entries > shown ? '(块过多,仅画前一部分)' : ''}`;
    g.fillText(summary, 32, dbBottom - 10);

    // 底部状态行。
    g.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = '#1d4ed8';
    g.textAlign = 'center';
    g.fillText(lastEvent, width / 2, height - 26);
    g.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillStyle = '#94a3b8';
    g.fillText('库名固定 —— 直接刷新浏览器页面,内容仍在', width / 2, height - 10);
    g.textAlign = 'left';

    emit(snapshot());
  }

  const resizeObserver = createResizeObserver(canvas, draw);
  // 轮询读数:压缩(防抖 1 秒)等异步落盘行为不靠文档事件也能及时反映。
  const statTimer = window.setInterval(() => void refreshStat(), 700);

  void boot();

  return {
    update(options) {
      // 刚触发操作的那次 apply 不同时写文本,避免写进即将销毁的文档。
      const freshAction =
        options.action !== 'none' && options.action !== lastAction;
      runAction(options.action);
      if (!freshAction) {
        applyText(options.text);
      }
    },
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
      window.clearInterval(statTimer);
      // 只拆实例、不清库:固定库名正是为了刷新后可恢复。
      // destroy 摘掉写库监听并关闭连接,避免泄漏。
      if (persistence) {
        void persistence.destroy();
      }
      doc?.destroy();
    },
  };
}
