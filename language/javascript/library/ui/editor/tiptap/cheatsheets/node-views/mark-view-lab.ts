/**
 * 范例介绍：标记视图实验台——把 Badge 装进编辑器，观察 mark view 的行为与输出。
 * 前置状态：初始 content 里有两处 <span data-badge>，走 parseHTML 规则被收进文档；
 *   右侧事件日志由扩展的 onEvent 回调流入，getHTML 输出实时刷新。
 * 操作：点编辑器里的徽标本身循环切换等级（走 mark view 的 updateAttributes 助手）；
 *   选中文字后点「挂 / 摘 badge」；切换 Controls 的「定义 update 方法」会重建实验台。
 * 预期结果：定义 update 时点徽标只多一行 update()（复用 DOM），不定义时出现
 *   destroy() + create() 一对；getHTML 始终输出 <span data-badge="…">，
 *   与 mark view 的 mark + span 两层结构无关。
 * 阅读主线：mark view 负责编辑器内的呈现，renderHTML 负责输出——两边对照
 *   就是"视图与输出无关"的可观察证据。
 */
import { Editor } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { Badge, badgeStats, type BadgeEvent, type BadgeLevel } from './badge-mark';

export interface MarkViewLabArgs {
  withUpdate: boolean;
}

export interface MarkViewLabSnapshot {
  cursorBadge: string;
  updates: number;
  destroys: number;
}

export interface MarkViewLabInstance {
  update(args: MarkViewLabArgs): void;
  dispose(): void;
}

const INITIAL_CONTENT = `
<p>点击下面文字里的徽标本身，等级会循环切换；也可以选中文字后点上方按钮。</p>
<p>项目状态：<span data-badge="info">进行中</span>，风险项：<span data-badge="warn">待评估</span>。</p>
`;

const EVENT_LABELS: Record<BadgeEvent, string> = {
  create: 'create()　　渲染函数被调用，返回 dom 与 contentDOM',
  update: 'update()　　等级变化，返回 true 复用现有 DOM',
  destroy: 'destroy()　 标记被移除或编辑器销毁',
};

export function createMarkViewLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: MarkViewLabSnapshot) => void,
): MarkViewLabInstance {
  const frame = document.createElement('div');
  frame.className = 'nv-lab';
  canvas.replaceWith(frame);

  // 顶部：工具按钮行
  const toolbar = document.createElement('div');
  toolbar.className = 'nv-toolbar';

  // 主区：左列编辑器，右列事件日志 + getHTML 输出
  const columns = document.createElement('div');
  columns.className = 'nv-columns';

  const editorBox = document.createElement('div');
  editorBox.className = 'nv-editor';

  const sideBox = document.createElement('div');
  sideBox.className = 'nv-logbox';

  const logLabel = document.createElement('p');
  logLabel.className = 'nv-box-label';
  logLabel.textContent = 'mark view 事件日志';
  const logPre = document.createElement('pre');
  logPre.className = 'nv-log';

  const htmlLabel = document.createElement('p');
  htmlLabel.className = 'nv-box-label';
  htmlLabel.textContent = 'getHTML()（走 renderHTML，与 mark view 无关）';
  const htmlPre = document.createElement('pre');
  htmlPre.className = 'nv-log';

  sideBox.append(logLabel, logPre, htmlLabel, htmlPre);
  columns.append(editorBox, sideBox);
  frame.append(toolbar, columns);

  const logLines: string[] = [];

  function log(text: string): void {
    logLines.unshift(text);
    if (logLines.length > 12) {
      logLines.length = 12;
    }
    logPre.textContent = logLines.join('\n');
  }

  function addToolbarButton(label: string, onClick: () => void): void {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nv-btn';
    button.textContent = label;
    button.addEventListener('click', onClick);
    toolbar.append(button);
  }

  let editor: Editor | undefined;

  function emitSnapshot(): void {
    if (!editor) return;
    // 状态验证：isActive + getAttributes 读光标处的标记
    const active = editor.isActive('badge');
    const level = editor.getAttributes('badge').level as BadgeLevel | undefined;

    emit({
      cursorBadge: active ? `有（level = ${level ?? '?'})` : '（无）',
      updates: badgeStats.updated,
      destroys: badgeStats.destroyed,
    });
    htmlPre.textContent = editor.getHTML();
  }

  function build(args: MarkViewLabArgs): void {
    editor?.destroy();
    logLines.length = 0;
    logPre.textContent = '';
    badgeStats.created = 0;
    badgeStats.updated = 0;
    badgeStats.destroyed = 0;

    editor = new Editor({
      element: { mount: editorBox },
      extensions: [
        Document,
        Paragraph,
        Text,
        Badge.configure({
          withUpdate: args.withUpdate,
          onEvent: (event) => log(EVENT_LABELS[event]),
        }),
      ],
      content: INITIAL_CONTENT,
    });

    editor.on('transaction', emitSnapshot);
    emitSnapshot();
  }

  addToolbarButton('挂 / 摘 badge', () => {
    if (!editor) return;
    editor.chain().focus().toggleMark('badge').run();
  });

  build({ withUpdate: true });

  return {
    update(nextArgs) {
      build(nextArgs);
    },
    dispose() {
      editor?.destroy();
      frame.remove();
    },
  };
}
