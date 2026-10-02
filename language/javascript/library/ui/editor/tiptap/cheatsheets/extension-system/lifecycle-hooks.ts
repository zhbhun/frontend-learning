/**
 * 范例介绍：扩展生命周期钩子的触发时机——onBeforeCreate 到 onDestroy。
 * 前置状态：编辑器装有一个 Trace 扩展，8 个生命周期钩子都会向右侧日志追加记录；
 *   onBeforeCreate 还会向 options.content 追加一个段落。
 * 操作：点进左侧编辑器输入文字、点日志区让它失焦；点「销毁编辑器」或「重建编辑器」。
 * 预期结果：初始文档里能看到 onBeforeCreate 追加的段落（证明它先于文档解析执行）；
 *   onCreate 在视图挂载后触发；输入一次文字依次触发 onUpdate 与 onTransaction，
 *   只点动光标则只有 onSelectionUpdate 与 onTransaction；销毁时触发 onDestroy。
 * 阅读主线：钩子就是编辑器事件的订阅——时机由创建流程决定，顺序固定可预测。
 */
import { Editor, Extension, type Extensions } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';

export interface LifecycleLogEntry {
  hook: string;
  detail: string;
}

export interface LifecycleSnapshot {
  lastHook: string;
  total: string;
}

export interface LifecycleInstance {
  dispose(): void;
}

const BASE: Extensions = [Document, Paragraph, Text];

const INITIAL_CONTENT = '<p>构造参数传入的段落。点进这里输入文字试试。</p>';

export function createLifecycleDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: LifecycleSnapshot) => void,
): LifecycleInstance {
  const frame = document.createElement('div');
  frame.className = 'ext-frame';
  canvas.replaceWith(frame);

  const hint = document.createElement('p');
  hint.className = 'ext-hint';
  hint.textContent = '点进编辑器输入文字、点日志区让它失焦，对照右侧日志观察钩子顺序。';

  const toolbar = document.createElement('div');
  toolbar.className = 'ext-toolbar';

  const columns = document.createElement('div');
  columns.className = 'ext-columns';

  // 左列：编辑器
  const editorColumn = document.createElement('div');
  editorColumn.className = 'ext-column';
  const editorBox = document.createElement('div');
  editorBox.className = 'ext-editor';
  editorColumn.append(editorBox);

  // 右列：钩子日志
  const logColumn = document.createElement('div');
  logColumn.className = 'ext-column';
  const logLabel = document.createElement('p');
  logLabel.className = 'ext-box-label';
  logLabel.textContent = '钩子触发日志';
  const logBox = document.createElement('div');
  logBox.className = 'ext-log';
  logColumn.append(logLabel, logBox);

  columns.append(editorColumn, logColumn);
  frame.append(hint, toolbar, columns);

  const log: LifecycleLogEntry[] = [];

  function renderLog(): void {
    logBox.replaceChildren(
      ...log.map((entry) => {
        const item = document.createElement('div');
        item.className = 'ext-log-item';
        const hook = document.createElement('span');
        hook.className = 'ext-log-hook';
        hook.textContent = entry.hook;
        const detail = document.createElement('span');
        detail.className = 'ext-log-detail';
        detail.textContent = entry.detail;
        item.append(hook, detail);
        return item;
      }),
    );
    logBox.scrollTop = logBox.scrollHeight;
  }

  function record(hook: string, detail: string): void {
    log.push({ hook, detail });
    renderLog();
    emit({
      lastHook: log.length ? log[log.length - 1].hook : '（无）',
      total: `${log.length} 条`,
    });
  }

  /** 每个钩子向日志追加一条记录；工厂函数让「重建」拿到全新的日志。 */
  function createTraceExtension() {
    return Extension.create({
      name: 'trace',

      // 时机最早的钩子：ExtensionManager 已装配完 schema，但初始文档还没解析、视图还没挂载
      onBeforeCreate() {
        record('onBeforeCreate', 'schema 已装配；此刻改 options.content 仍会生效');
        // 初始文档在 beforeCreate 之后才解析：追加的段落会出现在初始文档里
        this.editor.options.content = `${String(this.editor.options.content)}<p>onBeforeCreate 追加的段落——初始文档此刻尚未解析。</p>`;
      },

      // 视图挂载后触发（挂载后的宏任务里），此刻 editor.state 已就绪
      onCreate() {
        record('onCreate', '视图已挂载，editor.state 就绪');
      },

      // 只有文档内容变化才触发
      onUpdate() {
        record('onUpdate', '文档内容变化');
      },

      // 只有选区变化才触发（不伴随文档变化）
      onSelectionUpdate() {
        record('onSelectionUpdate', '只有选区变化');
      },

      // 任何状态变化（文档或选区）都触发
      onTransaction() {
        record('onTransaction', '状态变化（文档或选区都会走到这里）');
      },

      onFocus() {
        record('onFocus', '编辑器获得焦点');
      },

      onBlur() {
        record('onBlur', '编辑器失去焦点');
      },

      // destroy() 时触发：事件尚未注销，还能做最后清理
      onDestroy() {
        record('onDestroy', '编辑器已销毁，事件即将注销');
      },
    });
  }

  let editor: Editor | null = null;

  function createEditor(): void {
    editor = new Editor({
      element: { mount: editorBox },
      extensions: [...BASE, createTraceExtension()],
      content: INITIAL_CONTENT,
    });
  }

  function addToolbarButton(label: string, onClick: () => void): void {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ext-btn';
    button.textContent = label;
    button.addEventListener('click', onClick);
    toolbar.append(button);
  }

  // 销毁：触发 onDestroy 后编辑器不可再用
  addToolbarButton('销毁编辑器', () => {
    editor?.destroy();
  });

  // 重建：先销毁旧实例（其 onDestroy 会随日志一起清空），再走一遍完整创建流程
  addToolbarButton('重建编辑器', () => {
    editor?.destroy();
    log.length = 0;
    renderLog();
    createEditor();
  });

  createEditor();

  return {
    dispose() {
      editor?.destroy();
      frame.remove();
    },
  };
}
