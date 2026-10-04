/**
 * 范例介绍：「交互标本」——一个能抛异常、发请求、改 DOM 的按钮面板。
 * 输入：Controls 的「请求路径」「修改第几项」两个参数，作为断点条件与
 *   XHR 匹配练习的输入；stage 内按钮触发具体动作。
 * 主要操作：读者按正文对标本设置 DOM / XHR / 事件监听 / 异常 / 条件断点，
 *   或在 Console 里执行 debug() / monitor()，再点击按钮观察暂停或输出。
 * 预期结果：readout 实时显示未捕获异常、已捕获异常、请求与 DOM 修改四类
 *   计数；设置了对应断点时，点击按钮会暂停在标本源码相应位置（暂停期间
 *   页面冻结属正常现象，按 F8 恢复）。
 * 阅读主线：runAction() 按 data-action 分发到 throwTypeError() /
 *   throwCaughtError() / sendRequest() / changeItem() / removeItem()；
 *   动作函数同时挂在 window.specimen 上，供 Console 里 debug() / monitor() 使用。
 */

/** 标本输入：Controls 提供的两个参数，本身不触发动作，只供动作函数取用。 */
export interface TriggerSpecimenOptions {
  /** 点「发送请求」按钮时 fetch 的路径。 */
  requestPath: string;
  /** 点「修改列表项」按钮时被修改的列表项序号（从 1 开始）。 */
  itemIndex: number;
}

export interface TriggerSpecimenInstance {
  update(options: TriggerSpecimenOptions): void;
  dispose(): void;
}

interface SpecimenGlobal {
  specimen?: object;
}

/* ----------------------- 演示页渲染：按钮、列表与 readout ----------------------- */

const SPECIMEN_STYLES = `
.trigger-specimen {
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
.trigger-specimen__main {
  flex: 1 1 300px;
  min-width: 0;
}
.trigger-specimen__hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: #5d6f67;
}
.trigger-specimen__hint code {
  padding: 0 3px;
  border-radius: 3px;
  background: #dbe3f0;
  font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
}
.trigger-specimen__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.trigger-specimen__buttons button {
  padding: 6px 12px;
  border: 1px solid #b9c6e0;
  border-radius: 6px;
  background: rgb(255 255 255 / 90%);
  font: 600 12px ui-sans-serif, system-ui, sans-serif;
  color: #172033;
  cursor: pointer;
}
.trigger-specimen__buttons button:hover {
  background: #dfe8f5;
}
.trigger-specimen__list {
  margin: 0;
  padding: 10px 14px 10px 28px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
  background: rgb(255 255 255 / 85%);
}
.trigger-specimen__list li {
  padding: 2px 0;
  font: 13px ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #172033;
}
.trigger-specimen__readout {
  flex: 1 1 210px;
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
.trigger-specimen__readout dt {
  color: #5d6f67;
  white-space: nowrap;
}
.trigger-specimen__readout dd {
  margin: 0;
  color: #172033;
  text-align: right;
  overflow-wrap: anywhere;
}
`;

export function createTriggerSpecimen(root: HTMLElement): TriggerSpecimenInstance {
  root.classList.add('trigger-specimen');
  root.innerHTML = `
    <div class="trigger-specimen__main">
      <p class="trigger-specimen__hint">交互标本：先随便点几个按钮，观察列表与右侧 readout 的变化；再按正文设好对应断点重试——页面冻结时按 <code>F8</code> 恢复。点「触发类型错误」出现红色报错属预期现象；<code>[标本]</code> 开头的 Console 日志是演示页自己输出的。动作函数挂在全局 <code>specimen</code> 对象上，可在 Console 里执行 <code>debug(specimen.sendRequest)</code> 等练习函数断点。</p>
      <div class="trigger-specimen__buttons">
        <button type="button" data-action="throw-uncaught">触发类型错误</button>
        <button type="button" data-action="throw-caught">触发已捕获错误</button>
        <button type="button" data-action="send-request">发送请求</button>
        <button type="button" data-action="change-item">修改列表项</button>
        <button type="button" data-action="remove-item">移除列表项</button>
        <button type="button" data-action="reset">重置标本</button>
      </div>
      <ul class="trigger-specimen__list"></ul>
    </div>
    <dl class="trigger-specimen__readout">
      <dt>未捕获异常</dt><dd class="trigger-specimen__cell-uncaught">0</dd>
      <dt>已捕获异常</dt><dd class="trigger-specimen__cell-caught">0</dd>
      <dt>请求次数</dt><dd class="trigger-specimen__cell-request">0</dd>
      <dt>DOM 修改</dt><dd class="trigger-specimen__cell-dom">0</dd>
      <dt>最近事件</dt><dd class="trigger-specimen__cell-last">—</dd>
      <dt>请求路径</dt><dd class="trigger-specimen__cell-path"></dd>
      <dt>修改目标</dt><dd class="trigger-specimen__cell-index"></dd>
    </dl>
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = SPECIMEN_STYLES;
  root.append(styleEl);

  const listEl = root.querySelector('.trigger-specimen__list') as HTMLUListElement;
  const cells = {
    uncaught: root.querySelector('.trigger-specimen__cell-uncaught') as HTMLElement,
    caught: root.querySelector('.trigger-specimen__cell-caught') as HTMLElement,
    request: root.querySelector('.trigger-specimen__cell-request') as HTMLElement,
    domChange: root.querySelector('.trigger-specimen__cell-dom') as HTMLElement,
    last: root.querySelector('.trigger-specimen__cell-last') as HTMLElement,
    path: root.querySelector('.trigger-specimen__cell-path') as HTMLElement,
    index: root.querySelector('.trigger-specimen__cell-index') as HTMLElement,
  };

  let current: TriggerSpecimenOptions = { requestPath: '/api/items', itemIndex: 2 };
  /* 最近一次动作的结果：请求状态、移除记录或跳过原因，显示在 readout。 */
  let lastEvent = '—';
  /* 动作计数：readout 四类读数的来源。 */
  const counts = { uncaught: 0, caught: 0, request: 0, domChange: 0 };

  /* 重建 4 个列表项：li 是 DOM 断点练习的目标节点。 */
  function renderList(): void {
    listEl.innerHTML = '';
    for (let index = 1; index <= 4; index += 1) {
      const item = document.createElement('li');
      item.textContent = `项目 ${index}`;
      listEl.append(item);
    }
  }

  function paint(): void {
    cells.uncaught.textContent = String(counts.uncaught);
    cells.caught.textContent = String(counts.caught);
    cells.request.textContent = String(counts.request);
    cells.domChange.textContent = String(counts.domChange);
    cells.last.textContent = lastEvent;
    cells.path.textContent = current.requestPath;
    cells.index.textContent = `第 ${current.itemIndex} 项`;
  }

  /* ------------- 动作链：Show code 与各类断点练习的对象 ------------- */

  /* 未捕获的 TypeError 在这里抛出：异常断点（Pause on uncaught exceptions）
     会停在 throw 这一行。计数与渲染必须在 throw 之前完成——throw 会中断
     本函数之后的一切代码。 */
  function throwTypeError(): void {
    counts.uncaught += 1;
    paint();
    throw new TypeError('标本：未捕获的类型错误');
  }

  /* 已捕获的 RangeError 在 try 块内抛出、被本函数 catch：只有勾选
     Pause on caught exceptions 时才会停在 try 内的 throw 行。 */
  function throwCaughtError(): void {
    try {
      throw new RangeError('标本：已捕获的范围错误');
    } catch {
      counts.caught += 1;
      paint();
    }
  }

  /* fetch 请求从这里发起：XHR/fetch 断点在请求 URL 包含匹配字符串时
     停在 fetch 调用行。请求成功与否不影响断点触发，这里只记录状态。 */
  function sendRequest(path: string): void {
    counts.request += 1;
    paint();
    fetch(path)
      .then((response) => {
        lastEvent = `${path} → HTTP ${response.status}`;
      })
      .catch(() => {
        lastEvent = `${path} → 网络错误`;
      })
      .finally(() => paint());
  }

  /* 列表项修改在这里发生：textContent 赋值替换子文本节点（对列表设
     Subtree modifications 会触发），data-modified 属性写入（对该项设
     Attribute modifications 会触发）——同一次修改可分别验证两类 DOM 断点。 */
  function changeItem(index: number): void {
    const item = listEl.children[index - 1] as HTMLElement | undefined;
    if (!item) {
      lastEvent = `第 ${index} 项已被移除，修改跳过`;
      paint();
      return;
    }
    counts.domChange += 1;
    item.dataset.modified = String(counts.domChange);
    item.textContent = `项目 ${index}（已修改 ${counts.domChange} 次）`;
    lastEvent = `已修改第 ${index} 项`;
    paint();
  }

  /* 节点移除在这里发生：对某个列表项设 Node removal，或对列表本身设
     Subtree modifications，点本按钮即可暂停在 item.remove() 所在行。 */
  function removeItem(): void {
    const item = listEl.lastElementChild as HTMLElement | null;
    if (!item) {
      lastEvent = '列表已空';
      paint();
      return;
    }
    counts.domChange += 1;
    item.remove();
    lastEvent = `已移除「${item.textContent ?? ''}」`;
    paint();
  }

  /* 重置：重建列表项并把计数清零，练习可以反复重来。 */
  function resetSpecimen(): void {
    counts.uncaught = 0;
    counts.caught = 0;
    counts.request = 0;
    counts.domChange = 0;
    lastEvent = '—';
    renderList();
    paint();
  }

  /* 动作分发器：标本内所有按钮共用这一个点击监听器，事件监听断点
     （Mouse → click）触发时停在这里的第一行。 */
  function runAction(action: string): void {
    console.log('[标本] 动作 →', action);
    switch (action) {
      case 'throw-uncaught':
        throwTypeError();
        break;
      case 'throw-caught':
        throwCaughtError();
        break;
      case 'send-request':
        sendRequest(current.requestPath);
        break;
      case 'change-item':
        changeItem(current.itemIndex);
        break;
      case 'remove-item':
        removeItem();
        break;
      case 'reset':
        resetSpecimen();
        break;
    }
  }

  /* 动作函数挂到全局，供 Console 里 debug(specimen.xxx) / monitor(specimen.xxx)
     练习函数断点；dispose 时移除。 */
  const exposed = {
    throwTypeError,
    throwCaughtError,
    sendRequest,
    changeItem,
    removeItem,
  };

  const buttonsEl = root.querySelector('.trigger-specimen__buttons') as HTMLElement;
  buttonsEl.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const action = target?.closest('button')?.dataset.action;
    if (action) {
      runAction(action);
    }
  });

  renderList();
  paint();
  (window as unknown as SpecimenGlobal).specimen = exposed;

  return {
    update(options) {
      current = options;
      paint();
    },
    dispose() {
      delete (window as unknown as SpecimenGlobal).specimen;
      /* 计数与 DOM 随舞台一起被移除，无定时器等持续资源需要释放。 */
    },
  };
}
