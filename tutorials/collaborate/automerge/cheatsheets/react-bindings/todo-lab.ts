import { createRoot } from 'react-dom/client';
/*
 * 待办清单实验台：在组件里变更文档。
 *
 * 演示内容：一个真实的 React 待办组件——受控输入框提交进文档、复选框切换
 * 完成、一键清掉已完成；文档由组件树外的 Repo 持有，组件只经 useDocument
 * 拿 [doc, changeDoc]。
 * 输入：action（Controls 触发的外部写入）、text（追加用的文本）。
 * 操作：在画布里输入回车或点「添加」「清掉已完成」；或用 Controls 从外部
 * handle.change 写入。
 * 预期结果：两条路径都改同一份文档，清单与读数同步更新，组件渲染计数每次
 * 变更恰好 +1；加载完成前 changeDoc 是空函数，占位 UI 不放写入按钮。
 * 阅读主线：changeDoc 就是 handle.change 的组件内绑定；文档是唯一数据源，
 * UI 是它的投影。
 */
import * as React from 'react';
import { Repo, RepoContext, useDocument, type AutomergeUrl } from '@automerge/react';

import type { ReactLabInstance } from './react-story';

export interface TodoItem {
  title: string;
  done: boolean;
}

export interface TodoDoc {
  todos: TodoItem[];
}

export const TODO_ACTIONS = ['none', 'add', 'toggle-first', 'clear-done'] as const;
export type TodoAction = (typeof TODO_ACTIONS)[number];

export interface TodoLabArgs {
  action: TodoAction;
  text: string;
}

export interface TodoLabSnapshot {
  total: number;
  done: number;
  renders: number;
  lastAction: string;
}

export type TodoLabInstance = ReactLabInstance<TodoLabArgs>;

interface TodoAppProps {
  url: AutomergeUrl;
  stats: { renders: number };
  noteRef: { current: string };
  emit: (snapshot: TodoLabSnapshot) => void;
}

export function createTodoLab(
  host: HTMLElement,
  emit: (snapshot: TodoLabSnapshot) => void,
): TodoLabInstance {
  const repo = new Repo();
  const handle = repo.create<TodoDoc>({
    todos: [
      { title: '读完 Repo 与 DocHandle', done: true },
      { title: '把文档接进 React 组件', done: false },
    ],
  });
  const stats = { renders: 0 };
  const noteRef = { current: '尚未操作' };
  const root = createRoot(host);
  let lastAction: TodoAction = 'none';

  const runExternal = (args: TodoLabArgs) => {
    // Controls 走「外部写入」：不经过组件，直接在 handle 上 change——
    // 对文档来说与 changeDoc 等价，订阅组件照常重渲染。
    if (args.action === 'add') {
      const title = args.text.trim() || '同事从外部追加的一条';
      noteRef.current = `外部 handle.change：追加“${title}”`;
      handle.change((d) => {
        d.todos.push({ title, done: false });
      });
    } else if (args.action === 'toggle-first') {
      noteRef.current = '外部 handle.change：勾选第一条';
      handle.change((d) => {
        const first = d.todos[0];
        if (first) {
          first.done = !first.done;
        }
      });
    } else if (args.action === 'clear-done') {
      noteRef.current = '外部 handle.change：清掉已完成';
      handle.change((d) => {
        d.todos = d.todos.filter((item) => !item.done);
      });
    }
  };

  return {
    update(args) {
      if (args.action !== 'none' && args.action !== lastAction) {
        runExternal(args);
      }
      lastAction = args.action;

      root?.render(
        React.createElement(RepoContext.Provider, {
          value: repo,
          children: React.createElement(TodoApp, {
            url: handle.url,
            stats,
            noteRef,
            emit,
          }),
        }),
      );
    },
    dispose() {
      root?.unmount();
      void repo.shutdown();
    },
  };
}

function TodoApp(props: TodoAppProps) {
  const { url, stats, noteRef, emit } = props;
  const [doc, changeDoc] = useDocument<TodoDoc>(url);
  const [draft, setDraft] = React.useState('');

  // 演示用渲染计数：严格模式之外每次提交恰好计一次
  stats.renders += 1;

  const addTodo = () => {
    const title = draft.trim() || '一条新待办';
    noteRef.current = `组件 changeDoc：添加“${title}”`;
    changeDoc((d) => {
      d.todos.push({ title, done: false });
    });
    setDraft('');
  };

  const toggleTodo = (index: number) => {
    noteRef.current = `组件 changeDoc：勾选第 ${index + 1} 条`;
    changeDoc((d) => {
      const item = d.todos[index];
      if (item) {
        item.done = !item.done;
      }
    });
  };

  const clearDone = () => {
    noteRef.current = '组件 changeDoc：清掉已完成';
    changeDoc((d) => {
      d.todos = d.todos.filter((item) => !item.done);
    });
  };

  React.useEffect(() => {
    emit({
      total: doc ? doc.todos.length : 0,
      done: doc ? doc.todos.filter((item) => item.done).length : 0,
      renders: stats.renders,
      lastAction: noteRef.current,
    });
  });

  if (!doc) {
    // 文档在组件树外已就绪，正常到不了这里；加载中的 changeDoc 是空函数
    return React.createElement('div', { style: styles.wrap }, '文档加载中……');
  }

  const doneCount = doc.todos.filter((item) => item.done).length;

  return React.createElement(
    'div',
    { style: styles.wrap },
    React.createElement(
      'form',
      {
        style: styles.form,
        onSubmit(event) {
          event.preventDefault();
          addTodo();
        },
      },
      React.createElement('input', {
        style: styles.input,
        value: draft,
        placeholder: '输入待办后回车',
        onChange(event) {
          setDraft(event.target.value);
        },
      }),
      React.createElement('button', { type: 'submit', style: styles.button }, '添加'),
    ),
    React.createElement(
      'div',
      { style: styles.list },
      doc.todos.map((item, index) =>
        React.createElement(
          'label',
          { key: `${index}-${item.title}`, style: styles.row },
          React.createElement('input', {
            type: 'checkbox',
            checked: item.done,
            onChange() {
              toggleTodo(index);
            },
          }),
          React.createElement(
            'span',
            { style: item.done ? styles.doneTitle : styles.title },
            item.title,
          ),
        ),
      ),
    ),
    React.createElement(
      'button',
      { type: 'button', style: styles.button, onClick: clearDone },
      `清掉已完成（${doneCount}）`,
    ),
    React.createElement(
      'div',
      { style: styles.counter },
      `组件已渲染 ${stats.renders} 次 · 待办 ${doc.todos.length} 条 / 已完成 ${doneCount} 条`,
    ),
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '34px 14px 12px',
    height: '100%',
    boxSizing: 'border-box',
    fontSize: '13px',
    lineHeight: 1.5,
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
  },
  button: {
    padding: '5px 12px',
    border: '1px solid #b9c6da',
    borderRadius: '6px',
    background: '#f4f7fc',
    font: 'inherit',
    cursor: 'pointer',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
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
    color: '#1f2d3d',
  },
  doneTitle: {
    color: '#9aa7b4',
    textDecoration: 'line-through',
  },
  counter: {
    fontSize: '12px',
    color: '#5d6f67',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
};
