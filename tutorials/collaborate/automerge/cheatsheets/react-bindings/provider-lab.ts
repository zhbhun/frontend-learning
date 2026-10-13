import { createRoot } from 'react-dom/client';
/*
 * Provider 实验台：RepoContext 与 useRepo。
 *
 * 演示内容：一棵三层组件树（Demo → Panel → DeepChild），仓库在组件树外
 * 创建一次，只有「提供 Provider」时才经 RepoContext 注入；深层子组件用
 * useRepo() 取回同一个实例并展示 peerId。
 * 输入：mode（是否提供 Provider）、action（是否在子组件里新建文档）。
 * 操作：在 Controls 里切换 mode 与 action。
 * 预期结果：mode = without 时，DeepChild 渲染第一行 useRepo() 即抛出
 * "Repo was not found on RepoContext."，由错误边界接住并显示报错原文；
 * mode = with 时子组件拿到仓库，新建文档走的就是这个共享实例。
 * 阅读主线：useRepo 的全部逻辑就是读一次上下文；Provider 缺失是渲染期错误，
 * 要靠错误边界兜底。
 */
import * as React from 'react';
import { Repo, RepoContext, useRepo } from '@automerge/react';

import type { ReactLabInstance } from './react-story';

export const PROVIDER_MODES = ['with', 'without'] as const;
export type ProviderMode = (typeof PROVIDER_MODES)[number];

export const PROVIDER_ACTIONS = ['none', 'create-doc'] as const;
export type ProviderAction = (typeof PROVIDER_ACTIONS)[number];

export interface ProviderLabArgs {
  mode: ProviderMode;
  action: ProviderAction;
}

export interface ProviderLabSnapshot {
  mode: ProviderMode;
  peerId: string | null;
  createdCount: number;
  error: string | null;
}

export type ProviderLabInstance = ReactLabInstance<ProviderLabArgs>;

interface LabProps {
  repo: Repo;
  args: ProviderLabArgs;
  lastAction: string;
  emit: (snapshot: ProviderLabSnapshot) => void;
}

export function createProviderLab(
  host: HTMLElement,
  emit: (snapshot: ProviderLabSnapshot) => void,
): ProviderLabInstance {
  // 仓库在组件树外创建一次：它不属于任何一次渲染
  const repo = new Repo();
  let root: ReturnType<typeof createRoot> | undefined;
  let currentMode: ProviderMode | undefined;
  let lastAction = '尚未操作';

  const renderWith = (args: ProviderLabArgs) => {
    root?.render(
      React.createElement(ProviderDemo, {
        repo,
        args,
        lastAction,
        emit,
      }),
    );
  };

  return {
    update(args) {
      // mode 决定错误边界的走向，切换时整体重挂载，让状态从头开始
      if (args.mode !== currentMode) {
        currentMode = args.mode;
        root?.unmount();
        host.replaceChildren();
        root = createRoot(host);
      }
      if (args.action === 'create-doc') {
        lastAction = 'Controls：子组件里新建文档';
      } else {
        lastAction = '尚未操作';
      }
      renderWith(args);
    },
    dispose() {
      root?.unmount();
      void repo.shutdown();
    },
  };
}

interface TitleDoc {
  title: string;
}

function ProviderDemo(props: LabProps) {
  const { repo, args, lastAction, emit } = props;

  const tree = React.createElement(Panel, { repo, args, lastAction, emit });
  const guarded = React.createElement(ProviderBoundary, { mode: args.mode, emit }, tree);

  // 只有 with 模式经 RepoContext.Provider 注入仓库
  if (args.mode === 'with') {
    return React.createElement(RepoContext.Provider, { value: repo }, guarded);
  }
  return guarded;
}

/** 中间层：不碰仓库，只是证明仓库能穿透多层组件。 */
function Panel(props: LabProps) {
  return React.createElement(
    'div',
    { style: styles.column },
    React.createElement(
      'p',
      { style: styles.muted },
      '中间层 Panel 不碰仓库，仓库由最深层的 DeepChild 自己用 useRepo() 取。',
    ),
    React.createElement(DeepChild, props),
  );
}

function DeepChild(props: LabProps) {
  const { args, lastAction, emit } = props;
  // 没有 Provider 时，这一行在渲染期直接抛错
  const repo = useRepo();
  const createdRef = React.useRef<{ url: string; title: string }[]>([]);

  React.useEffect(() => {
    if (args.action !== 'create-doc') {
      return;
    }
    const index = createdRef.current.length + 1;
    const title = `子组件新建的文档 ${index}`;
    const handle = repo.create<TitleDoc>({ title });
    createdRef.current = [...createdRef.current, { url: handle.url, title }];
  }, [args.action, repo]);

  React.useEffect(() => {
    emit({
      mode: args.mode,
      peerId: String(repo.peerId),
      createdCount: createdRef.current.length,
      error: null,
    });
  });

  return React.createElement(
    'div',
    { style: styles.card },
    React.createElement('strong', null, 'DeepChild（深层子组件）'),
    React.createElement(
      'div',
      { style: styles.line },
      'useRepo() → peerId ',
      React.createElement('code', null, String(repo.peerId)),
    ),
    createdRef.current.length > 0
      ? React.createElement(
          'div',
          { style: styles.line },
          `仓库里为本次会话新建了 ${createdRef.current.length} 份文档：`,
          createdRef.current.map((item, index) =>
            React.createElement(
              'div',
              { key: item.url, style: styles.small },
              `${index + 1}. ${item.title}`,
            ),
          ),
        )
      : React.createElement(
          'div',
          { style: styles.muted },
          '在 Controls 里选「子组件新建文档」，就用这个仓库实例创建。',
        ),
    React.createElement('div', { style: styles.small }, lastAction),
  );
}

interface BoundaryState {
  error: Error | null;
}

class ProviderBoundary extends React.Component<
  { mode: ProviderMode; emit: (snapshot: ProviderLabSnapshot) => void; children?: React.ReactNode },
  BoundaryState
> {
  override state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  override render() {
    if (this.state.error) {
      return React.createElement(ErrorCard, {
        error: this.state.error,
        mode: this.props.mode,
        emit: this.props.emit,
      });
    }
    return this.props.children;
  }
}

function ErrorCard(props: {
  error: Error;
  mode: ProviderMode;
  emit: (snapshot: ProviderLabSnapshot) => void;
}) {
  React.useEffect(() => {
    props.emit({
      mode: props.mode,
      peerId: null,
      createdCount: 0,
      error: props.error.message,
    });
  });

  return React.createElement(
    'div',
    { style: { ...styles.card, ...styles.errorCard } },
    React.createElement('strong', null, '错误边界接住了渲染期报错'),
    React.createElement('div', { style: styles.line }, props.error.message),
    React.createElement(
      'div',
      { style: styles.muted },
      '没有 Provider 时 useRepo() 第一行就抛错；切回「已提供」即恢复。',
    ),
  );
}

const styles: Record<string, React.CSSProperties> = {
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '34px 14px 12px',
    height: '100%',
    boxSizing: 'border-box',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '10px 12px',
    border: '1px solid #dbe3f0',
    borderRadius: '8px',
    background: '#ffffff',
    fontSize: '13px',
    lineHeight: 1.5,
  },
  errorCard: {
    borderColor: '#f3c2c2',
    background: '#fdf3f3',
  },
  line: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '12px',
    wordBreak: 'break-all',
  },
  small: {
    fontSize: '12px',
    color: '#46584f',
  },
  muted: {
    margin: 0,
    fontSize: '12px',
    color: '#7a8794',
  },
};
