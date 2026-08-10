/**
 * 范例介绍：演示 Konva.Animation 的逐帧重绘与循环控制。
 *
 * 一个圆形节点沿轨道做匀速圆周运动。读者通过 Controls 切换「播放」与「角速度」，
 * 直接观察 Konva.Animation 的三个核心机制：
 *   - 逐帧回调：func(frame) 每帧执行，只更新节点属性，绝不调用 layer.draw()。
 *   - 帧对象：frame.time / timeDiff / frameRate / lastTime，用 timeDiff 累加角度，
 *     使运动速度与帧率无关。
 *   - 循环控制：playing 为 true 时 anim.start()，false 时 anim.stop()；停止后帧
 *     回调不再触发，自动重绘也随之停止。
 *
 * 输入：playing（是否播放）、speed（角速度，度/秒）。
 * 预期：读数「状态」「时间」「帧间隔」「帧率」「角度」随播放实时变化；
 *   关闭「播放」后读数冻结在最后一帧；调节「角速度」改变旋转快慢。
 * 阅读主线：建立 Stage/Layer → 在 Konva.Animation 回调里用 timeDiff 更新位置 →
 *   用 start/stop 控制循环。
 *
 * 注意：本课的主角是 Konva.Animation 自带的逐帧循环（内部基于 requestAnimationFrame
 *   并自动 batchDraw 传入的 layer），因此不复用 canvas-runtime 的 createRenderLoop。
 */
import Konva from 'konva';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface AnimationOptions {
  /** 是否播放：true 调用 anim.start()，false 调用 anim.stop()。 */
  playing: boolean;
  /** 角速度（度/秒）：由 frame.timeDiff 换算成每帧增量，帧率无关。 */
  speed: number;
}

export interface AnimationSnapshot {
  /** 运行状态。 */
  running: boolean;
  /** frame.time：自动画首次启动以来累计的毫秒数（stop/start 不清零）。 */
  time: number;
  /** frame.timeDiff：距上一帧的毫秒数。 */
  timeDiff: number;
  /** frame.frameRate：当前每秒帧数。 */
  frameRate: number;
  /** 当前角度（度）。 */
  angle: number;
}

export interface AnimationInstance {
  update(options: AnimationOptions): void;
  dispose(): void;
}

// 视觉常量。
const FILL = '#4f7cff';
const STROKE = '#1e293b';
const STROKE_WIDTH = 2;
const ORBIT_COLOR = '#cbd5e1';
const LINK_COLOR = '#cbd5e1';
const CENTER_COLOR = '#94a3b8';

export function createAnimationDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: AnimationSnapshot) => void,
): AnimationInstance {
  const root = canvas.parentElement;
  if (!root) {
    throw new Error('未找到 canvas 的父容器，无法挂载 Konva Stage。');
  }

  // canvasStory 已在 div.cs-stage 内放好 canvas / 读数。Konva.Stage 建立时会
  // 清空 container（_buildDOM 的 container.innerHTML = ''），因此用一个独立
  // 包裹层承接舞台，避免清掉读数；默认 canvas 隐藏，改由 Konva 的图层 canvas
  // 承载绘制。
  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  wrapper.style.inset = '0';
  root.appendChild(wrapper);
  canvas.style.display = 'none';

  const initial = readCanvasSize(canvas);
  const stage = new Konva.Stage({
    container: wrapper,
    width: initial.width,
    height: initial.height,
  });
  const layer = new Konva.Layer();
  stage.add(layer);

  // 轨道路径（装饰）。
  const orbit = new Konva.Circle({
    stroke: ORBIT_COLOR,
    strokeWidth: 1,
    dash: [6, 4],
    listening: false,
  });
  layer.add(orbit);

  // 中心点到运动节点的连接线（装饰）。
  const link = new Konva.Line({
    points: [0, 0, 0, 0],
    stroke: LINK_COLOR,
    strokeWidth: 1,
    listening: false,
  });
  layer.add(link);

  // 中心点（装饰）。
  const center = new Konva.Circle({
    radius: 4,
    fill: CENTER_COLOR,
    listening: false,
  });
  layer.add(center);

  // 运动节点：每帧由 Konva.Animation 更新位置。
  const node = new Konva.Circle({
    radius: 18,
    fill: FILL,
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    shadowColor: 'rgba(15, 23, 42, 0.22)',
    shadowBlur: 10,
    shadowOffsetY: 2,
    listening: false,
  });
  layer.add(node);

  // === 当前可变状态（由 update 写入，由动画回调读取） ===
  // 角度采用「累加法」：angle += speed * timeDiff / 1000。这样停止后再启动，角度
  // 从当前值继续，不会因 frame.time 不清零而跳变。
  let angle = 0;
  let currentSpeed = 120;
  let currentPlaying = true;
  // 缓存上一帧的帧对象，用于停止时输出最后一次有效读数。
  let lastFrame = { time: 0, timeDiff: 0, frameRate: 0 };

  function computeRadius(): number {
    return Math.max(40, Math.min(stage.width(), stage.height()) * 0.28);
  }

  // 根据当前角度把运动节点放到轨道上，并更新连接线。
  function placeNode() {
    const cx = stage.width() / 2;
    const cy = stage.height() / 2;
    const r = computeRadius();
    const rad = (angle * Math.PI) / 180;
    node.setAttrs({
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    });
    link.points([cx, cy, node.x(), node.y()]);
  }

  function layout() {
    const { width, height } = readCanvasSize(canvas);
    stage.width(width);
    stage.height(height);
    const cx = width / 2;
    const cy = height / 2;
    const r = computeRadius();
    orbit.setAttrs({ x: cx, y: cy, radius: r });
    center.setAttrs({ x: cx, y: cy });
    placeNode();
    layer.batchDraw();
  }

  // === Konva.Animation：逐帧回调 ===
  // 构造时传入 (func, layer)：
  //   - func 每帧执行，this 是动画实例，frame 是 { time, timeDiff, lastTime, frameRate }。
  //   - layer 由引擎在每帧末尾自动 batchDraw 一次，因此 func 内绝不调用 layer.draw()。
  //   - 返回 false 可跳过本次重绘（这里始终更新，故不返回）。
  const anim = new Konva.Animation((frame) => {
    if (!frame) {
      return;
    }
    lastFrame = {
      time: frame.time,
      timeDiff: frame.timeDiff,
      frameRate: frame.frameRate,
    };
    // 用 timeDiff 累加角度：speed（度/秒）× timeDiff（毫秒）/ 1000 = 每帧角度增量。
    // 这样无论帧率是 30fps 还是 144fps，每秒旋转量都等于 speed。
    const delta = (currentSpeed * frame.timeDiff) / 1000;
    angle = (angle + delta) % 360;
    placeNode();
    emit({
      running: true,
      time: Math.round(frame.time),
      timeDiff: Math.round(frame.timeDiff * 10) / 10,
      frameRate: Math.round(frame.frameRate),
      angle: Math.round(angle),
    });
  }, layer);

  layout();
  anim.start();

  const resizeObserver = createResizeObserver(canvas, layout);

  return {
    update(options) {
      currentSpeed = options.speed;
      // 只在播放状态切换时 start/stop，避免重复调用。
      // start() 内部会先 stop() 再启动，所以可安全重复调用，但按状态变化触发更清晰。
      if (options.playing !== currentPlaying) {
        currentPlaying = options.playing;
        if (options.playing) {
          anim.start();
        } else {
          anim.stop();
          // 停止后帧回调不再触发：手动输出一次冻结的读数。
          layer.batchDraw();
          emit({
            running: false,
            time: Math.round(lastFrame.time),
            timeDiff: 0,
            frameRate: Math.round(lastFrame.frameRate),
            angle: Math.round(angle),
          });
        }
      }
    },
    dispose() {
      anim.stop();
      resizeObserver.disconnect();
      stage.destroy();
    },
  };
}
