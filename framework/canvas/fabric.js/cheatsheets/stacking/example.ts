/**
 * 范例介绍：演示画布对象列表（_objects）的增删插入与层级调整——
 * 1. 数组顺序即绘制顺序：「对象序」读数自底向上，与画面层叠一一对应；
 * 2. add 追加到末尾（最高层），insertAt(index, 新) 让新对象恰好落在该索引；
 * 3. remove 变参移除并返回被移除对象；层级五法返回 boolean，
 *    intersecting 决定逐级移动是否跳过包围盒不相交的邻居；
 * 4. 增删与插入派发 object:added / object:removed，层级调整只请求重绘、不派发增删事件。
 * 输入：目标对象、增删操作、层级操作、moveObjectTo 索引、相交判定；对象固定为
 * 甲（红 Rect）、乙（蓝 Circle）、丙（绿 Triangle）、丁（黄 Rect）与新增的 新（紫 Circle）。
 * 预期结果：每次调整控件，范例先复位为基准场景（甲乙丙丁，底 → 顶）再执行所选操作；
 * 读数（对象序 / 目标索引 / 对象数 / getObjects('Rect') / 操作生效 / 本轮事件）与画面逐项对应。
 * 阅读主线：update() 的三个阶段——复位基准场景（事件计数随后清零，只统计读者所选操作）→
 * 执行增删操作 → 执行层级操作并捕获返回值。
 */
import {
  Canvas,
  Circle,
  Rect,
  Triangle,
  type FabricObject,
} from 'fabric';
import { createResizeObserver } from '../../assets/canvas-runtime.js';

/** 读者输入：对应 Controls 面板 */
export interface StackingOptions {
  /** 层级操作与 remove 作用的对象 */
  target: 'jia' | 'yi' | 'bing' | 'ding';
  /** 增删操作：none 仅复位基准场景，其余演示三种变更入口 */
  mutation: 'none' | 'remove' | 'add' | 'insert0' | 'insert2';
  /** 层级操作：v6+ 画布侧的层级方法族 */
  stackOp: 'none' | 'toFront' | 'toBack' | 'forward' | 'backwards' | 'moveTo';
  /** moveObjectTo 的目标索引 */
  moveIndex: number;
  /** bringObjectForward / sendObjectBackwards 的 intersecting 参数 */
  intersecting: boolean;
}

/** 派生读数：由 readout 显示 */
export interface StackingSnapshot {
  /** getObjects() 的名字序列（底 → 顶） */
  orderText: string;
  /** 目标对象当前索引；已被移除时为 — */
  targetIndex: string;
  objectCount: number;
  /** getObjects('Rect') 的过滤结果数 */
  rectCount: string;
  /** 层级方法返回值：是 / 否；未选操作或对象不在列表时为 — */
  opResult: string;
  /** 本轮读者所选操作派发的增删事件；层级调整应为 无 */
  roundEvents: string;
}

export interface StackingInstance {
  update(options: StackingOptions): void;
  dispose(): void;
}

/** 舞台未挂载时读不到尺寸，先按兜底值创建，挂载后由 ResizeObserver 校正 */
const INITIAL_SIZE = { width: 640, height: 360 };

export function createStacking(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: StackingSnapshot) => void,
): StackingInstance {
  const fabricCanvas = new Canvas(canvasEl, { ...INITIAL_SIZE });

  // 基准场景：甲、乙互不相交；丙（宽三角）同时与甲乙相交；丁只与丙相交。
  // 这样 intersecting「跳过不相交邻居」的语义在画面和读数里都能观察到。
  // 尺寸在构造时定死（Triangle 的 width/height 事后 set 不会重算轮廓点），布局只改 left/top。
  const jia = new Rect({
    left: 38, top: 65, width: 150, height: 150,
    fill: '#ef4444', opacity: 0.8, selectable: false,
  });
  const yi = new Circle({
    left: 422, top: 65, radius: 75,
    fill: '#3b82f6', opacity: 0.8, selectable: false,
  });
  const bing = new Triangle({
    left: 141, top: 180, width: 320, height: 150,
    fill: '#22c55e', opacity: 0.8, selectable: false,
  });
  const ding = new Rect({
    left: 224, top: 259, width: 220, height: 100,
    fill: '#eab308', opacity: 0.8, selectable: false,
  });
  // 「新」：只在读者选择 add / insertAt 时入列
  const xin = new Circle({
    left: 544, top: 259, radius: 36,
    fill: '#a855f7', opacity: 0.85, selectable: false,
  });

  const objectsByName = { jia, yi, bing, ding };
  const names = new Map<FabricObject, string>([
    [jia, '甲'], [yi, '乙'], [bing, '丙'], [ding, '丁'], [xin, '新'],
  ]);

  // 本轮读者所选操作派发的增删事件计数（复位阶段结束后清零）
  let roundAdded = 0;
  let roundRemoved = 0;
  fabricCanvas.on('object:added', () => {
    roundAdded += 1;
  });
  fabricCanvas.on('object:removed', () => {
    roundRemoved += 1;
  });

  function emitSnapshot(options: StackingOptions, opResult: string) {
    const current = fabricCanvas.getObjects();
    const targetIndex = current.indexOf(objectsByName[options.target]);
    const events: string[] = [];
    if (roundAdded > 0) {
      events.push(`object:added ×${roundAdded}`);
    }
    if (roundRemoved > 0) {
      events.push(`object:removed ×${roundRemoved}`);
    }
    emit({
      orderText: current.map((object) => names.get(object)).join(' → '),
      targetIndex: targetIndex === -1 ? '—' : String(targetIndex),
      objectCount: current.length,
      rectCount: `${fabricCanvas.getObjects('Rect').length} 个`,
      opResult,
      roundEvents: events.length > 0 ? events.join('、') : '无',
    });
  }

  function applyLayout(width: number, height: number) {
    // 相对舞台比例摆放，保持相交关系不随尺寸漂移
    jia.set({ left: width * 0.06, top: height * 0.18 });
    yi.set({ left: width * 0.66, top: height * 0.18 });
    bing.set({ left: width * 0.22, top: height * 0.5 });
    ding.set({ left: width * 0.35, top: height * 0.72 });
    xin.set({ left: width * 0.85, top: height * 0.72 });
  }

  function update(options: StackingOptions) {
    const target = objectsByName[options.target];

    // 阶段一：复位为基准场景（甲乙丙丁，底 → 顶）。
    // remove(...getObjects()) 是「清空对象但保留画布」的惯用写法（canvas 没有 removeAll）
    fabricCanvas.remove(...fabricCanvas.getObjects());
    fabricCanvas.add(jia, yi, bing, ding);
    // 复位阶段的增删事件不计入读数，只统计接下来读者选择的操作
    roundAdded = 0;
    roundRemoved = 0;

    // 阶段二：增删操作
    if (options.mutation === 'remove') {
      fabricCanvas.remove(target);
    } else if (options.mutation === 'add') {
      fabricCanvas.add(xin);
    } else if (options.mutation === 'insert0') {
      fabricCanvas.insertAt(0, xin);
    } else if (options.mutation === 'insert2') {
      fabricCanvas.insertAt(2, xin);
    }

    // 阶段三：层级操作。目标已不在列表时跳过——
    // 对非成员调用层级方法会把它重新塞进 _objects（不经过 add，无事件、无 canvas 引用）
    let opResult = '—';
    if (options.stackOp !== 'none' && fabricCanvas.contains(target)) {
      let changed = false;
      switch (options.stackOp) {
        case 'toFront':
          changed = fabricCanvas.bringObjectToFront(target);
          break;
        case 'toBack':
          changed = fabricCanvas.sendObjectToBack(target);
          break;
        case 'forward':
          changed = fabricCanvas.bringObjectForward(target, options.intersecting);
          break;
        case 'backwards':
          changed = fabricCanvas.sendObjectBackwards(target, options.intersecting);
          break;
        case 'moveTo':
          changed = fabricCanvas.moveObjectTo(target, options.moveIndex);
          break;
      }
      opResult = changed ? '是' : '否';
    }

    emitSnapshot(options, opResult);
  }

  function syncSize() {
    // wrapperEl 的父级就是共享舞台；createResizeObserver 观察的正是「传入元素的父级」
    const stage = fabricCanvas.wrapperEl.parentElement;
    if (!stage) {
      return;
    }
    const width = Math.floor(stage.clientWidth) || INITIAL_SIZE.width;
    const height = Math.floor(stage.clientHeight) || INITIAL_SIZE.height;
    applyLayout(width, height);
    // setDimensions 自动 requestRenderAll；位置改动由它一并带回画面
    fabricCanvas.setDimensions({ width, height });
  }

  applyLayout(INITIAL_SIZE.width, INITIAL_SIZE.height);
  const resizeObserver = createResizeObserver(fabricCanvas.wrapperEl, () =>
    syncSize(),
  );

  return {
    update,
    dispose() {
      resizeObserver.disconnect();
      void fabricCanvas.dispose();
    },
  };
}
