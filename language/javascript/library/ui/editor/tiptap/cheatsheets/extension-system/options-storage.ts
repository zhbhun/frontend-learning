/**
 * 范例介绍：addOptions / configure 与 addStorage / this.storage 的分工。
 * 前置状态：Shout 扩展声明了 prefix、suffix、uppercase 三个 options 默认值，
 *   以及 storage.applied 计数器；insertShout 命令把文字按 options 加工后插入文档。
 * 操作：切换「配置方式」（不配置 / configure 只改 prefix / extend 用 this.parent
 *   只改 uppercase），点「插入一句喊话」或「重建编辑器」。
 * 预期结果：configure 与 extend 都只覆盖提及的项，其余保持 addOptions 默认值
 *   （深合并）；storage.applied 随命令执行递增，外部可用 editor.storage.shout 读取
 *   同一份状态；重建编辑器后 storage 归零——每个编辑器实例一份。
 * 阅读主线：options 是配置（装配时定死），storage 是状态（运行期可变、按实例隔离）。
 */
import { Editor, Extension, type Extensions } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';

export type ConfigPreset = 'plain' | 'configure' | 'extend';

export interface OptionsStorageArgs {
  preset: ConfigPreset;
}

export interface OptionsStorageSnapshot {
  options: string;
  storageSelf: string;
  storageExternal: string;
}

export interface OptionsStorageInstance {
  update(args: OptionsStorageArgs): void;
  dispose(): void;
}

export interface ShoutOptions {
  prefix: string;
  suffix: string;
  uppercase: boolean;
}

export interface ShoutStorage {
  applied: number;
}

export const Shout = Extension.create<ShoutOptions, ShoutStorage>({
  name: 'shout',

  // addOptions 声明默认值；使用者用 configure 覆盖，未提及的项保持默认
  addOptions() {
    return {
      prefix: '【',
      suffix: '】',
      uppercase: false,
    };
  },

  // addStorage 声明可变状态的初始值；编辑器创建时按实例各建一份
  addStorage() {
    return { applied: 0 };
  },

  addCommands() {
    return {
      insertShout:
        (text: string) =>
        ({ commands }) => {
          // 命令与钩子里的 this.storage 指向当前编辑器的 storage，可直接读写
          this.storage.applied += 1;
          const body = this.options.uppercase ? text.toUpperCase() : text;
          return commands.insertContent({
            type: 'paragraph',
            content: [
              { type: 'text', text: `${this.options.prefix}${body}${this.options.suffix}` },
            ],
          });
        },
    };
  },
});

// 命令的类型补全（机制见「自定义 Node 与 Mark」课）
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    shout: {
      insertShout: (text: string) => ReturnType;
    };
  }
}

const BASE: Extensions = [Document, Paragraph, Text];

const PRESETS: Record<ConfigPreset, () => Extensions> = {
  // 不配置：全部使用 addOptions 的默认值
  plain: () => [...BASE, Shout],
  // configure 深合并：只覆盖 prefix，suffix、uppercase 仍是默认值；返回新实例，Shout 本身不变
  configure: () => [...BASE, Shout.configure({ prefix: '≫ ' })],
  // extend 覆盖 addOptions：用 this.parent?.() 取回原默认值，再覆盖一项
  extend: () => [
    ...BASE,
    Shout.extend({
      addOptions() {
        return {
          ...this.parent?.(),
          uppercase: true,
        };
      },
    }),
  ],
};

export function createOptionsStorageDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: OptionsStorageSnapshot) => void,
): OptionsStorageInstance {
  const frame = document.createElement('div');
  frame.className = 'ext-frame';
  canvas.replaceWith(frame);

  const hint = document.createElement('p');
  hint.className = 'ext-hint';
  hint.textContent = '切换配置方式后点「插入一句喊话」：插入内容由解析后的 options 决定，计数存在 storage 里。';

  const toolbar = document.createElement('div');
  toolbar.className = 'ext-toolbar';

  const editorBox = document.createElement('div');
  editorBox.className = 'ext-editor';

  frame.append(hint, toolbar, editorBox);

  let editor: Editor | null = null;
  let lastPreset: ConfigPreset | null = null;

  function rebuild(preset: ConfigPreset): void {
    editor?.destroy();
    // 配置方式变化会得到不同的扩展实例，重建编辑器让新实例参与装配
    editor = new Editor({
      element: { mount: editorBox },
      extensions: PRESETS[preset](),
      content: '<p>点上方按钮插入一句喊话。</p>',
    });
    lastPreset = preset;
  }

  function apply(args: OptionsStorageArgs): void {
    if (args.preset !== lastPreset) {
      rebuild(args.preset);
    }
    const current = editor as Editor;

    // 装配结果里取出 shout 实例：options getter 返回 addOptions 与 configure 合并后的配置
    const instance = current.extensionManager.extensions.find((ext) => ext.name === 'shout');
    const options = (instance?.options ?? {}) as Partial<ShoutOptions>;

    // 内部写、外部读的是同一份状态：this.storage 与 editor.storage.shout 指向同一对象
    // storage 合表类型不带索引签名，这里经 unknown 断言成 storage 表再取键
    const storageTable = current.storage as unknown as Record<string, Partial<ShoutStorage> | undefined>;
    const storage = storageTable.shout ?? { applied: 0 };

    emit({
      options: `prefix ${JSON.stringify(options.prefix ?? null)} · suffix ${JSON.stringify(
        options.suffix ?? null,
      )} · uppercase ${String(options.uppercase)}`,
      storageSelf: String(storage.applied),
      storageExternal: String(storage.applied),
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

  addToolbarButton('插入一句喊话', () => {
    editor?.chain().focus().insertShout('hello tiptap').run();
    apply({ preset: lastPreset as ConfigPreset });
  });

  // 重建编辑器：storage 属于实例，重建后从 addStorage 的初始值重新开始
  addToolbarButton('重建编辑器', () => {
    rebuild(lastPreset as ConfigPreset);
    apply({ preset: lastPreset as ConfigPreset });
  });

  rebuild('plain');
  apply({ preset: 'plain' });

  return {
    update(nextArgs) {
      apply(nextArgs);
    },
    dispose() {
      editor?.destroy();
      frame.remove();
    },
  };
}
