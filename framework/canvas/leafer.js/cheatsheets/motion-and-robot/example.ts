/**
 * 演示内容：@leafer-in/motion-path 的沿路径运动 + @leafer-in/robot 的精灵帧动画，
 *           两者合奏为一个「精灵沿路径行走」的场景。
 * 输入/前置：canvasStory 传入 helper 新建的 <canvas>（已插入 DOM，CSS 100% 撑满舞台）。
 *           顶部副作用导入 @leafer-in/motion-path 不可省：它在 UI 原型上注册
 *           motionPath / motion / motionRotation / motionAround 等属性，并改写
 *           getMotionPath / getMotionPoint / getMotionTotal / __updateMotionPath 方法
 *          （leafer-ui 本体只留空桩，不导入这些方法为空、沿路径运动不生效）。
 *           { Robot } 命名导入会触发 @registerUI() 注册 Robot 元素。
 *           本课公开输入：progress（沿路径位置，0-100%）、action（walk 循环帧 / idle 静止帧）、
 *           fps（Robot 帧率）、autoRotate（朝向是否跟随路径切线）。
 * 主要操作：new Leafer({ view: canvas }) 复用传入 <canvas>；画一条虚线 Path 作为路径【提供者】
 *          （motionPath:true），同级放一个 Robot 作为【跟随者】，设 motionAround:'center' 让其
 *           中心贴在路径上。Robot 的帧图由 makeWalkSprite() 用离屏 canvas 现场绘制 8 帧行走循环
 *           再 toDataURL，避免依赖外部图片，保证 Storybook 可稳定复现。
 *           update 时按 progress 写 robot.motion = {type:'percent', value}（百分比按路径总长换算），
 *           按 autoRotate 写 motionRotation（true=自动转向切线 / false=保持竖直），按 action/fps 驱动精灵。
 *           readout 由 createRenderLoop 轮询：motionPath 没有进度事件、Robot 没有换帧事件，
 *           故用 rAF 轮询 robot.now 与 getMotionPoint 派生读数；循环在离开视口 / 页面隐藏时自动暂停。
 * 预期结果：拖「沿路径位置」→ Robot 沿虚线曲线移动，读数「运动进度」「朝向」同步变化；
 *           关「朝向跟随」→ Robot 保持竖直、朝向归 0；切「精灵动作」到 idle → 停在静止帧、当前帧不变；
 *           切回 walk → 帧循环播放、当前帧递增；调「帧率」→ 换帧节奏明显改变。
 * 阅读主线：makeWalkSprite 现场画帧图 → 建舞台 / 标题 / 路径 / Robot → relayout 生成曲线并初始化 motion →
 *           update 分流四个输入 → emitReadout 派生读数 → dispose 清 __timer / observer / leafer。
 */
import '@leafer-in/motion-path';
import { Robot } from '@leafer-in/robot';
import { Group, Leafer, Path, Text } from 'leafer-ui';
import {
  createRenderLoop,
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type RobotAction = 'walk' | 'idle';

export interface MotionRobotOptions {
  /** 沿路径位置，百分比 0-100。 */
  progress: number;
  /** 精灵动作：walk 循环播放行走帧 / idle 静止帧。 */
  action: RobotAction;
  /** Robot 帧率（FPS），对应 IRobotAttrData.FPS。 */
  fps: number;
  /** 朝向是否跟随路径切线（motionRotation）。 */
  autoRotate: boolean;
}

export interface MotionRobotSnapshot {
  /** 运动进度（百分比）。 */
  progress: string;
  /** 当前朝向角度（度），autoRotate 关时为 0。 */
  rotation: string;
  /** Robot 当前帧编号（0 起）。 */
  frame: number;
  /** 当前动作名。 */
  action: string;
}

export interface MotionRobotInstance {
  update(options: MotionRobotOptions): void;
  dispose(): void;
}

// 精灵帧参数：8 帧、每帧 80×80 的单行雪碧图。
const FRAME_COUNT = 8;
const FRAME_SIZE = 80;
// Robot 在舞台上的显示尺寸（略小于帧图，缩放后更清晰）。
const ROBOT_DISPLAY = 72;
// idle 动作停在第 3 帧（行走循环的中间姿态）。
const IDLE_FRAME = 3;

export function createMotionAndRobot(
  canvas: HTMLCanvasElement,
  emit: (snapshot: MotionRobotSnapshot) => void,
): MotionRobotInstance {
  const initial = readCanvasSize(canvas);
  const leafer = new Leafer({
    view: canvas,
    width: initial.width,
    height: initial.height,
    fill: '#f8fafc',
  });

  const title = new Text({
    text: '精灵沿路径行走：拖「沿路径位置」，或切「精灵动作」「帧率」',
    fontSize: 15,
    fontWeight: 600,
    fill: '#475569',
    hittable: false,
  });
  leafer.add(title);

  const hint = new Text({
    text: 'Path motionPath:true 提供路径 · Robot motion 跟随 · motionRotation 自动转向',
    fontSize: 12,
    fill: '#94a3b8',
    hittable: false,
  });
  leafer.add(hint);

  // 用一个 Group 把「路径提供者」和「跟随者」装为同级兄弟：
  // motion-path 的 getMotionPath 在 parent.children 里查找 motionPath:true 的元素作为路径，
  // 因此二者必须是同一父级下的兄弟，而非父子嵌套。
  const scene = new Group();
  leafer.add(scene);

  // 路径提供者：一条虚线曲线。motionPath:true 把它标记为运动路径。
  const path = new Path({
    motionPath: true,
    stroke: '#cbd5e1',
    strokeWidth: 2,
    dashPattern: [6, 6],
    hittable: false,
  });
  scene.add(path);

  // 跟随者：Robot 精灵。帧图现场生成（data URL），size + total 让 Robot 按雪碧图剪辑。
  const robot = new Robot({
    robot: {
      url: makeWalkSprite(),
      size: { width: FRAME_SIZE, height: FRAME_SIZE },
      total: FRAME_COUNT,
    },
    // actions：数组 = 循环播放这些帧编号；数字 = 静止停在该帧。
    actions: {
      walk: [0, 1, 2, 3, 4, 5, 6, 7],
      idle: IDLE_FRAME,
    },
    action: 'walk',
    width: ROBOT_DISPLAY,
    height: ROBOT_DISPLAY,
    hittable: false,
  });
  // motionAround:'center' 让 Robot 中心（而非左上角）贴在路径上。
  // motionRotation:true 让其朝向跟随路径切线（默认值，显式写出便于 autoRotate 切换）。
  robot.set({ motionAround: 'center', motionRotation: true });
  scene.add(robot);

  // 布局状态：resize 时重算，确定曲线的起止与控制点。
  let current: MotionRobotOptions = {
    progress: 50,
    action: 'walk',
    fps: 12,
    autoRotate: true,
  };
  let lastAction = '';

  function relayout() {
    const size = readCanvasSize(canvas);
    leafer.resize({ width: size.width, height: size.height });

    title.set({ x: 24, y: 20 });
    hint.set({ x: 24, y: size.height - 28 });

    // 一条横跨画布的 S 形三次贝塞尔，两端有明显切线变化，便于观察 autoRotate。
    const pad = Math.max(72, size.width * 0.12);
    const left = pad;
    const right = Math.max(left + 1, size.width - pad);
    const cy = size.height * 0.5;
    const amp = Math.min(90, size.height * 0.2);
    const span = right - left;
    path.set({
      x: 0,
      y: 0,
      // path 用本地坐标；motion-path 读取 Path 的 path 数据换算运动轨迹。
      path: `M ${left} ${cy} C ${left + span * 0.25} ${cy - amp}, ${left + span * 0.75} ${cy + amp}, ${right} ${cy}`,
    });

    // 尺寸变了路径也变：用当前进度重建 motion，让位置匹配新曲线。
    applyMotion(current);
  }

  function applyMotion(options: MotionRobotOptions) {
    // motion 的百分比值由 motion-path 的 Transition 处理器按 getMotionTotal() 换算成绝对距离。
    robot.set({
      motionRotation: options.autoRotate ? true : false,
      motion: { type: 'percent', value: options.progress / 100 },
    });
  }

  function emitReadout() {
    let rotation = 0;
    const total = robot.getMotionTotal();
    if (total > 0) {
      const point = robot.getMotionPoint(
        { type: 'percent', value: current.progress / 100 },
        'center',
      );
      // getMotionPoint 返回路径切线角度；autoRotate 关时 Robot 实际不转向，读数也归 0。
      rotation = current.autoRotate ? Math.round(point.rotation ?? 0) : 0;
    }
    emit({
      progress: `${Math.round(current.progress)}%`,
      rotation: `${rotation}°`,
      frame: robot.now ?? 0,
      action: current.action,
    });
  }

  const resizeObserver = createResizeObserver(canvas, relayout);
  relayout();

  // motionPath 与 Robot 都不发自驱的进度 / 换帧事件，用 rAF 轮询派生读数；
  // createRenderLoop 在元素离开视口或页面隐藏时自动停跑，避免无谓功耗。
  const renderLoop = createRenderLoop(canvas, emitReadout);

  return {
    update(options) {
      current = options;
      // 帧率直接写 FPS：Robot.__runAction 每帧重读 this.FPS，立即生效。
      robot.FPS = options.fps;
      // 仅在动作真正变化时切换：__updateAction 会清旧定时器、按新动作重排。
      if (options.action !== lastAction) {
        lastAction = options.action;
        robot.action = options.action;
      }
      applyMotion(options);
      emitReadout();
    },
    dispose() {
      renderLoop.dispose();
      // Robot 的行走动作靠递归 setTimeout 驱动，destroy 不会自动停链，需手动清掉 __timer。
      robot.pause();
      const internal = robot as unknown as { __timer?: ReturnType<typeof setTimeout> };
      if (internal.__timer) clearTimeout(internal.__timer);
      resizeObserver.disconnect();
      leafer.destroy();
    },
  };
}

/**
 * 现场绘制一张 8 帧的单行雪碧图并返回 data URL。
 * 每帧一个面向右侧的小机器人：腿前后摆动 + 身体轻微起伏，左上角带帧编号便于核对 readout。
 * 这样范例不依赖任何外部图片，Storybook 可稳定复现。
 */
function makeWalkSprite(): string {
  const canvas = document.createElement('canvas');
  canvas.width = FRAME_COUNT * FRAME_SIZE;
  canvas.height = FRAME_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  for (let i = 0; i < FRAME_COUNT; i++) {
    drawRobotFrame(ctx, i * FRAME_SIZE, i);
  }
  return canvas.toDataURL('image/png');
}

function drawRobotFrame(
  ctx: CanvasRenderingContext2D,
  ox: number,
  frame: number,
): void {
  const S = FRAME_SIZE;
  const cx = ox + S / 2;
  const cy = S / 2;
  // 行走相位：8 帧覆盖一个完整步态周期。
  const phase = (frame / FRAME_COUNT) * Math.PI * 2;
  const bob = Math.sin(phase * 2) * 1.5;
  const legSwing = Math.sin(phase) * 10;

  // 腿（先画，位于身体之后）。
  ctx.fillStyle = '#475569';
  fillRoundRect(ctx, cx - 14 + legSwing, cy + 8, 8, 16, 3);
  fillRoundRect(ctx, cx + 6 - legSwing, cy + 8, 8, 16, 3);

  // 身体。
  ctx.fillStyle = '#6366f1';
  fillRoundRect(ctx, cx - 22, cy - 16 + bob, 44, 28, 8);

  // 面板（朝右的前侧），用来凸显 autoRotate 时的朝向变化。
  ctx.fillStyle = '#e0e7ff';
  fillRoundRect(ctx, cx - 2, cy - 10 + bob, 20, 16, 5);
  ctx.fillStyle = '#312e81';
  ctx.beginPath();
  ctx.arc(cx + 10, cy - 2 + bob, 3, 0, Math.PI * 2);
  ctx.fill();

  // 天线 + 顶端灯。
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 16 + bob);
  ctx.lineTo(cx, cy - 26 + bob);
  ctx.stroke();
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(cx, cy - 28 + bob, 3, 0, Math.PI * 2);
  ctx.fill();

  // 帧编号徽标（核对 readout「当前帧」用）。
  ctx.fillStyle = 'rgba(15,23,42,0.55)';
  ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(String(frame), ox + 6, 16);
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  ctx.fill();
}
