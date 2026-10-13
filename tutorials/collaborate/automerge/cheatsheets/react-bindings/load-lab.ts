import { createRoot } from 'react-dom/client';
/*
 * 按 URL 加载实验台：useDocHandle / useDocument 的同步与 Suspense 两种模式。
 *
 * 演示内容：文档不在你的仓库里——它在「同事的 Repo B」上（同页两个 Repo，
 * 经 BroadcastChannel 组网，即 2.3 网络同步的最小形态）。你的 React 组件树
 * 连着 Repo A，只有分享链接（URL）到达后 useDocument 才开始 find，再等
 * 文档从 B 同步过来。
 * 输入：mode（同步 / Suspense）、phase（分享链接是否到达）、action（同事
 * 再改一笔）。
 * 操作：先保持「等待分享链接」，再切「已到达」；切 mode 会换一份新文档并
 * 重挂载组件。
 * 预期结果：无 URL 时两种模式都拿不到文档；URL 到达后，同步模式里
 * useDocument 先一直返回 undefined，Suspense 模式里 fallback 一闪而过；
 * 文档就绪后「同事再改一笔」会穿过网络驱动重渲染。
 * 阅读主线：URL 是加载的起点；两种模式只是交付策略不同，加载语义相同。
 */
import * as React from 'react';
import {
  BroadcastChannelNetworkAdapter,
  Repo,
  useDocument,
  type AutomergeUrl,
} from '@automerge/react';

import type { ReactLabInstance } from './react-story';

export interface NoteDoc {
  title: string;
  revision: number;
}

export const LOAD_MODES = ['sync', 'suspense'] as const;
export type LoadMode = (typeof LOAD_MODES)[number];

export const LOAD_PHASES = ['awaiting', 'received'] as const;
export type LoadPhase = (typeof LOAD_PHASES)[number];

export const LOAD_ACTIONS = ['none', 'peer-edit'] as const;
export type LoadAction = (typeof LOAD_ACTIONS)[number];

export interface LoadLabArgs {
  mode: LoadMode;
  phase: LoadPhase;
  action: LoadAction;
}

export interface LoadLabSnapshot {
  mode: LoadMode;
  phase: LoadPhase;
  title: string | null;
  revision: number | null;
  timeline: Array<{ at: number; text: string }>;
}

export type LoadLabInstance = ReactLabInstance<LoadLabArgs>;

const CHANNEL = 'react-bindings-load-lab';

interface LoadDemoProps {
  mode: LoadMode;
  phase: LoadPhase;
  url: AutomergeUrl;
  log: (text: string) => void;
  onDoc: (info: { title: string | null; revision: number | null }) => void;
}

export function createLoadLab(
  host: HTMLElement,
  emit: (snapshot: LoadLabSnapshot) => void,
): LoadLabInstance {
  // 同一页两个仓库经 BroadcastChannel 组网：B 建文档，A 按链接去取
  const repoB = new Repo({
    network: [new BroadcastChannelNetworkAdapter({ channelName: CHANNEL })],
  });
  const repoA = new Repo({
    network: [new BroadcastChannelNetworkAdapter({ channelName: CHANNEL })],
  });

  let docVersion = 1;
  let handleB = repoB.create<NoteDoc>({ title: `同事的笔记 v${docVersion}`, revision: 0 });
  let timeline: Array<{ at: number; text: string }> = [];
  let t0 = performance.now();
  let mountedMode: LoadMode | undefined;
  let lastAction: LoadAction = 'none';
  let currentArgs: LoadLabArgs = { mode: 'sync', phase: 'awaiting', action: 'none' };
  let docInfo: { title: string | null; revision: number | null } = {
    title: null,
    revision: null,
  };
  let root: ReturnType<typeof createRoot> | undefined;

  const emitSnapshot = () => {
    emit({
      mode: currentArgs.mode,
      phase: currentArgs.phase,
      title: docInfo.title,
      revision: docInfo.revision,
      timeline,
    });
  };

  const log = (text: string) => {
    timeline = [...timeline, { at: Math.round(performance.now() - t0), text }].slice(-6);
    emitSnapshot();
  };

  const mount = (mode: LoadMode, options: { freshDoc: boolean }) => {
    t0 = performance.now();
    timeline = [];
    docInfo = { title: null, revision: null };
    if (options.freshDoc) {
      // 换一份新文档：让「A 去 B 同步」的加载窗口重新出现
      docVersion += 1;
      handleB = repoB.create<NoteDoc>({ title: `同事的笔记 v${docVersion}`, revision: 0 });
    }

    root?.unmount();
    host.replaceChildren();
    root = createRoot(host);
    log(
      options.freshDoc
        ? `重挂载（${mode === 'sync' ? 'suspense:false' : 'suspense:true'}），同事创建了“同事的笔记 v${docVersion}”`
        : `重挂载（${mode === 'sync' ? 'suspense:false' : 'suspense:true'}）`,
    );
    root.render(
      React.createElement(LoadDemo, {
        mode,
        phase: currentArgs.phase,
        url: handleB.url,
        log,
        onDoc(info) {
          docInfo = info;
          emitSnapshot();
        },
      }),
    );
  };

  return {
    update(args) {
      const previous = currentArgs;
      currentArgs = args;

      if (args.mode !== mountedMode) {
        const freshDoc = mountedMode !== undefined;
        mountedMode = args.mode;
        mount(args.mode, { freshDoc });
      } else {
        if (args.phase === 'received' && previous.phase === 'awaiting') {
          log('分享链接到达，useDocument 开始 find');
        }
        if (args.action === 'peer-edit' && args.action !== lastAction) {
          handleB.change((d) => {
            d.revision += 1;
          });
          log(`同事在 Repo B 写入 revision=${handleB.doc()!.revision}`);
        }
        root?.render(
          React.createElement(LoadDemo, {
            mode: args.mode,
            phase: args.phase,
            url: handleB.url,
            log,
            onDoc(info) {
              docInfo = info;
              emitSnapshot();
            },
          }),
        );
      }
      lastAction = args.action;
    },
    dispose() {
      root?.unmount();
      void repoA.shutdown();
      void repoB.shutdown();
    },
  };
}

/**
 * 顶层分流：这里没有任何 hook，可以安全地按 phase 与 mode 选分支。
 * 没有 URL（等待分享链接）时，两种模式都不挂载调用 useDocument 的子组件。
 */
function LoadDemo(props: LoadDemoProps) {
  if (props.phase === 'awaiting') {
    return React.createElement(
      'div',
      { style: styles.wrap },
      React.createElement('strong', null, '分享链接还没到'),
      React.createElement(
        'div',
        { style: styles.small },
        'useDocument 拿到的 id 是 undefined：同步模式安静地返回 [undefined, 空函数]；',
        'Suspense 模式则要求父组件先守住 URL，再挂载会挂起的子组件。',
      ),
      React.createElement(
        'div',
        { style: styles.small },
        '文档在同事的 Repo B 上（BroadcastChannel 组网），Repo A 要等链接到达才能 find。',
      ),
    );
  }
  if (props.mode === 'suspense') {
    return React.createElement(
      React.Suspense,
      {
        fallback: React.createElement(FallbackProbe, { log: props.log }),
      },
      React.createElement(NoteViewSuspense, props),
    );
  }
  return React.createElement(NoteViewSync, props);
}

function FallbackProbe(props: { log: (text: string) => void }) {
  React.useEffect(() => {
    props.log('Suspense fallback 显示（Promise 抛给了边界）');
  });
  return React.createElement('div', { style: styles.wrap }, '加载中……（Suspense fallback）');
}

/** 同步模式：未就绪时 hook 返回 [undefined, 空函数]，组件自己画占位。 */
function NoteViewSync(props: LoadDemoProps) {
  const [doc, changeDoc] = useDocument<NoteDoc>(props.url, { suspense: false });
  return React.createElement(NoteContent, { ...props, doc, changeDoc, flavor: 'useDocument(url) 默认 suspense:false' });
}

/** Suspense 模式：未就绪时把 Promise 抛给最近的边界。 */
function NoteViewSuspense(props: LoadDemoProps) {
  const [doc, changeDoc] = useDocument<NoteDoc>(props.url, { suspense: true });
  return React.createElement(NoteContent, { ...props, doc, changeDoc, flavor: 'useDocument(url, { suspense: true })' });
}

interface NoteContentProps extends LoadDemoProps {
  doc: NoteDoc | undefined;
  changeDoc: (changeFn: (d: NoteDoc) => void) => void;
  flavor: string;
}

function NoteContent(props: NoteContentProps) {
  const { doc, changeDoc, flavor, log, onDoc } = props;
  const hadDocRef = React.useRef(false);
  const rendersRef = React.useRef(0);
  rendersRef.current += 1;

  React.useEffect(() => {
    if (doc && !hadDocRef.current) {
      hadDocRef.current = true;
      log(`文档就绪：useDocument 返回快照（第 ${rendersRef.current} 次渲染）`);
    }
    onDoc(doc ? { title: doc.title, revision: doc.revision } : { title: null, revision: null });
  });

  if (!doc) {
    return React.createElement(
      'div',
      { style: styles.wrap },
      React.createElement('strong', null, '加载中……'),
      React.createElement(
        'div',
        { style: styles.small },
        'useDocument 返回 undefined，此时的 changeDoc 是空函数——占位 UI 别放写入按钮。',
      ),
      React.createElement('div', { style: styles.small }, flavor),
    );
  }

  return React.createElement(
    'div',
    { style: styles.wrap },
    React.createElement('strong', null, doc.title),
    React.createElement(
      'div',
      { style: styles.small },
      `revision ${doc.revision} · 组件已渲染 ${rendersRef.current} 次`,
    ),
    React.createElement(
      'button',
      {
        type: 'button',
        style: styles.button,
        onClick() {
          log('本地 changeDoc：revision +1');
          changeDoc((d) => {
            d.revision += 1;
          });
        },
      },
      '本地 revision +1',
    ),
    React.createElement('div', { style: styles.small }, flavor),
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '34px 14px 12px',
    height: '100%',
    boxSizing: 'border-box',
    fontSize: '13px',
    lineHeight: 1.5,
  },
  small: {
    fontSize: '12px',
    color: '#46584f',
  },
  button: {
    padding: '5px 12px',
    border: '1px solid #b9c6da',
    borderRadius: '6px',
    background: '#f4f7fc',
    font: 'inherit',
    cursor: 'pointer',
  },
};
