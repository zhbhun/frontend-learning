/**
 * 范例介绍：原生拼写检查只是 spellcheck 与 lang 两个标准 HTML 属性，运行期可切。
 * 前置状态：StarterKit 编辑器，初始 attributes 已带 spellcheck="true" 与 lang="en-US"。
 * 主要操作：开关「spellcheck」、切换「lang」；运行期按官方模式展开旧 editorProps
 *   与 attributes 后调用 setOptions（不展开会丢掉已有的事件钩子等配置）。
 * 预期结果：读数与 DOM 实际属性一致——spellcheck 为 'true'/'false' 字符串；
 *   选「无」时 lang 从 DOM 移除。红线与建议是否出现由浏览器与字典决定。
 * 阅读主线：editor.view.dom 的 spellcheck / lang 属性 → 属性是请求，浏览器说了算。
 */
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

export type SpellcheckLang = 'en-US' | 'zh-CN' | 'de-DE' | 'none';

export interface SpellcheckArgs {
  spellcheck: boolean;
  lang: SpellcheckLang;
}

export interface SpellcheckSnapshot {
  spellcheck: string;
  lang: string;
}

export interface SpellcheckInstance {
  update(args: SpellcheckArgs): void;
  dispose(): void;
}

export function createSpellcheckDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SpellcheckSnapshot) => void,
): SpellcheckInstance {
  const frame = document.createElement('div');
  frame.className = 'ax-frame';

  const hint = document.createElement('p');
  hint.className = 'ax-hint';
  hint.textContent =
    '输入拼错的英文试试（如 sentense）；红线与建议由浏览器决定，需已安装对应语言字典。';

  const container = document.createElement('div');
  container.className = 'ax-editor';
  frame.append(hint, container);
  canvas.replaceWith(frame);

  const editor = new Editor({
    element: container,
    extensions: [StarterKit],
    content: '<p>This sentense has a spelling mistake.</p>',
    editorProps: {
      attributes: {
        spellcheck: 'true',
        lang: 'en-US',
      },
    },
  });

  function snapshot(): SpellcheckSnapshot {
    const dom = editor.view.dom;
    return {
      spellcheck: dom.getAttribute('spellcheck') ?? '未设置',
      lang: dom.getAttribute('lang') ?? '未设置',
    };
  }

  function applyAttributes(args: SpellcheckArgs): void {
    const { editorProps } = editor.options;
    // 官方模式：展开旧的 attributes 保留 class、role、lang 等，再覆盖 spellcheck
    const previous = (editorProps?.attributes ?? {}) as Record<string, string>;
    const attributes: Record<string, string> = {
      ...previous,
      // 标准 HTML 属性：值必须是字符串
      spellcheck: args.spellcheck ? 'true' : 'false',
    };
    // 从对象里删掉键才会把属性从 DOM 移除；赋 undefined 会渲染出字面量
    if (args.lang !== 'none') {
      attributes.lang = args.lang;
    } else {
      delete attributes.lang;
    }
    editor.setOptions({
      editorProps: {
        ...editorProps,
        attributes,
      },
    });
    emit(snapshot());
  }

  emit(snapshot());

  return {
    update(args) {
      applyAttributes(args);
    },
    dispose() {
      editor.destroy();
      frame.remove();
    },
  };
}
