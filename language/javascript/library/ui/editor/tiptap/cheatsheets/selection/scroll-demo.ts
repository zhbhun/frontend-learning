/**
 * 范例介绍：写选区的命令不滚动视口，滚动要靠 scrollIntoView（或 focus 的默认行为）。
 * 前置状态：长文档 + 限高滚动容器；装 Document、Paragraph、Text、Heading。
 * 操作：依次点「setTextSelection 到文末」「scrollIntoView()」「focus('end')」，
 *   对比读数里容器 scrollTop 的变化；也可以手动拖动滚动条再试。
 * 预期结果：setTextSelection 只改读数，scrollTop 不动；scrollIntoView() 让 scrollTop
 *   跳到选区处；focus('end') 一步到位（默认 scrollIntoView: true）。
 * 阅读主线：scrollTop 读数与「from – to」读数的对应关系。
 */
import { Editor } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Heading } from '@tiptap/extension-heading';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';

export interface ScrollDemoSnapshot {
  scrollTop: number;
  fromTo: string;
  focused: string;
}

export interface ScrollDemoInstance {
  update(): void;
  dispose(): void;
}

const EXTENSIONS = [Document, Paragraph, Text, Heading];

// 用循环拼一篇长文档，保证容器内必然出现滚动
const paragraphs = Array.from(
  { length: 10 },
  (_, index) => `<p>第 ${index + 1} 段：写选区的命令不会滚动视口，用上方按钮观察 scrollTop。</p>`,
);
const INITIAL_CONTENT = `<h3>一篇用来观察滚动的长文档</h3>${paragraphs.join('')}`;

export function createScrollDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ScrollDemoSnapshot) => void,
): ScrollDemoInstance {
  const frame = document.createElement('div');
  frame.className = 'sel-frame';
  canvas.replaceWith(frame);

  const hint = document.createElement('p');
  hint.className = 'sel-hint';
  hint.textContent = '编辑器容器限高出现滚动条：scrollTop 反映视口有没有跟上光标';
  const toolbar = document.createElement('div');
  toolbar.className = 'sel-toolbar';
  const scrollHost = document.createElement('div');
  scrollHost.className = 'sel-scroll';
  frame.append(hint, toolbar, scrollHost);

  const editor = new Editor({
    element: scrollHost,
    extensions: EXTENSIONS,
    content: INITIAL_CONTENT,
  });

  function snapshot(): ScrollDemoSnapshot {
    const selection = editor.state.selection;
    return {
      scrollTop: Math.round(scrollHost.scrollTop),
      fromTo: `${selection.from} – ${selection.to}`,
      focused: editor.isFocused ? '是' : '否',
    };
  }

  const refresh = () => emit(snapshot());
  editor.on('transaction', refresh);
  // 用户手动拖滚动条不产生事务：单独监听容器的 scroll 事件
  scrollHost.addEventListener('scroll', refresh);
  emit(snapshot());

  function addButton(label: string, title: string, run: () => void): void {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sel-btn';
    button.textContent = label;
    button.title = title;
    // 不让按钮抢走焦点，避免 isFocused 读数干扰滚动证据
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', () => run());
    toolbar.append(button);
  }

  addButton('setTextSelection 到文末', '只改选区：读数变化，scrollTop 不动', () => {
    editor.commands.setTextSelection(editor.state.doc.content.size);
  });
  addButton('scrollIntoView()', '在事务上标记滚动：视口滚到当前选区', () => {
    editor.commands.scrollIntoView();
  });
  addButton("focus('end')", '聚焦到文末并滚动（默认 scrollIntoView: true）', () => {
    editor.commands.focus('end');
  });

  return {
    update() {
      // 本实例没有 Controls 输入：读者直接操作编辑器与按钮
    },
    dispose() {
      editor.destroy();
      frame.remove();
    },
  };
}
