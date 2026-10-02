/**
 * 范例介绍：CodeBlockLowlight 的高亮来自注入的 lowlight 实例，语言存进节点属性。
 * 前置状态：装 CodeBlockLowlight.configure({ lowlight })（lowlight 用 common 语言包）；
 *   文档含一段说明文字和一个 javascript 代码块，光标定位在代码块内。
 * 操作：点语言按钮切换 language 属性；观察 <code> 类名与高亮片段读数。
 * 预期结果：换语言后「语言属性」「code 类名」同步变化；javascript / css / python
 *   有带 hljs- 类的高亮片段，plaintext 无高亮。
 * 阅读主线：代码文本不变，高亮只是渲染层（装饰器）叠加。
 */
import { Editor } from '@tiptap/core';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { common, createLowlight } from 'lowlight';
import './demo.css';

export interface CodeHighlightSnapshot {
  language: string;
  codeClass: string;
  hljsSpans: number;
}

export interface CodeHighlightInstance {
  update(): void;
  dispose(): void;
}

// 应用侧决定注册哪些语言包：common 覆盖常用语言；追求体积可用 lowlight/core 按需注册
const lowlight = createLowlight(common);

const EXTENSIONS = [
  Document,
  Paragraph,
  Text,
  CodeBlockLowlight.configure({
    lowlight,
    // 未标注语言时代高亮插件走 highlightAuto；给 defaultLanguage 可强制兜底语言
    defaultLanguage: 'plaintext',
  }),
];

const CONTENT =
  '<p>下面是一个代码块，光标在块内，用按钮切换语言：</p>' +
  '<pre><code class="language-javascript">const sum = (a, b) =&gt; a + b; // 求和</code></pre>';

const LANGUAGES = ['javascript', 'css', 'python', 'plaintext'];

export function createCodeHighlightDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CodeHighlightSnapshot) => void,
): CodeHighlightInstance {
  const frame = document.createElement('div');
  frame.className = 'ce-frame';
  canvas.replaceWith(frame);

  const toolbar = document.createElement('div');
  toolbar.className = 'ce-toolbar';

  const hostLabel = document.createElement('p');
  hostLabel.className = 'ce-box-label';
  hostLabel.textContent = '编辑器（可编辑，光标已放进代码块）';
  const host = document.createElement('div');
  host.className = 'ce-editor';

  frame.append(toolbar, hostLabel, host);

  let editor: Editor | null = null;

  function emitSnapshot(): void {
    if (!editor) {
      return;
    }
    // 高亮由插件在渲染层完成，DOM 会在事务提交后刷新，等下一帧再读 DOM
    requestAnimationFrame(() => {
      if (!editor) {
        return;
      }
      const language = editor.getAttributes('codeBlock').language ?? '';
      const codeEl = host.querySelector('pre code');
      const hljsSpans = host.querySelectorAll('[class*="hljs-"]').length;
      emit({
        language: language || '（未设置）',
        codeClass: codeEl?.className || '（无 code 元素）',
        hljsSpans,
      });
    });
  }

  // 语言是节点属性：updateAttributes 只改属性，代码文本原样保留
  for (const language of LANGUAGES) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'ce-btn';
    el.textContent = `language: '${language}'`;
    el.addEventListener('click', () => {
      if (!editor) {
        return;
      }
      editor
        .chain()
        .focus()
        // 光标在代码块内：updateAttributes 更新当前 codeBlock 的 language 属性
        .updateAttributes('codeBlock', { language })
        .run();
    });
    toolbar.append(el);
  }

  editor = new Editor({
    element: host,
    extensions: EXTENSIONS,
    content: CONTENT,
  });
  editor.on('transaction', emitSnapshot);

  // 把光标定位到代码块内，语言切换命令作用于当前节点
  let codeBlockPos: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'codeBlock') {
      codeBlockPos = pos + 1; // 节点内部起点
      return false;
    }
    return true;
  });
  if (codeBlockPos !== null) {
    editor.commands.setTextSelection(codeBlockPos);
  }
  emitSnapshot();

  return {
    update() {
      emitSnapshot();
    },
    dispose() {
      const current = editor;
      editor = null;
      current?.destroy();
      frame.remove();
    },
  };
}
