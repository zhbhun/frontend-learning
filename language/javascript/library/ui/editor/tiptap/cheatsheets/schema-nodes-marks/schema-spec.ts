/**
 * 范例介绍：扩展声明如何被合并成 ProseMirror schema。
 * 前置状态：预设从 Document、Paragraph、Text 三件套起步，可追加 Heading 节点或 Bold 标记。
 * 操作：切换「扩展预设」，对照左侧类型声明与右侧 getSchema() 推导出的 spec。
 * 预期结果：声明里的 content、group、defining、addAttributes、parseHTML、renderHTML
 *   分别落到 spec 的 content、group、defining、attrs、parseDOM、toDOM 字段上；
 *   nodes / marks 列表随预设同步增减；三件套不含任何标记。
 * 阅读主线：左侧每个声明字段都能在右侧 spec 中找到落点——schema 完全由声明推导。
 */
import { getSchema, type Extensions } from '@tiptap/core';
import { Bold } from '@tiptap/extension-bold';
import { Document } from '@tiptap/extension-document';
import { Heading } from '@tiptap/extension-heading';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';

export type SpecPreset = 'minimal' | 'with-heading' | 'with-bold';

export interface SchemaSpecArgs {
  preset: SpecPreset;
}

export interface SchemaSpecSnapshot {
  nodes: string;
  marks: string;
  focusLabel: string;
  specKeys: string;
}

export interface SchemaSpecInstance {
  update(args: SchemaSpecArgs): void;
  dispose(): void;
}

const MINIMAL: Extensions = [Document, Paragraph, Text];

const EXTENSION_SETS: Record<
  SpecPreset,
  { extensions: Extensions; focus: string; label: string }
> = {
  minimal: { extensions: MINIMAL, focus: 'paragraph', label: 'paragraph' },
  'with-heading': {
    extensions: [...MINIMAL, Heading],
    focus: 'heading',
    label: 'heading',
  },
  'with-bold': {
    extensions: [...MINIMAL, Bold],
    focus: 'bold',
    label: 'bold（mark）',
  },
};

/** 类型声明摘录：与各扩展源码一致，注释标出新增声明的字段。 */
const DECLARATIONS: Record<SpecPreset, string> = {
  minimal: `// 最小三件套：一个只认识段落的文档模型
const Document = Node.create({
  name: 'doc',
  topNode: true,        // → spec.topNode
  content: 'block+',    // → spec.content
})

const Paragraph = Node.create({
  name: 'paragraph',
  group: 'block',       // → spec.group
  content: 'inline*',   // → spec.content
  parseHTML() { return [{ tag: 'p' }] },       // → spec.parseDOM
  renderHTML({ HTMLAttributes }) {             // → spec.toDOM
    return ['p', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },
})

const Text = Node.create({
  name: 'text',
  group: 'inline',
})`,
  'with-heading': `// 在三件套基础上新增 Heading
const Heading = Node.create({
  name: 'heading',
  content: 'inline*',
  group: 'block',
  defining: true,       // → spec.defining：内容整体替换时保留节点
  addAttributes() {     // → spec.attrs：default 进 schema
    return { level: { default: 1, rendered: false } }
  },
  parseHTML() {
    return this.options.levels.map((level) => ({
      tag: \`h\${level}\`, attrs: { level },
    }))
  },
  renderHTML({ node, HTMLAttributes }) {
    return [\`h\${node.attrs.level}\`,
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },
})`,
  'with-bold': `// 在三件套基础上新增 Bold（标记声明）
const Bold = Mark.create({
  name: 'bold',
  parseHTML() {         // → spec.parseDOM：四条规则收下多种写法
    return [
      { tag: 'strong' },
      { tag: 'b', getAttrs: (node) => node.style.fontWeight !== 'normal' && null },
      { style: 'font-weight=400', clearMark: (mark) => mark.type.name === this.name },
      { style: 'font-weight', getAttrs: (value) => /^(bold(er)?|[5-9]\\d{2,})$/.test(value) && null },
    ]
  },
  renderHTML({ HTMLAttributes }) {  // → spec.toDOM
    return ['strong', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },
})`,
};

/** 把 spec 格式化为可读 JSON；函数值显示为 ƒ，避免 JSON.stringify 静默丢字段。 */
function formatSpec(spec: Record<string, unknown>): string {
  return JSON.stringify(
    spec,
    (_key, value) => (typeof value === 'function' ? 'ƒ () => …' : value),
    2,
  );
}

export function createSchemaSpecDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SchemaSpecSnapshot) => void,
): SchemaSpecInstance {
  const frame = document.createElement('div');
  frame.className = 'snm-frame snm-columns';
  canvas.replaceWith(frame);

  // 左列：扩展的类型声明
  const declarationColumn = document.createElement('div');
  declarationColumn.className = 'snm-column';
  const declarationLabel = document.createElement('p');
  declarationLabel.className = 'snm-box-label';
  declarationLabel.textContent = '类型声明（摘自扩展源码）';
  const declarationPre = document.createElement('pre');
  declarationPre.className = 'snm-pre';
  declarationColumn.append(declarationLabel, declarationPre);

  // 右列：getSchema() 推导出的 ProseMirror spec
  const specColumn = document.createElement('div');
  specColumn.className = 'snm-column';
  const specLabel = document.createElement('p');
  specLabel.className = 'snm-box-label';
  specLabel.textContent = 'getSchema() 推导出的 spec';
  const specPre = document.createElement('pre');
  specPre.className = 'snm-pre';
  specColumn.append(specLabel, specPre);

  frame.append(declarationColumn, specColumn);

  function apply(args: SchemaSpecArgs): void {
    const preset = EXTENSION_SETS[args.preset];

    // schema 由扩展推导：有实例时也可用 editor.schema，这里用无实例的 getSchema
    const schema = getSchema(preset.extensions);
    const isMark = preset.focus === 'bold';
    const spec = isMark
      ? (schema.marks[preset.focus]?.spec as Record<string, unknown>)
      : (schema.nodes[preset.focus]?.spec as Record<string, unknown>);

    declarationPre.textContent = DECLARATIONS[args.preset];
    specLabel.textContent = `getSchema() 推导出的 spec（${preset.label}）`;
    specPre.textContent = formatSpec(spec);

    emit({
      nodes: Object.keys(schema.nodes).join(' · '),
      marks: Object.keys(schema.marks).join(' · ') || '（无）',
      focusLabel: preset.label,
      specKeys: Object.keys(spec).join(' · '),
    });
  }

  return {
    update(nextArgs) {
      apply(nextArgs);
    },
    dispose() {
      frame.remove();
    },
  };
}
