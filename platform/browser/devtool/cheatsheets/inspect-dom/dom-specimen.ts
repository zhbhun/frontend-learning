/**
 * 范例介绍：「DOM 标本」页——结构有层次的一小块页面（嵌套容器、带 data-id
 * 属性的列表项、真实按钮、由页面 JS 动态插入的列表项），供读者用 DevTools
 * 的 Elements 面板练习定位元素、树导航与实时编辑。
 * 输入或前置状态：Controls 的「动态插入项」（页面 JS 插入列表末尾的节点数）
 *   与「hidden 属性」（给 data-id="item-4" 的列表项加 / 去 hidden）。
 * 主要操作：右键任意元素选 Inspect；Ctrl+F / Command+F 搜索；双击改文本、
 *   属性、标签；H 隐藏、Delete 删除、Ctrl+Z 撤销；Console 里用 $0 与
 *   inspect() 和 Elements 互相跳转。
 * 预期结果：readout 轮询真实 DOM，显示标本区元素总数、列表项数与动态项数
 *   ——无论改动来自 Controls 还是你在 DevTools 里的编辑，读数都会刷新；
 *   但下一次 Controls 更新会重建动态项，覆盖你在这些节点上的手改。
 * 阅读主线：Elements 显示的是活 DOM：页面 JS 的增删与你的编辑落在同一棵树上。
 */
import { createRenderLoop } from '../../assets/canvas-runtime.js';

export interface SpecimenOptions {
  /** 页面 JS 动态插入列表末尾的节点数。 */
  dynamicItems: number;
  /** 是否给 data-id="item-4" 的列表项加 hidden 属性（树上仍在，页面不可见）。 */
  hiddenItem: boolean;
}

export interface DomSpecimenInstance {
  update(options: SpecimenOptions): void;
  dispose(): void;
}

const DYNAMIC_ITEM_CLASS = 'dom-specimen__item--dynamic';
const HIDDEN_ITEM_ID = 'item-4';

/*
  标本样式。故意留出可练的观察点：列表项没有自己的 display 声明——hidden
  属性靠浏览器默认的 [hidden] { display: none } 生效，这里一旦写 display
  就会把它压掉（作者样式总是赢过浏览器默认样式）。
*/
const SPECIMEN_STYLES = `
.dom-specimen {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: flex-start;
  padding: 16px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #e9eef4;
  color: #334155;
  font: 13px/1.6 ui-sans-serif, system-ui, sans-serif;
}
.dom-specimen__main {
  flex: 1 1 300px;
  min-width: 0;
}
.dom-specimen__hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: #5d6f67;
}
.dom-specimen__panel {
  margin: 0 0 10px;
  padding: 12px 16px;
  border: 2px solid #172033;
  border-radius: 10px;
  background: #ffffff;
}
.dom-specimen__title {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 600;
}
.dom-specimen__list {
  margin: 0 0 10px;
  padding: 0;
  list-style: none;
}
.dom-specimen__item {
  margin: 6px 0;
  padding: 6px 10px;
  border: 1px solid #dbe3f0;
  border-radius: 6px;
  background: #f6f8fc;
}
.dom-specimen__item--dynamic {
  border-color: #4f7cff;
  background: #eef3ff;
}
.dom-specimen__button {
  padding: 2px 10px;
  border: 1px solid #172033;
  border-radius: 999px;
  background: #ffffff;
  font: inherit;
  cursor: pointer;
}
.dom-specimen__button:hover {
  background: #eef3ff;
}
.dom-specimen__footer {
  margin: 0;
  font-size: 12px;
  color: #5d6f67;
}
.dom-specimen__readout {
  flex: 1 1 230px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 10px;
  align-content: start;
  margin: 0;
  padding: 10px 12px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
  background: rgb(255 255 255 / 85%);
  font: 12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.dom-specimen__readout dt {
  color: #5d6f67;
  white-space: nowrap;
}
.dom-specimen__readout dd {
  margin: 0;
  color: #172033;
  text-align: right;
}
`;

/*
  标本骨架。故意写出层次与属性，让读者在 Elements 里能练到：
  - section → ul → li 的三层嵌套：折叠 / 展开、面包屑、Option+点击全展开；
  - 每个列表项带 data-id：双击属性值直接改；
  - 一颗真实按钮：右键 Force state 强制 :hover / :active；
  - data-id="item-4" 的列表项：由 Controls 开关 hidden 属性，
    观察「树上在、页面看不见」。
*/
const SKELETON = `
  <div class="dom-specimen__main">
    <p class="dom-specimen__hint">DOM 标本：右键下面任意元素选 Inspect（检查），按正文提示在 Elements 里定位、导航与编辑。</p>
    <section class="dom-specimen__panel">
      <h3 class="dom-specimen__title">标本面板</h3>
      <ul class="dom-specimen__list">
        <li class="dom-specimen__item" data-id="item-1">静态项一：双击这段文字可以直接改。</li>
        <li class="dom-specimen__item" data-id="item-2">静态项二：双击我的 data-id 值试试。</li>
        <li class="dom-specimen__item" data-id="item-3">静态项三：
          <button class="dom-specimen__button" type="button">一个按钮</button>
        </li>
        <li class="dom-specimen__item" data-id="item-4">隐藏项：我的 hidden 属性由 Controls 开关。</li>
      </ul>
      <p class="dom-specimen__footer">嵌套容器：section → ul → li，适合练折叠、展开与面包屑。</p>
    </section>
  </div>
  <dl class="dom-specimen__readout">
    <dt>元素总数</dt><dd class="dom-specimen__cell-elements"></dd>
    <dt>列表项</dt><dd class="dom-specimen__cell-list"></dd>
    <dt>动态项</dt><dd class="dom-specimen__cell-dynamic"></dd>
  </dl>
`;

export function createDomSpecimen(root: HTMLElement): DomSpecimenInstance {
  root.classList.add('dom-specimen');

  const styleEl = document.createElement('style');
  styleEl.textContent = SPECIMEN_STYLES;
  root.append(styleEl);

  function queryCells() {
    return {
      elements: root.querySelector('.dom-specimen__cell-elements') as HTMLElement,
      list: root.querySelector('.dom-specimen__cell-list') as HTMLElement,
      dynamic: root.querySelector('.dom-specimen__cell-dynamic') as HTMLElement,
    };
  }

  let cells = (() => {
    root.insertAdjacentHTML('beforeend', SKELETON);
    return queryCells();
  })();

  let current: SpecimenOptions = { dynamicItems: 0, hiddenItem: false };

  function buildSkeleton() {
    root
      .querySelectorAll('.dom-specimen__main, .dom-specimen__readout')
      .forEach((el) => el.remove());
    root.insertAdjacentHTML('beforeend', SKELETON);
    cells = queryCells();
  }

  function syncDynamicItems() {
    const list = root.querySelector('.dom-specimen__list');
    if (!list) {
      return;
    }

    // 动态项完全由页面 JS 管理：先清空再按输入重建，模拟脚本更新覆盖手改。
    list
      .querySelectorAll(`.${DYNAMIC_ITEM_CLASS}`)
      .forEach((el) => el.remove());

    for (let index = 1; index <= current.dynamicItems; index += 1) {
      const item = document.createElement('li');
      item.className = `dom-specimen__item ${DYNAMIC_ITEM_CLASS}`;
      item.dataset.id = `dynamic-${index}`;
      item.textContent = `动态项 ${index}：由页面 JS 插入。`;
      list.append(item);
    }
  }

  function syncHidden() {
    const item = root.querySelector(`[data-id="${HIDDEN_ITEM_ID}"]`);
    if (item instanceof HTMLElement) {
      item.toggleAttribute('hidden', current.hiddenItem);
    }
  }

  function update(options: SpecimenOptions) {
    current = options;

    // 读者若在 DevTools 里删掉了关键结构，动 Controls 时按当前输入重建标本。
    if (
      !root.querySelector('.dom-specimen__main') ||
      !root.querySelector('.dom-specimen__list')
    ) {
      buildSkeleton();
    }

    syncDynamicItems();
    syncHidden();
  }

  /*
    读者在 DevTools 里的编辑不会触发页面 JS 回调，只能靠轮询发现：
    循环统计真实 DOM，只在读数变化时更新 readout。离屏或页面隐藏时自动暂停。
  */
  let signature = '';

  function frame() {
    const main = root.querySelector('.dom-specimen__main');
    const list = root.querySelector('.dom-specimen__list');
    const elementCount = main ? main.querySelectorAll('*').length : 0;
    const listCount = list ? list.children.length : 0;
    const dynamicCount = root.querySelectorAll(`.${DYNAMIC_ITEM_CLASS}`).length;

    const next = [elementCount, listCount, dynamicCount].join('|');
    if (next === signature) {
      return;
    }
    signature = next;

    cells.elements.textContent = String(elementCount);
    cells.list.textContent = String(listCount);
    cells.dynamic.textContent = String(dynamicCount);
  }

  const renderLoop = createRenderLoop(root, frame);
  renderLoop.renderOnce();

  return {
    update,
    dispose() {
      renderLoop.dispose();
    },
  };
}
