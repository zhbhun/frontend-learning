/**
 * 范例介绍：幻觉校验器——逐段真实运行典型的「AI 生成风格」Automerge 代码。
 * 输入：snippet 控件切换 8 段常见旧风格片段（训练数据里的 2.x 写法、stable/alpha 线混淆等）。
 * 操作：每选一段，实验台当场执行一次，捕获真实返回值或真实错误信息。
 * 预期：多数片段当场抛错（读数给出错误原文）；个别片段能跑，但藏着静默偏差或过时写法。
 * 阅读主线：把「AI 生成 = 待验证草稿」变成机械动作——运行、读错、对照修正写法。
 */
import * as A from '@automerge/automerge';
import { Repo } from '@automerge/automerge-repo';
import * as RepoModule from '@automerge/automerge-repo';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// from/create 的类型参数要求索引签名兼容，这里用 type 而不是 interface
type NoteDoc = { text: string };
type VersionDoc = { v: number };
type RemarkDoc = { remark: string };

/** 片段的三种真实结局。 */
export type VerdictKind = 'crash' | 'silent' | 'stale';

export const VERDICT_LABELS: Record<VerdictKind, string> = {
  crash: '当场抛错',
  silent: '能跑，有静默偏差',
  stale: '能跑，写法已过时',
};

export type SnippetId =
  | 'old-text'
  | 'string-insert'
  | 'splice-outside'
  | 'actor-key'
  | 'await-doc'
  | 'doc-sync'
  | 'ephemeral'
  | 'merge-then-change';

export const SNIPPET_OPTIONS: SnippetId[] = [
  'old-text',
  'string-insert',
  'splice-outside',
  'actor-key',
  'await-doc',
  'doc-sync',
  'ephemeral',
  'merge-then-change',
];

export const SNIPPET_LABELS: Record<SnippetId, string> = {
  'old-text': '旧版 Text 类',
  'string-insert': '字符串上调 insertAt',
  'splice-outside': '回调外调用 splice',
  'actor-key': 'actorId 键名写错',
  'await-doc': 'await handle.doc()',
  'doc-sync': 'handle.docSync()',
  ephemeral: 'EphemeralData 已被移除',
  'merge-then-change': 'merge 后继续 change',
};

export interface CheckerArgs {
  snippet: SnippetId;
}

export interface CheckerSnapshot {
  rows: Array<[string, string]>;
}

export interface CheckerInstance {
  update(args: CheckerArgs): void;
  dispose(): void;
}

interface Snippet {
  id: SnippetId;
  /** 预期结局：决定读数的分类；真实执行结果仍是逐段实测的。 */
  kind: VerdictKind;
  /** 画布上展示的「AI 常写」代码。 */
  code: string[];
  /** 真实执行：返回观测文本，或抛出真实错误。 */
  run(): string;
  /** 修正写法要点。 */
  fix: string;
}

function describeError(error: unknown): string {
  const name = error instanceof Error ? error.name : typeof error;
  const message = error instanceof Error ? error.message : String(error);
  return `${name}: ${message}`;
}

const snippets: Record<SnippetId, Snippet> = {
  // 2.x 教程的 Text 类在 3.x 已整体移除
  'old-text': {
    id: 'old-text',
    kind: 'crash',
    code: [
      "import * as A from '@automerge/automerge';",
      "const doc = A.from({ remark: '' });",
      "A.change(doc, (d) => {",
      "  d.remark = new A.Text('hello'); // 2.x 写法",
      '});',
    ],
    run() {
      const doc = A.from<RemarkDoc>({ remark: '' });
      // 旧 API 在类型层面已不存在，这里用类型断言还原「AI 会写出的调用」
      A.change(doc, (d) => {
        d.remark = new (A as unknown as { Text: new (text: string) => string })
          .Text('hello');
      });
      return `没有报错？remark = ${JSON.stringify(doc.remark)}`;
    },
    fix: '字符串直接赋值即是可协同编辑的文本容器，编辑用 A.splice / A.updateText',
  },

  // 对读回的字符串调用旧 Text 实例方法
  'string-insert': {
    id: 'string-insert',
    kind: 'crash',
    code: [
      "const doc = A.from({ text: 'hello' });",
      'doc.text.insertAt(0, "X"); // Text 实例方法已随类一起移除',
    ],
    run() {
      const doc = A.from<NoteDoc>({ text: 'hello' });
      const text: string = doc.text;
      const legacyText = text as unknown as {
        insertAt(index: number, text: string): void;
      };
      legacyText.insertAt(0, 'X');
      return `没有报错？text = ${JSON.stringify(doc.text)}`;
    },
    fix: '读回的是普通 string；编辑走 A.splice(doc, ["text"], …)，且要包在 change 回调内',
  },

  // 带路径的编辑 API 只能在 change 回调内使用
  'splice-outside': {
    id: 'splice-outside',
    kind: 'crash',
    code: [
      "const doc = A.from({ text: 'hello' });",
      "A.splice(doc, ['text'], 0, 0, 'X'); // 忘了包进 change 回调",
    ],
    run() {
      const doc = A.from<NoteDoc>({ text: 'hello' });
      A.splice(doc, ['text'], 0, 0, 'X');
      return `没有报错？text = ${JSON.stringify(doc.text)}`;
    },
    fix: '所有写操作放进 A.change / handle.change 的回调；回调外文档是只读快照',
  },

  // InitOptions 的键名是 actor；写错不报错，身份被静默丢弃
  'actor-key': {
    id: 'actor-key',
    kind: 'silent',
    code: [
      "const replica = A.clone(doc, { actorId: 'aaaa' });",
      "// 旧教程里见过 actorId 这个键名？",
    ],
    run() {
      const base = A.from<VersionDoc>({ v: 0 });
      const wrongOpts = { actorId: 'aaaa' } as unknown as A.InitOptions<VersionDoc>;
      const replica = A.clone(base, wrongOpts);
      const actorId = A.getActorId(replica);
      if (actorId === 'aaaa') {
        return 'actorId = aaaa（碰巧一致）';
      }
      return `没有报错，但 getActorId() = "${actorId}"——随机 hex，'aaaa' 被静默丢弃`;
    },
    fix: '键名是 actor：A.clone(doc, { actor: "aaaa" })，或直接传字符串；值必须是 hex',
  },

  // stable 线的 doc() 是异步的；alpha 线改为同步，await 成为无效动作
  'await-doc': {
    id: 'await-doc',
    kind: 'stale',
    code: [
      'const doc = await handle.doc(); // 官网 2.x 页面的写法',
      '// 本基线 2.6.0-alpha.3 的 doc() 本就同步',
    ],
    run() {
      const repo = new Repo();
      const handle = repo.create<VersionDoc>({ v: 1 });
      const doc = handle.doc();
      const isPromise = doc instanceof Promise;
      return [
        `handle.doc() 直接拿到 ${JSON.stringify(doc)}；`,
        `返回 Promise 吗？${isPromise ? '是' : '否'}——`,
        'await 它不会报错，但什么也等不到',
      ].join('');
    },
    fix: 'const doc = handle.doc();（同步）；该线已移除 docSync()、弃用 whenReady()',
  },

  // docSync 在本基线已移除
  'doc-sync': {
    id: 'doc-sync',
    kind: 'crash',
    code: ['const doc = handle.docSync(); // 同步读取——某版本才有的方法'],
    run() {
      const repo = new Repo();
      const handle = repo.create<VersionDoc>({ v: 1 });
      const doc = (handle as unknown as { docSync(): VersionDoc }).docSync();
      return `没有报错？doc = ${JSON.stringify(doc)}`;
    },
    fix: 'handle.doc() 在 2.6.0-alpha 线就是同步读取，docSync 已删除',
  },

  // stable 线的 EphemeralData 在 2.6 alpha 线被 Presence 取代
  ephemeral: {
    id: 'ephemeral',
    kind: 'crash',
    code: [
      "import { EphemeralData } from '@automerge/automerge-repo';",
      'const eph = new EphemeralData(handle); // stable 2.x 的 API',
      'eph.publish("cursor", 12);',
    ],
    run() {
      const repo = new Repo();
      const handle = repo.create<VersionDoc>({ v: 1 });
      // stable 2.x 才导出的类，本基线取到 undefined
      const EphemeralData = (
        RepoModule as { EphemeralData?: new (handle: unknown) => unknown }
      ).EphemeralData!;
      const eph = new EphemeralData(handle);
      return `没有报错？拿到 ${typeof eph}`;
    },
    fix: '换成 Presence：new Presence({ handle })，start() 后用 broadcast(channel, value)（见 2.4 课）',
  },

  // merge 会冻结两个参数
  'merge-then-change': {
    id: 'merge-then-change',
    kind: 'crash',
    code: [
      'const merged = A.merge(a, b);',
      'A.change(a, (d) => { d.v = 9; }); // 以为还能继续写 a',
    ],
    run() {
      const base = A.from<VersionDoc>({ v: 0 });
      const a = A.change(A.clone(base), (d) => {
        d.v = 1;
      });
      const b = A.change(A.clone(base), (d) => {
        d.v = 2;
      });
      const merged = A.merge(a, b);
      A.change(a, (d) => {
        d.v = 9;
      });
      return `没有报错？merged.v = ${merged.v}`;
    },
    fix: 'merge 冻结两个参数：继续写用合并结果，或先 A.clone 出可写副本',
  },
};

function executeSnippet(
  snippet: Snippet,
): { kind: VerdictKind; evidence: string } {
  try {
    return { kind: snippet.kind, evidence: snippet.run() };
  } catch (error) {
    return { kind: 'crash', evidence: describeError(error) };
  }
}

export function createHallucinationChecker(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CheckerSnapshot) => void,
): CheckerInstance {
  let lastResult: { snippet: Snippet; evidence: string; kind: VerdictKind } | null =
    null;

  function render(): void {
    if (!lastResult) {
      return;
    }
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('当前浏览器不支持 Canvas 2D。');
    }
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);

    const { snippet } = lastResult;
    context.fillStyle = '#172033';
    context.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    context.fillText(`幻觉校验器：${SNIPPET_LABELS[snippet.id]}`, 32, 40);

    // 展示「AI 常写」的代码原文
    context.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    context.fillStyle = '#334155';
    let y = 70;
    for (const line of snippet.code) {
      context.fillText(line, 32, y);
      y += 20;
    }

    // 真实执行结果的分类与证据
    y += 10;
    context.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    context.fillStyle =
      lastResult.kind === 'crash' ? '#b42318' : '#8a5a00';
    context.fillText(`结果分类：${VERDICT_LABELS[lastResult.kind]}`, 32, y);
    y += 24;

    context.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    context.fillStyle = '#334155';
    for (const line of wrapText(context, lastResult.evidence, width - 64)) {
      context.fillText(line, 32, y);
      y += 20;
    }

    context.font = '13px ui-sans-serif, system-ui, sans-serif';
    context.fillStyle = '#0f5132';
    for (const line of wrapText(
      context,
      `修正写法：${snippet.fix}`,
      width - 64,
    )) {
      context.fillText(line, 32, y);
      y += 20;
    }
  }

  const resizeObserver = createResizeObserver(canvas, render);

  return {
    update(args: CheckerArgs): void {
      const snippet = snippets[args.snippet];
      const result = executeSnippet(snippet);
      lastResult = {
        snippet,
        kind: result.kind,
        evidence: result.evidence,
      };
      render();
      emit({
        rows: [
          ['结果分类', VERDICT_LABELS[result.kind]],
          ['真实输出', result.evidence],
          ['修正写法', snippet.fix],
        ],
      });
    },
    dispose() {
      resizeObserver.disconnect();
      lastResult = null;
    },
  };
}

/** 按像素宽度折行，避免证据文本画出画布。 */
function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let current = '';
  for (const char of text) {
    if (context.measureText(current + char).width > maxWidth) {
      lines.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines;
}
