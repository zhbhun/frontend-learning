/**
 * 演示内容：编辑器的选中（单选 / 多选 / 取消）与变换手柄（缩放、旋转），
 *           以及 editor.config 的编辑边界约束（lockRatio / rotateable / rotateGap）。
 * 输入/前置：canvasStory 传入 helper 新建的 <canvas>（已插入 DOM 并填满舞台）。
 *           本课公开输入：target（选中目标 取消/矩形/椭圆/全选）、lockRatio（锁定比例 否/是/仅角点）、
 *           rotateable（允许旋转 是/否）、rotateGap（旋转吸附度数，0 关闭）。
 * 主要操作：new App({ view: canvas, editor: { circle: {} } }) 自动建立 tree（设计层）+ sky（天空层）+ editor；
 *           editor 落在 sky，可编辑元素加进 tree，两者处于不同 Leafer，点击 / 框选才能命中
 *           （EditSelect.allow 校验 target.leafer !== editor.leafer）。circle: {} 让选区上方出现专用旋转手柄。
 *           update(options)：按 target 调 editor.select(node) / select([nodes]) / cancel()；
 *           按 lockRatio / rotateable / rotateGap 写 editor.config，再 updateEditBox() 让手柄显隐与吸附立即生效；
 *           监听 Editor 的 SELECT/SCALE/ROTATE/MOVE 事件，读 editor.element（单选=被选元素，多选=合并外框模拟元素）
 *           的 width/height/rotation 同步 readout——直接读元素属性，避开 editBox 异步加载造成的读数滞后。
 * 预期结果：切 target → 手柄框出现在选中元素周围（单选=单个元素，多选=合并外框）；
 *           拖角点缩放 → 「尺寸」读数变化；拖顶部圆形旋转手柄 → 「角度」读数变化；
 *           lockRatio=是 → 缩放保持原比例；rotateable=否 → 旋转手柄消失、无法旋转；
 *           rotateGap=45 → 旋转吸附到 45° 倍数（接近时磁吸，0 关闭）。
 * 阅读主线：createSelectTransform → App+editor 装配 → editable 元素 → applyTarget 选区 →
 *           applyConfig 约束 + updateEditBox 刷新 → 事件驱动 syncReadout → dispose。
 */
import { App, Rect, Ellipse } from 'leafer-ui';
import {
  EditorEvent,
  EditorScaleEvent,
  EditorRotateEvent,
  EditorMoveEvent,
} from '@leafer-in/editor';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type SelectTarget = 'none' | 'rect' | 'ellipse' | 'multi';
export type LockRatioOption = boolean | 'corner';

export interface SelectTransformOptions {
  target: SelectTarget;
  lockRatio: LockRatioOption;
  rotateable: boolean;
  rotateGap: number;
}

export interface SelectTransformSnapshot {
  /** 当前选中元素数量。 */
  count: number;
  /** 选中模式：无 / 单选 / 多选。 */
  mode: string;
  /** 选区盒尺寸（单选=元素盒，多选=合并外框）；无选中时为「—」。 */
  size: string;
  /** 选区角度（度）；无选中时为「—」。 */
  rotation: string;
}

export interface SelectTransformInstance {
  update(options: SelectTransformOptions): void;
  dispose(): void;
}

export function createSelectTransform(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SelectTransformSnapshot) => void,
): SelectTransformInstance {
  const initial = readCanvasSize(canvas);

  // App 一行建立「设计层 + 天空层 + 编辑器」：editor: {} 触发 Creator.editor 自动创建并挂到 sky。
  // circle: {} 让选区上方出现一个专用旋转手柄；不加则默认只有四角缩放点（按 Ctrl/Cmd 拖角点才旋转）。
  const app = new App({
    view: canvas,
    width: initial.width,
    height: initial.height,
    fill: '#f8fafc',
    editor: { circle: {} },
  });

  const tree = app.tree;
  const editor = app.editor;

  // 两个可编辑元素：editable: true 是被点击 / 框选取中的前提（EditSelectHelper.findOne 按 editable 过滤）。
  const cx = initial.width / 2;
  const cy = initial.height / 2;
  const rect = new Rect({
    x: cx - 185,
    y: cy - 60,
    width: 150,
    height: 110,
    editable: true,
    fill: '#4f7cff',
    cornerRadius: 10,
  });
  const ellipse = new Ellipse({
    x: cx + 35,
    y: cy - 55,
    width: 130,
    height: 100,
    editable: true,
    fill: '#32cd79',
  });
  tree.add([rect, ellipse]);

  let lastTarget: SelectTarget | null = null;

  // 按 target 命令式选中：select(node) 单选、select([nodes]) 多选、cancel() 取消。
  // 同一目标重复调用直接跳过（target 装饰器也会比较引用，但这里先省去无谓赋值）。
  function applyTarget(target: SelectTarget) {
    if (target === lastTarget) return;
    lastTarget = target;
    switch (target) {
      case 'rect':
        editor.select(rect);
        break;
      case 'ellipse':
        editor.select(ellipse);
        break;
      case 'multi':
        editor.select([rect, ellipse]);
        break;
      case 'none':
        editor.cancel();
        break;
    }
  }

  // editor.config 是运行时可写的合并配置源；mergeConfig 在每次手柄操作时实时读取它。
  function applyConfig(options: SelectTransformOptions) {
    editor.config.lockRatio = options.lockRatio;
    editor.config.rotateable = options.rotateable;
    editor.config.rotateGap = options.rotateGap;
    // 改动配置后刷新编辑框，让手柄显隐（如 rotateable=否 隐藏旋转点）与吸附间隔立即生效。
    if (editor.list.length) editor.updateEditBox();
  }

  function syncReadout() {
    const count = editor.list.length;
    const mode = count === 0 ? '无' : count === 1 ? '单选' : '多选';
    let size = '—';
    let rotation = '—';
    if (count > 0) {
      // editor.element：单选 = 被选元素本身，多选 = 代表合并外框的模拟元素（SimulateElement，
      // 其 width/height 由 simulate() 在 select 时同步算成合并盒）。直接读它的属性，始终同步于当前
      // 选中，不依赖编辑框的异步加载时序——避免「读 editBox.rectBounds 在加载前拿到旧值」的滞后。
      const el = editor.element;
      if (el) {
        size = `${Math.round(el.width || 0)} × ${Math.round(el.height || 0)}`;
        rotation = `${Math.round(el.rotation || 0)}°`;
      }
    }
    emit({ count, mode, size, rotation });
  }

  // 用户拖手柄变换或点击切换选中时实时刷新读数。
  editor.on(EditorEvent.SELECT, syncReadout);
  editor.on(EditorScaleEvent.SCALE, syncReadout);
  editor.on(EditorRotateEvent.ROTATE, syncReadout);
  editor.on(EditorMoveEvent.MOVE, syncReadout);

  let current: SelectTransformOptions = {
    target: 'rect',
    lockRatio: false,
    rotateable: true,
    rotateGap: 0,
  };

  applyTarget(current.target);
  applyConfig(current);
  // 首帧渲染、编辑框布局就绪后再派发一次兜底读数。
  app.nextRender(syncReadout);

  // 舞台尺寸变化（如 Docs 面板开合）时同步画布尺寸并刷新读数。
  const resizeObserver = createResizeObserver(canvas, () => {
    const { width, height } = readCanvasSize(canvas);
    app.resize({ width, height });
    syncReadout();
  });

  return {
    update(options) {
      current = options;
      applyTarget(options.target);
      applyConfig(options);
      syncReadout();
    },
    dispose() {
      resizeObserver.disconnect();
      app.destroy();
    },
  };
}
