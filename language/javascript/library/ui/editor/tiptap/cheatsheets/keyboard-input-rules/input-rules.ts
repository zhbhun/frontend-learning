/**
 * 范例介绍：addInputRules 的内置 Markdown 规则、自定义规则写法与程序化触发开关。
 * 前置状态：三种预设各装一组扩展，enableInputRules 默认开启；输入规则监听"刚输入的文本"。
 * 操作：在编辑器空行里直接打字（如 **粗体**、# 加空格、%%高亮%%）；或点按钮——按钮会先清空
 *   文档，再对照 insertContentAt 的 applyInputRules 两个取值。
 * 预期结果：打字命中正则后文本自动变换为标记 / 节点 / 块类型；程序化插入同样的字符串，
 *   只有 applyInputRules: true 才触发同一条规则链。
 * 阅读主线：find 正则锚定输入末尾（$），helper 决定变换方式，模拟插入与真实打字走同一入口。
 */
import {
  Editor,
  Extension,
  markInputRule,
  nodeInputRule,
  textInputRule,
  type Extensions,
} from '@tiptap/core';
import { Blockquote } from '@tiptap/extension-blockquote';
import { Bold } from '@tiptap/extension-bold';
import { BulletList, OrderedList } from '@tiptap/extension-list';
import { Code } from '@tiptap/extension-code';
import { Document } from '@tiptap/extension-document';
import { Heading } from '@tiptap/extension-heading';
import { Highlight } from '@tiptap/extension-highlight';
import { HorizontalRule } from '@tiptap/extension-horizontal-rule';
import { Italic } from '@tiptap/extension-italic';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Strike } from '@tiptap/extension-strike';
import { Text } from '@tiptap/extension-text';

export type InputRulePreset = 'marks' | 'blocks' | 'custom';

export interface InputRulesArgs {
  preset: InputRulePreset;
}

export interface InputRulesSnapshot {
  html: string;
  lastAction: string;
}

export interface InputRulesInstance {
  update(args: InputRulesArgs): void;
  dispose(): void;
}

const PRESET_EXTENSIONS: Record<InputRulePreset, Extensions> = {
  // 内置 mark 规则：**粗体**、*斜体*、~~删除~~、`代码`（均需行首或空格起头）
  marks: [Document, Paragraph, Text, Bold, Italic, Strike, Code],
  // 内置块级规则：# 加空格变标题、> 引用、- 列表、1. 有序列表（均需块首）
  blocks: [Document, Paragraph, Text, Heading, Blockquote, BulletList, OrderedList],
  // Highlight 与 HorizontalRule 只负责提供类型；本预设的自定义规则用不同语法注册
  custom: [Document, Paragraph, Text, Highlight, HorizontalRule],
};

/**
 * 按钮演示用的样例字符串：与当前预设的规则一一对应。
 * 块级规则在"# 加空格"的瞬间触发，所以样例就是触发时刻的字符串。
 */
const SAMPLES: Record<InputRulePreset, string> = {
  marks: '**粗体**',
  blocks: '# ',
  custom: '%%高亮%%',
};

export function createInputRulesDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: InputRulesSnapshot) => void,
): InputRulesInstance {
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

  let lastAction = '（等待输入）';
  let editor: Editor | null = null;
  let currentPreset: InputRulePreset | null = null;

  // 自定义扩展：三个 helper 各注册一条规则，观察它们变换方式的差别。
  // 内置规则通常会给 mark 正则加 (?:^|\s) 边界，这里为了演示顺手去掉了。
  const customRules = Extension.create({
    name: 'customRules',
    addInputRules() {
      return [
        // markInputRule：命中后把标记加在输入的文本上（%%文本%% 变高亮）
        markInputRule({
          find: /%%([^%]+)%%$/,
          type: this.editor.schema.marks.highlight,
        }),
        // textInputRule：命中后替换为固定文本（-> 变箭头字符）
        textInputRule({ find: /->$/, replace: '→' }),
        // nodeInputRule：命中后插入节点（@@@ 变分隔线；内置 HorizontalRule 的 --- 不冲突）
        nodeInputRule({
          find: /@@@$/,
          type: this.editor.schema.nodes.horizontalRule,
        }),
      ];
    },
  });

  function mount(preset: InputRulePreset): void {
    editor?.destroy();
    currentPreset = preset;
    lastAction = '（等待输入）';

    const next = new Editor({
      element: container,
      extensions:
        preset === 'custom'
          ? [...PRESET_EXTENSIONS.custom, customRules]
          : PRESET_EXTENSIONS[preset],
      // 空文档起步：mark 与块级规则大多要求行首或块首，空行最好触发
      content: '<p></p>',
    });
    editor = next;

    next.on('update', () => {
      emit({ html: next.getHTML(), lastAction });
    });

    hint.textContent =
      preset === 'marks'
        ? '在空行里输入 **粗体**、*斜体*、~~删除~~ 或 `代码`，命中后自动变成标记。'
        : preset === 'blocks'
          ? '在空行里输入「# 加空格」「> 加空格」「- 加空格」「1. 加空格」，块类型自动切换。'
          : '在空行里输入 %%高亮%%、-> 或 @@@（分隔线），三个自定义 helper 各演示一条规则。';

    simulateButton.textContent = '模拟输入（applyInputRules: true）';
    plainButton.textContent = '普通插入（false）';
    emit({ html: next.getHTML(), lastAction });
  }

  function simulate(applyInputRules: boolean): void {
    if (!editor) {
      return;
    }
    const sample = SAMPLES[currentPreset ?? 'marks'];
    lastAction = `insertContentAt '${sample}' applyInputRules: ${applyInputRules}`;
    // 先清空到空段落，保证样例字符串位于行首——与真实打字的触发条件一致
    editor.commands.clearContent();
    editor.commands.insertContentAt(1, sample, { applyInputRules });
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
