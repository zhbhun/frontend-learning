import { createRoot } from 'react-dom/client';
/*
 * 订阅与重渲染实验台：useDocument 的订阅语义。
 *
 * 演示内容：左栏组件经 useDocument 订阅整份计数文档（含一个无关字段
 * note），右栏是只收固定 props 的 React.memo 组件；写入路径有三条——
 * 组件自己的 changeDoc、外部 handle.change（不经过 React）、写无关字段。
 * 输入：action（本组件 +1 / 外部 +1 / 写无关字段）。
 * 操作：点画布里的「+1」按钮或切 Controls 的 action。
 * 预期结果：任何来源、任何字段的变更都会让订阅组件重渲染（渲染计数 +1），
 * 因为订阅粒度是整份文档、doc() 每次返回新快照；memo 组件 props 不变，
 * 一次都不重渲染。
 * 阅读主线：useDocument 没有 selector；想要细粒度，拆组件加 memo。
 */
import * as React from 'react';
import { Repo, RepoContext, useDocument, type AutomergeUrl } from '@automerge/react';

import type { ReactLabInstance } from './react-story';

export interface CountDoc {
  count: number;
  note: string;
}

export const RENDER_ACTIONS = ['none', 'local-inc', 'remote-inc', 'unrelated'] as const;
export type RenderAction = (typeof RENDER_ACTIONS)[number];

export interface RenderLabArgs {
  action: RenderAction;
}

export interface RenderLabSnapshot {
  count: number | null;
  note: string;
  subscribedRenders: number;
  memoRenders: number;
  lastAction: string;
}

export type RenderLabInstance = ReactLabInstance<RenderLabArgs>;

interface SubscribedPanelProps {
  url: AutomergeUrl;
  command: RenderAction;
  stats: { subscribed: number; memo: number };
  noteRef: { current: string };
  emit: (snapshot: RenderLabSnapshot) => void;
}

export function createRenderLab(
  host: HTMLElement,
  emit: (snapshot: RenderLabSnapshot) => void,
): RenderLabInstance {
  const repo = new Repo();
  const handle = repo.create<CountDoc>({ count: 0, note: '无关字段备注 v0' });
  const stats = { subscribed: 0, memo: 0 };
  const noteRef = { current: '尚未操作' };
  const root = createRoot(host);
  let lastAction: RenderAction = 'none';
  let unrelatedVersion = 0;

  return {
    update(args) {
      if (args.action !== lastAction) {
        if (args.action === 'remote-inc') {
          noteRef.current = '外部 handle.change：count +1';
          handle.change((d) => {
            d.count += 1;
          });
        } else if (args.action === 'unrelated') {
          unrelatedVersion += 1;
          noteRef.current = `外部写无关字段 note（v${unrelatedVersion}）`;
          handle.change((d) => {
            d.note = `无关字段备注 v${unrelatedVersion}`;
          });
        }
      }
      lastAction = args.action;

      root?.render(
        React.createElement(
          RepoContext.Provider,
          { value: repo },
          React.createElement(
            'div',
            { style: styles.row },
            React.createElement(SubscribedPanel, {
              url: handle.url,
              command: args.action === 'local-inc' ? 'local-inc' : 'none',
              stats,
              noteRef,
              emit,
            }),
            React.createElement(MemoPanel, { label: '我只收固定 props', stats }),
          ),
        ),
      );
    },
    dispose() {
      root?.unmount();
      void repo.shutdown();
    },
  };
}

/** 左栏：订阅整份文档的组件。 */
function SubscribedPanel(props: SubscribedPanelProps) {
  const { url, command, stats, noteRef, emit } = props;
  const [doc, changeDoc] = useDocument<CountDoc>(url);

  stats.subscribed += 1;

  // Controls 的「本组件 +1」：与按钮同一条 changeDoc 路径
  React.useEffect(() => {
    if (command === 'local-inc') {
      noteRef.current = 'Controls：本组件 changeDoc +1';
      changeDoc((d) => {
        d.count += 1;
      });
    }
  }, [command, changeDoc]);

  React.useEffect(() => {
    emit({
      count: doc ? doc.count : null,
      note: doc ? doc.note : '',
      subscribedRenders: stats.subscribed,
      memoRenders: stats.memo,
      lastAction: noteRef.current,
    });
  });

  if (!doc) {
    return React.createElement('div', { style: styles.card }, '文档加载中……');
  }

  return React.createElement(
    'div',
    { style: { ...styles.card, ...styles.subscribed } },
    React.createElement('strong', null, '订阅文档的组件'),
    React.createElement('div', { style: styles.count }, String(doc.count)),
    React.createElement(
      'button',
      {
        type: 'button',
        style: styles.button,
        onClick() {
          noteRef.current = '画布按钮：本组件 changeDoc +1';
          changeDoc((d) => {
            d.count += 1;
          });
        },
      },
      '+1（changeDoc）',
    ),
    React.createElement(
      'div',
      { style: styles.small },
      '无关字段 note：',
      React.createElement('code', null, doc.note),
    ),
    React.createElement(
      'div',
      { style: styles.counter },
      `本组件已渲染 ${stats.subscribed} 次——任何来源、任何字段的变更都算`,
    ),
  );
}

/** 右栏：不订阅文档的 memo 组件，props 不变就跳过重渲染。 */
const MemoPanel = React.memo(function MemoPanel(props: {
  label: string;
  stats: { subscribed: number; memo: number };
}) {
  props.stats.memo += 1;

  return React.createElement(
    'div',
    { style: styles.card },
    React.createElement('strong', null, '未订阅的 memo 组件'),
    React.createElement('div', { style: styles.small }, props.label),
    React.createElement(
      'div',
      { style: styles.small },
      '它不调用任何 automerge hook，文档怎么变都与它无关。',
    ),
    React.createElement(
      'div',
      { style: styles.counter },
      `本组件已渲染 ${props.stats.memo} 次`,
    ),
  );
});

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    gap: '12px',
    padding: '34px 14px 12px',
    height: '100%',
    boxSizing: 'border-box',
    fontSize: '13px',
    lineHeight: 1.5,
  },
  card: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '10px 12px',
    border: '1px solid #dbe3f0',
    borderRadius: '8px',
    background: '#ffffff',
  },
  subscribed: {
    borderColor: '#b9d3c4',
    background: '#f4faf6',
  },
  count: {
    fontSize: '30px',
    fontWeight: 600,
    lineHeight: 1.1,
  },
  button: {
    padding: '5px 12px',
    border: '1px solid #b9c6da',
    borderRadius: '6px',
    background: '#f4f7fc',
    font: 'inherit',
    cursor: 'pointer',
  },
  small: {
    fontSize: '12px',
    color: '#46584f',
    wordBreak: 'break-all',
  },
  counter: {
    fontSize: '12px',
    color: '#5d6f67',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
};
