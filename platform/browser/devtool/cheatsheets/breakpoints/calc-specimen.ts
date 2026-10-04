/**
 * 范例介绍：「计算标本」——一个带稳定可复现 bug 的订单金额计算页。
 * 输入：Controls 的「单价（元）」「数量」「折扣 %」，任一参数变化都触发一轮重新计算。
 * 主要操作：读者照本文件源码在 Sources 面板对 calcOrder 调用链设置行断点，
 *   再调整 Controls 触发暂停，用单步执行、Scope / Watch / Call Stack 定位
 *   报告行金额算错的那一行。
 * 预期结果：报告行的「应付金额」与「人工核算」不一致；BUG 所在行已用短注释标出，
 *   定位练习时请先用断点自己找，再看注释验证。
 * 阅读主线：runSpecimen() → buildReport() → calcOrder() → subtotal() 与
 *   applyDiscount() → formatYuan() 的调用链，链路各层在 Call Stack 中对应一帧。
 */

/** 标本输入：Controls 提供的三个计算参数。 */
export interface CalcSpecimenOptions {
  /** 单价（元）。 */
  price: number;
  /** 数量。 */
  quantity: number;
  /** 折扣（百分比；0 表示不打折）。 */
  discount: number;
}

export interface CalcSpecimenInstance {
  update(options: CalcSpecimenOptions): void;
  dispose(): void;
}

/* ------------- 计算链：Show code 与 Sources 断点练习的对象 ------------- */

/* 计算链入口：由参数变化触发，每轮在浏览器真实的 Console 输出一条 [标本] 消息，
   消息尾部的源链接可直达本文件对应行。 */
function runSpecimen(options: CalcSpecimenOptions): string {
  const report = buildReport(options);
  console.log('[标本] 计算 →', report);
  return report;
}

/* 计算链：把应付金额拼进报告行文本。 */
function buildReport(options: CalcSpecimenOptions): string {
  const payable = calcOrder(options.price, options.quantity, options.discount);
  return `应付金额：${formatYuan(payable)}`;
}

/* 计算链：由小计与折扣合成应付金额，是断点练习的主干。 */
function calcOrder(price: number, quantity: number, discount: number): number {
  const amount = subtotal(price, quantity);
  return applyDiscount(amount, discount);
}

/* 计算链分支：单价乘数量得到小计。 */
function subtotal(price: number, quantity: number): number {
  return price * quantity;
}

/* 计算链分支：按折扣折算应付金额。 */
function applyDiscount(amount: number, discount: number): number {
  return amount * 1 - discount / 100; // BUG 所在：结果与预期不符；定位练习请先用断点自己找，再看本注释
}

/* 计算链分支：金额格式化为两位小数。 */
function formatYuan(amount: number): string {
  return `${amount.toFixed(2)} 元`;
}

/* 人工核算：正确的折算式，仅用于演示页对照显示，不属于被调试的计算链。 */
function expectedPayable(
  price: number,
  quantity: number,
  discount: number,
): string {
  const payable = price * quantity * (1 - discount / 100);
  return `应付金额：${payable.toFixed(2)} 元`;
}

/* ----------------------- 演示页渲染：报告行与 readout ----------------------- */

const SPECIMEN_STYLES = `
.calc-specimen {
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
.calc-specimen__main {
  flex: 1 1 300px;
  min-width: 0;
}
.calc-specimen__hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: #5d6f67;
}
.calc-specimen__hint code {
  padding: 0 3px;
  border-radius: 3px;
  background: #dbe3f0;
  font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
}
.calc-specimen__report {
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
  background: rgb(255 255 255 / 85%);
}
.calc-specimen__row {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.calc-specimen__label {
  flex: 0 0 auto;
  font-size: 12px;
  color: #5d6f67;
}
.calc-specimen__value {
  margin: 0;
  font: 600 14px ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #172033;
}
.calc-specimen__value--bug {
  color: #b45309;
}
.calc-specimen__readout {
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
.calc-specimen__readout dt {
  color: #5d6f67;
  white-space: nowrap;
}
.calc-specimen__readout dd {
  margin: 0;
  color: #172033;
  text-align: right;
}
`;

export function createCalcSpecimen(root: HTMLElement): CalcSpecimenInstance {
  root.classList.add('calc-specimen');
  root.innerHTML = `
    <div class="calc-specimen__main">
      <p class="calc-specimen__hint">计算标本：在下方 Controls 调整单价、数量、折扣，任一变化都触发一轮重新计算，并在浏览器<b>真实的 Console</b> 输出一条 <code>[标本]</code> 消息——点消息尾部的 calc-specimen.ts 源链接可直达 Sources 对应行。报告行的应付金额与人工核算不符：照 Show code 的源码在 Sources 面板对计算链设置行断点，暂停后观察 Scope、Watch 与调用栈，找出算错的那一行。</p>
      <div class="calc-specimen__report">
        <div class="calc-specimen__row">
          <span class="calc-specimen__label">报告</span>
          <code class="calc-specimen__value calc-specimen__value--bug"></code>
        </div>
        <div class="calc-specimen__row">
          <span class="calc-specimen__label">人工核算</span>
          <code class="calc-specimen__value calc-specimen__value--expected"></code>
        </div>
      </div>
    </div>
    <dl class="calc-specimen__readout">
      <dt>单价</dt><dd class="calc-specimen__cell-price"></dd>
      <dt>数量</dt><dd class="calc-specimen__cell-quantity"></dd>
      <dt>折扣</dt><dd class="calc-specimen__cell-discount"></dd>
      <dt>本轮调用</dt><dd class="calc-specimen__cell-call"></dd>
    </dl>
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = SPECIMEN_STYLES;
  root.append(styleEl);

  const reportValue = root.querySelector(
    '.calc-specimen__value--bug',
  ) as HTMLElement;
  const expectedValue = root.querySelector(
    '.calc-specimen__value--expected',
  ) as HTMLElement;
  const cells = {
    price: root.querySelector('.calc-specimen__cell-price') as HTMLElement,
    quantity: root.querySelector(
      '.calc-specimen__cell-quantity',
    ) as HTMLElement,
    discount: root.querySelector(
      '.calc-specimen__cell-discount',
    ) as HTMLElement,
    call: root.querySelector('.calc-specimen__cell-call') as HTMLElement,
  };

  function paint(options: CalcSpecimenOptions, report: string) {
    reportValue.textContent = report;
    expectedValue.textContent = expectedPayable(
      options.price,
      options.quantity,
      options.discount,
    );
    cells.price.textContent = `${options.price} 元`;
    cells.quantity.textContent = String(options.quantity);
    cells.discount.textContent = `${options.discount}%`;
    cells.call.textContent = `calcOrder(${options.price}, ${options.quantity}, ${options.discount})`;
  }

  return {
    update(options) {
      const report = runSpecimen(options);
      paint(options, report);
    },
    dispose() {
      /* 无持续资源需要释放；计算只在参数变化时执行一轮。 */
    },
  };
}
