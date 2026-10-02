/**
 * 范例介绍：addPasteRules 对粘贴与拖放文本的变换，以及程序化"模拟粘贴"开关。
 * 前置状态：三种预设各装一组扩展，enablePasteRules 默认开启；粘贴规则扫描粘贴进来的整段文本。
 * 操作：真实粘贴（Ctrl/Cmd+V）markdown 字符串或 URL；或点按钮——按钮会先清空文档，
 *   再对照 insertContentAt 的 applyPasteRules 两个取值。
 * 预期结果：粘贴 **粗体**、_斜体_、URL、%%重点%% 后自动变换为标记；同样的字符串用
 *   applyPasteRules: false 插入则保持纯文本。
 * 阅读主线：与输入规则同构，但正则要加 g 标志、匹配发生在粘贴事务之后。
 */
import { Editor, Extension, markPasteRule, type Extensions } from '@tiptap/core';
import { Bold } from '@tiptap/extension-bold';
import { Code } from '@tiptap/extension-code';
import { Document } from '@tiptap/extension-document';
import { Highlight } from '@tiptap/extension-highlight';
import { Italic } from '@tiptap/extension-italic';
import { Link } from '@tiptap/extension-link';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Strike } from '@tiptap/extension-strike';
import { Text } from '@tiptap/extension-text';

export type PasteRulePreset = 'markdown' | 'url' | 'custom';

export interface PasteRulesArgs {
  preset: PasteRulePreset;
}

export interface PasteRulesSnapshot {
  html: string;
  lastAction: string;
}

export interface PasteRulesInstance {
  update(args: PasteRulesArgs): void;
  dispose(): void;
}

const PRESET_EXTENSIONS: Record<PasteRulePreset, Extensions> = {
  // 内置 mark 粘贴规则：**粗体**、*斜体*、~~删除~~、`代码` 粘贴后同样变换
  markdown: [Document, Paragraph, Text, Bold, Italic, Strike, Code],
  // Link 自带粘贴规则：纯 URL 与 [文字](URL) 粘贴后自动变成链接
  url: [Document, Paragraph, Text, Link],
  // Highlight 只负责提供类型；自定义粘贴规则用 %%语法%%，与内置 ==规则 不冲突
  custom: [Document, Paragraph, Text, Highlight],
};

/** 按钮演示用的样例字符串：与当前预设的规则一一对应（片段间留空格以命中内置边界） */
const SAMPLES: Record<PasteRulePreset, string> = {
  markdown: '**粗体** 和 _斜体_',
  url: '文档见 https://tiptap.dev',
  custom: '这个 %%重点%% 要标出来',
};

export function createPasteRulesDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PasteRulesSnapshot) => void,
): PasteRulesInstance {
  const frame = document.createElement('div');
  frame.className = 'kir-frame';

  const hint = document.createElement('p');
  hint.className = 'kir-hint';

  const container = document.createElement('div');
  container.className = 'kir-editor';

  const actions = document.createElement('div');
  actions.className = 'kir-actions';
  const simulateButton = document.createElement('button');
  simulateButton.className = 'kir-button';
  const plainButton = document.createElement('button');
  plainButton.className = 'kir-button kir-button--plain';
  actions.append(simulateButton, plainButton);

  frame.append(hint, container, actions);
  canvas.replaceWith(frame);

  let lastAction = '（等待粘贴）';
  let editor: Editor | null = null;
  let currentPreset: PasteRulePreset | null = null;

  // 自定义粘贴规则：与输入规则同构，但正则必须带 g 标志（内部用 matchAll 全文扫描）
  const customPasteRules = Extension.create({
    name: 'customPasteRules',
    addPasteRules() {
      return [
        markPasteRule({
          find: /%%([^%]+)%%/g,
          type: this.editor.schema.marks.highlight,
        }),
      ];
    },
  });

  function mount(preset: PasteRulePreset): void {
    editor?.destroy();
    currentPreset = preset;
    lastAction = '（等待粘贴）';

    const next = new Editor({
      element: container,
      extensions:
        preset === 'custom'
          ? [...PRESET_EXTENSIONS.custom, customPasteRules]
          : PRESET_EXTENSIONS[preset],
      content: '<p></p>',
    });
    editor = next;

    next.on('update', () => {
      emit({ html: next.getHTML(), lastAction });
    });

    hint.textContent =
      preset === 'markdown'
        ? '粘贴 **粗体** 和 _斜体_（注意片段间要有空格），粘贴后自动变成标记。'
        : preset === 'url'
          ? '粘贴 https://tiptap.dev 这类 URL，Link 的粘贴规则会自动加链接。'
          : '粘贴含 %%重点%% 的文本，自定义 markPasteRule 把它变成高亮。';

    simulateButton.textContent = '模拟粘贴（applyPasteRules: true）';
    plainButton.textContent = '普通插入（false）';
    emit({ html: next.getHTML(), lastAction });
  }

  function simulate(applyPasteRules: boolean): void {
    if (!editor) {
      return;
    }
    const sample = SAMPLES[currentPreset ?? 'markdown'];
    lastAction = `insertContentAt '${sample}' applyPasteRules: ${applyPasteRules}`;
    // 先清空到空段落再插入，保证结果可重复对照
    editor.commands.clearContent();
    editor.commands.insertContentAt(1, sample, { applyPasteRules });
  }

  const onSimulate = () => simulate(true);
  const onPlain = () => simulate(false);
  simulateButton.addEventListener('click', onSimulate);
  plainButton.addEventListener('click', onPlain);

  return {
    update(nextArgs) {
      if (nextArgs.preset !== currentPreset) {
        mount(nextArgs.preset);
      }
    },
    dispose() {
      simulateButton.removeEventListener('click', onSimulate);
      plainButton.removeEventListener('click', onPlain);
      editor?.destroy();
      editor = null;
      frame.remove();
    },
  };
}
