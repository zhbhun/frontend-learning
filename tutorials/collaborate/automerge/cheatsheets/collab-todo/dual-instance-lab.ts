/*
 * 双实例实验台：同一个协同待办应用在页面上跑两份完整实例。
 *
 * 演示内容：两份应用各自用同一套工厂装配 Repo（IndexedDB + BroadcastChannel
 * 双适配器），经 localStorage 里的根文档 URL 打开同一份清单；界面是真正的
 * React 组件（useDocument + 操作函数层）。
 * 输入：action——none / restart-b（重启实例 B，模拟页面刷新）/ reset（清掉
 * IndexedDB 演示库与根 URL 后从头开始）。
 * 操作：在画布里任一实例输入回车添加、点勾选框切换完成、点「删除」移除；
 * 用 Controls 重启或重置。
 * 预期结果：任一实例的写入约百毫秒内出现在另一实例（BroadcastChannel 同步）；
 * 重启实例 B 后清单先从 IndexedDB 读回、再由网络补齐节流窗口内的最新变更；
 * 重置后得到全新根文档，从空清单开始。
 * 阅读主线：数据真身在本地文档里，UI 是它的投影；同步与持久化都是 Repo
 * 装配的产物，应用代码不感知通道。
 */
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  BroadcastChannelNetworkAdapter,
  IndexedDBStorageAdapter,
  Repo,
  RepoContext,
  useDocument,
  type AutomergeUrl,
  type DocHandle,
  type PeerId,
} from '@automerge/react';

import type { ReactStageInstance } from './react-stage';
import { addTodo, removeTodo, toggleTodo, type TodoDoc } from './todo-model';

export const DUAL_ACTIONS = ['none', 'restart-b', 'reset'] as const;
export type DualAction = (typeof DUAL_ACTIONS)[number];

export interface DualInstanceArgs {
  action: DualAction;
}

export interface DualInstanceSnapshot {
  rootUrl: string;
  peers: number;
  synced: boolean | null;
  lastEvent: string;
}

export type DualInstanceInstance = ReactStageInstance<DualInstanceArgs>;

// dbName 是数据边界，channelName 是本机互联边界，根 URL key 归应用保管：
// 三者都按应用命名，避免同 origin 上的其他原型串数据。
const DB_NAME = 'collab-todo-demo';
const CHANNEL_NAME = 'collab-todo-demo';
const ROOT_URL_KEY = 'collab-todo-demo:root-url';

const INSTANCE_A_ID = 'todo-app-a' as PeerId;
const INSTANCE_B_ID = 'todo-app-b' as PeerId;

const SYNC_SETTLE_MS = 300;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shortUrl(url: string): string {
  const [scheme, docId] = url.split(':');
  return `${scheme}:${docId.slice(0, 8)}…`;
}

/** 装配一个「本地持久化 + 本机多端互联」的仓库：换设备时再往 network 数组里加 WebSocket 适配器。 */
function createTodoRepo(peerId: PeerId): Repo {
  return new Repo({
    peerId,
    storage: new IndexedDBStorageAdapter(DB_NAME),
    network: [new BroadcastChannelNetworkAdapter({ channelName: CHANNEL_NAME })],
  });
}

/**
 * 打开根文档：URL 由应用自己保管在 localStorage（存储按文档 ID 分片，
 * Repo 没有「上次有哪些文档」的清单 API）。第一次运行时创建并写下 URL；
 * withSeed 控制新文档是否带示例待办（重置场景从空清单开始）。
 */
async function openRootDoc(repo: Repo, withSeed: boolean): Promise<DocHandle<TodoDoc>> {
  const saved = window.localStorage.getItem(ROOT_URL_KEY);
  if (saved) {
    try {
      return await repo.find<TodoDoc>(saved as AutomergeUrl);
    } catch {
      // URL 存过但数据已不在（存储被清等）：落到底下的重建分支
    }
  }
  const handle = repo.create<TodoDoc>({
    items: withSeed
      ? [
          { id: crypto.randomUUID(), title: '在另一份实例里改同一条', done: false },
          { id: crypto.randomUUID(), title: '重启实例 B，看清单是否还在', done: false },
        ]
      : [],
  });
  window.localStorage.setItem(ROOT_URL_KEY, handle.url);
  return handle;
}

function deleteDemoDatabase(): Promise<void> {
  return new Promise((resolve) => {
    const request = window.indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

interface TodoAppProps {
  url: AutomergeUrl;
  label: string;
  notify: (event: string) => void;
}

/** 一份完整的应用界面：三态渲染 + 受控输入 + 按 id 的操作函数。 */
function TodoApp(props: TodoAppProps): React.ReactElement {
  const { url, label, notify } = props;
  const [doc, changeDoc] = useDocument<TodoDoc>(url);
  const [draft, setDraft] = React.useState('');

  if (!doc) {
    // useDocument 未就绪时 changeDoc 是空函数：占位 UI 不放写入按钮
    return React.createElement(
      'div',
      { style: styles.pane },
      React.createElement('div', { style: styles.small }, `${label}：清单加载中……`),
    );
  }

  const doneCount = doc.items.filter((item) => item.done).length;

  return React.createElement(
    'div',
    { style: styles.pane },
    React.createElement(
      'form',
      {
        style: styles.form,
        onSubmit(event) {
          event.preventDefault();
          const title = draft.trim();
          if (!title) {
            return;
          }
          // 写入全走操作函数层：组件里不散写 change 细节
          changeDoc((d) => {
            addTodo(d, title);
          });
          notify(`${label}：添加「${title}」`);
          setDraft('');
        },
      },
      React.createElement('input', {
        style: styles.input,
        value: draft,
        placeholder: '输入待办，回车添加',
        onChange(event) {
          setDraft(event.target.value);
        },
      }),
    ),
    React.createElement(
      'div',
      { style: styles.list },
      doc.items.map((item) =>
        React.createElement(
          'div',
          { key: item.id, style: styles.row },
          React.createElement('input', {
            type: 'checkbox',
            checked: item.done,
            onChange() {
              changeDoc((d) => {
                toggleTodo(d, item.id);
              });
              notify(`${label}：勾选「${item.title}」→ ${!item.done ? '完成' : '未完成'}`);
            },
          }),
          React.createElement(
            'span',
            { style: item.done ? styles.doneTitle : styles.title },
            item.title,
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              style: styles.deleteButton,
              onClick() {
                changeDoc((d) => {
                  removeTodo(d, item.id);
                });
                notify(`${label}：删除「${item.title}」`);
              },
            },
            '删除',
          ),
        ),
      ),
      doc.items.length === 0
        ? React.createElement('div', { style: styles.small }, '清单是空的：去另一份实例加一条试试')
        : null,
    ),
    React.createElement(
      'div',
      { style: styles.counter },
      `${label} · ${doc.items.length} 条 / 完成 ${doneCount} · key 用条目 id`,
    ),
  );
}

/** 单个实例 = 一个 Provider 子树；两份实例各自包着自己的 Repo。 */
function InstancePane(props: {
  repo: Repo;
  url: AutomergeUrl;
  label: string;
  notify: (event: string) => void;
}): React.ReactElement {
  return React.createElement(
    RepoContext.Provider,
    { value: props.repo },
    React.createElement(TodoApp, {
      url: props.url,
      label: props.label,
      notify: props.notify,
    }),
  );
}

class DualInstanceLab {
  private readonly host: HTMLElement;
  private readonly emit: (snapshot: DualInstanceSnapshot) => void;
  private readonly lines: string[] = [];
  private readonly root: ReturnType<typeof createRoot>;
  private repoA!: Repo;
  private repoB!: Repo;
  private handleA!: DocHandle<TodoDoc>;
  private handleB!: DocHandle<TodoDoc>;
  private rootUrl: AutomergeUrl | undefined;
  private generation = 0;
  private lastAction: DualAction = 'none';
  private pending: Promise<void> = Promise.resolve();
  private disposed = false;

  constructor(host: HTMLElement, emit: (snapshot: DualInstanceSnapshot) => void) {
    this.host = host;
    this.emit = emit;
    this.root = createRoot(host);
    this.root.render(
      React.createElement('div', { style: styles.stage }, '正在启动两份实例……'),
    );
    void this.boot();
  }

  /** 启动：实例 A 创建/打开根文档，实例 B 按同一 URL find。 */
  private async boot(): Promise<void> {
    this.repoA = createTodoRepo(INSTANCE_A_ID);
    this.handleA = await openRootDoc(this.repoA, true);
    this.rootUrl = this.handleA.url;
    this.log(`根文档 ${shortUrl(this.rootUrl)}（URL 存在 localStorage）`);

    this.repoB = createTodoRepo(INSTANCE_B_ID);
    this.handleB = await this.repoB.find<TodoDoc>(this.rootUrl);
    this.log('实例 B 按同一 URL find：同一份清单，两份界面');

    this.wireHandle(this.handleA);
    this.wireHandle(this.handleB);
    this.mount();
  }

  /** change 事件对本地与远端变更都触发：两侧读数因此始终新鲜。 */
  private wireHandle(handle: DocHandle<TodoDoc>): void {
    handle.on('change', () => {
      this.emitSnapshot();
    });
  }

  private mount(): void {
    if (this.disposed || !this.rootUrl) {
      return;
    }
    // key 带上 generation：重启 / 重置后强制重挂载，hooks 对新 Repo 重新 find
    this.root.render(
      React.createElement(
        'div',
        { style: styles.stage },
        React.createElement(InstancePane, {
          key: `a-${this.generation}`,
          repo: this.repoA,
          url: this.rootUrl,
          label: '实例 A',
          notify: (event) => this.log(event),
        }),
        React.createElement(InstancePane, {
          key: `b-${this.generation}`,
          repo: this.repoB,
          url: this.rootUrl,
          label: '实例 B',
          notify: (event) => this.log(event),
        }),
      ),
    );
  }

  /** 重启实例 B：真实应用里这就是「刷新页面 / 重开标签页」。 */
  private async restartB(): Promise<void> {
    if (!this.rootUrl) {
      return;
    }
    this.log('重启实例 B：shutdown（写完缓存 + 断网 + 关存储连接）');
    await this.repoB.shutdown().catch(() => {});
    await delay(150); // 等旧连接的告别消息走完，再让新实例进频道

    // 同一套工厂、同一个 dbName 与频道：应用代码里没有「重启」这个概念
    this.repoB = createTodoRepo(INSTANCE_B_ID);
    this.handleB = await this.repoB.find<TodoDoc>(this.rootUrl);
    this.wireHandle(this.handleB);
    this.generation += 1;
    this.mount();

    await delay(SYNC_SETTLE_MS);
    this.log('实例 B 恢复：先从 IndexedDB 读回，再由网络补齐节流窗口内的最新变更');
  }

  /** 重置演示：清掉这块 IndexedDB 与根 URL，两个实例从头开始。 */
  private async reset(): Promise<void> {
    this.log('重置：shutdown 两份实例，删除演示库与 localStorage 根 URL');
    await Promise.allSettled([this.repoA.shutdown(), this.repoB.shutdown()]);
    window.localStorage.removeItem(ROOT_URL_KEY);
    await deleteDemoDatabase();
    await delay(150);

    this.repoA = createTodoRepo(INSTANCE_A_ID);
    this.handleA = await openRootDoc(this.repoA, false);
    this.rootUrl = this.handleA.url;
    this.wireHandle(this.handleA);

    this.repoB = createTodoRepo(INSTANCE_B_ID);
    this.handleB = await this.repoB.find<TodoDoc>(this.rootUrl);
    this.wireHandle(this.handleB);
    this.generation += 1;
    this.mount();

    await delay(SYNC_SETTLE_MS);
    this.log(`已重建：全新根文档 ${shortUrl(this.rootUrl)}，从空清单开始`);
  }

  private log(text: string): void {
    this.lines.push(text);
    if (this.lines.length > 5) {
      this.lines.shift();
    }
    this.emitSnapshot();
  }

  private emitSnapshot(): void {
    if (this.disposed) {
      return;
    }
    const ready =
      this.rootUrl !== undefined &&
      this.handleA?.doc() !== undefined &&
      this.handleB?.doc() !== undefined;
    const synced = ready
      ? JSON.stringify(this.handleA.heads()) === JSON.stringify(this.handleB.heads())
      : null;
    this.emit({
      rootUrl: this.rootUrl ? shortUrl(this.rootUrl) : '—',
      peers: this.repoA?.peers.length ?? 0,
      synced,
      lastEvent: this.lines.at(-1) ?? '—',
    });
  }

  update(action: DualAction): void {
    // 操作是异步的：串行执行避免两次调整交叉；一次性动作需先回到「无」
    if (action === 'none' || action === this.lastAction) {
      this.lastAction = action;
      return;
    }
    this.lastAction = action;
    this.pending = this.pending.then(async () => {
      if (this.disposed) {
        return;
      }
      if (action === 'restart-b') {
        await this.restartB();
      } else if (action === 'reset') {
        await this.reset();
      }
      this.emitSnapshot();
    });
  }

  dispose(): void {
    this.disposed = true;
    this.root.unmount();
    void this.repoA?.shutdown().catch(() => {});
    void this.repoB?.shutdown().catch(() => {});
  }
}

export function createDualInstanceLab(
  host: HTMLElement,
  emit: (snapshot: DualInstanceSnapshot) => void,
): DualInstanceInstance {
  const lab = new DualInstanceLab(host, emit);
  return {
    update(args) {
      lab.update(args.action);
    },
    dispose() {
      lab.dispose();
    },
  };
}

const styles: Record<string, React.CSSProperties> = {
  stage: {
    display: 'flex',
    height: '100%',
    boxSizing: 'border-box',
    fontSize: '13px',
    lineHeight: 1.5,
  },
  pane: {
    flex: '1 1 50%',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '36px 14px 12px',
    minWidth: 0,
  },
  form: {
    display: 'flex',
    gap: '8px',
  },
  input: {
    flex: 1,
    padding: '5px 9px',
    border: '1px solid #c9d4e4',
    borderRadius: '6px',
    font: 'inherit',
    minWidth: 0,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    overflow: 'auto',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 8px',
    border: '1px solid #e3e9f3',
    borderRadius: '6px',
    background: '#ffffff',
  },
  title: {
    flex: 1,
    color: '#1f2d3d',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  doneTitle: {
    flex: 1,
    color: '#9aa7b4',
    textDecoration: 'line-through',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  deleteButton: {
    padding: '2px 8px',
    border: '1px solid #b9c6da',
    borderRadius: '6px',
    background: '#f4f7fc',
    font: 'inherit',
    cursor: 'pointer',
  },
  counter: {
    fontSize: '12px',
    color: '#5d6f67',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  small: {
    fontSize: '12px',
    color: '#46584f',
  },
};
