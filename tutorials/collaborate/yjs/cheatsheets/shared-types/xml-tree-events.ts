/**
 * 范例：Y.Xml 家族——把文档表达成一棵可观察的 XML 节点树。
 * 演示：Y.XmlFragment（容器）→ Y.XmlElement（标签与属性）→ Y.XmlText（树内文本）
 *       三类节点组合成一棵树，不同操作落在事件的不同字段上。
 * 输入：操作（设属性 / 追加子节点 / 改树内文本）、属性值。
 * 操作：每次控件变化都整体重算——重建文档树，对 div 挂 observeDeep，再执行所选操作。
 * 预期：设属性只动 attributesChanged；追加子节点只动 childListChanged 与 delta；
 *       改文本产生 YXmlText 事件，path（[0,0]）从 div 定位到文本节点。
 * 主线：buildTree() 建树与观察 → runAction() 执行操作 → 读 XML 序列化与事件字段。
 */
import * as Y from 'yjs';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface XmlTreeEventsOptions {
  action: 'set-attr' | 'append-node' | 'edit-text';
  attrValue: string;
}

export interface XmlTreeEventsSnapshot {
  xml: string;
  event: string;
  attrsChanged: string;
  childChanged: string;
  path: string;
}

export interface XmlTreeEventsInstance {
  update(options: XmlTreeEventsOptions): void;
  dispose(): void;
}

interface TreeResult {
  fragment: Y.XmlFragment;
  div: Y.XmlElement;
  text: Y.XmlText;
  eventSummary: string;
  attrsChanged: string;
  childChanged: string;
  path: string;
}

function buildTree(): TreeResult {
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment('doc');

  // 树结构：fragment > div.card > p > XmlText('标题')。
  const div = new Y.XmlElement('div');
  div.setAttribute('class', 'card');
  const p = new Y.XmlElement('p');
  const text = new Y.XmlText();
  text.insert(0, '标题');
  p.insert(0, [text]);
  div.insert(0, [p]);
  fragment.insert(0, [div]);

  const result: TreeResult = {
    fragment,
    div,
    text,
    eventSummary: '（无）',
    attrsChanged: '—',
    childChanged: '—',
    path: '—',
  };

  // 编辑器绑定的典型姿势：在容器上 observeDeep，按事件字段区分变更种类。
  div.observeDeep((events) => {
    const last = events[events.length - 1];
    result.path = JSON.stringify(last.path);
    result.eventSummary = last.target.constructor.name;
    if (last instanceof Y.YXmlEvent) {
      // childListChanged 在 yjs 类型声明中标为 private，运行时是公开字段，这里按结构访问。
      const xmlEvent = last as unknown as {
        attributesChanged: Set<string>;
        childListChanged: boolean;
      };
      result.attrsChanged =
        xmlEvent.attributesChanged.size > 0
          ? [...xmlEvent.attributesChanged].join(', ')
          : '∅';
      result.childChanged = String(xmlEvent.childListChanged);
    } else {
      result.attrsChanged = '（YXmlText 事件无此字段）';
      result.childChanged = '（YXmlText 事件无此字段）';
    }
  });
  return result;
}

function runAction(tree: TreeResult, options: XmlTreeEventsOptions): void {
  if (options.action === 'set-attr') {
    tree.div.setAttribute('data-kind', options.attrValue);
    return;
  }
  if (options.action === 'append-node') {
    tree.div.push([new Y.XmlElement('span')]);
    return;
  }
  tree.text.insert(2, '！');
}

export function createXmlTreeEvents(
  canvas: HTMLCanvasElement,
  emit: (snapshot: XmlTreeEventsSnapshot) => void,
): XmlTreeEventsInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: XmlTreeEventsOptions = {
    action: 'set-attr',
    attrValue: 'primary',
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(640, size.width);
    const height = 300;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const tree = buildTree();
    runAction(tree, current);
    const xml = tree.fragment.toJSON();

    ctx.fillStyle = '#172033';
    ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    const actionLabel =
      current.action === 'set-attr'
        ? `div.setAttribute('data-kind', '${current.attrValue}')`
        : current.action === 'append-node'
          ? "div.push([new Y.XmlElement('span')])"
          : "XmlText.insert(2, '！')";
    ctx.fillText(actionLabel, 24, 40);

    // 左侧：树结构，高亮本次变更的节点。
    ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = '#475569';
    ctx.fillText('Y.XmlFragment（顶层容器）', 24, 84);
    const isAttr = current.action === 'set-attr';
    const isAppend = current.action === 'append-node';
    const isText = current.action === 'edit-text';
    ctx.fillStyle = isAttr || isAppend ? '#4f7cff' : '#94a3b8';
    ctx.fillText('└─ Y.XmlElement div（观察挂在这里）', 44, 108);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('   └─ Y.XmlElement p', 44, 132);
    ctx.fillStyle = isText ? '#f59e0b' : '#94a3b8';
    ctx.fillText("      └─ Y.XmlText '标题'", 44, 156);
    if (isAppend) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillText('   └─ Y.XmlElement span（新插入）', 44, 180);
    }

    // 右侧：序列化结果与事件字段。
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.roundRect(330, 64, 318, 150, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#172033';
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('fragment.toJSON()', 346, 90);
    ctx.fillStyle = '#475569';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    const xmlText = xml.length > 38 ? `${xml.slice(0, 35)}…` : xml;
    ctx.fillText(xmlText, 346, 112);
    ctx.fillStyle = '#172033';
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(`事件：${tree.eventSummary} · path ${tree.path}`, 346, 142);
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = '#475569';
    ctx.fillText(`attributesChanged：${tree.attrsChanged}`, 346, 166);
    ctx.fillText(`childListChanged：${tree.childChanged}`, 346, 188);

    ctx.fillStyle = '#475569';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(
      '属性变更进 attributesChanged / changes.keys；子节点变更进 childListChanged / changes.delta。',
      24,
      268,
    );

    emit({
      xml,
      event: tree.eventSummary,
      attrsChanged: tree.attrsChanged,
      childChanged: tree.childChanged,
      path: tree.path,
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
