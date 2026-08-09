/**
 * 范例介绍：演示拖拽循环与「指针捕获」——对比 globalpointermove（全局）与 pointermove（局部），
 *           直观看到局部移动会在快速拖拽或抬手离开对象时丢失指针。
 * 输入：移动事件模式（global 全局 / local 局部）。
 * 主要操作：pointerdown 记录「指针 - 对象」偏移 → 移动事件按模式更新坐标 → pointerup / pointerupoutside 结束。
 * 预期结果：全局模式下对象始终跟随指针、抬手即放；局部模式下快速拖动对象会「掉」在原地，
 *           且在对象外抬手时「拖拽中」状态卡住（pointermove / pointerup 都不再触发）。
 * 阅读主线：先看 onDown 记录偏移、onGlobalMove / onLocalMove 按模式分支更新坐标；对照 onUpOutside 只在
 *           全局模式收尾，理解局部方案为什么「丢指针」；最后看 update 切换模式与 dispose 释放、离屏暂停。
 */
import {
  Application,
  Graphics,
  FederatedPointerEvent,
} from 'pixi.js';

export interface DragDemoArgs {
  moveEvent: 'global' | 'local';
}

export interface DragDemoSnapshot {
  moveEvent: string;
  dragging: string;
  pointer: string;
  card: string;
}

export interface DragDemoInstance {
  update(args: DragDemoArgs): void;
  dispose(): void;
}

const MODE_LABEL: Record<DragDemoArgs['moveEvent'], string> = {
  global: '全局 globalpointermove',
  local: '局部 pointermove',
};

export function createDragDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DragDemoSnapshot) => void,
): DragDemoInstance {
  const app = new Application();

  let disposed = false;
  let ready = false;
  let current: DragDemoArgs = { moveEvent: 'global' };
  let card: Graphics | null = null;

  // 每个可拖对象各自维护 dragging 与偏移；这里只有一个卡片，用闭包持有即可。
  let dragging = false;
  const offset = { x: 0, y: 0 };
  const pointer = { x: 0, y: 0 };

  function emitSnapshot() {
    if (!ready) {
      return;
    }
    emit({
      moveEvent: MODE_LABEL[current.moveEvent],
      dragging: dragging ? '是' : '否',
      pointer: `${Math.round(pointer.x)}, ${Math.round(pointer.y)}`,
      card: `${Math.round(card?.x ?? 0)}, ${Math.round(card?.y ?? 0)}`,
    });
  }

  // pointerdown：开始拖拽，记录「指针 - 对象」偏移。
  // 为什么要偏移：直接把对象中心贴到指针会让对象「跳」一下；记录按下时的差值，拖动时减回去，抓握点保持不变。
  function onDown(e: FederatedPointerEvent) {
    if (!card) {
      return;
    }
    dragging = true;
    card.cursor = 'grabbing';
    offset.x = e.global.x - card.x;
    offset.y = e.global.y - card.y;
    pointer.x = e.global.x;
    pointer.y = e.global.y;
    emitSnapshot();
  }

  // 全局移动：globalpointermove 在指针离开对象后仍持续触发——这是 v8 实现拖拽「指针捕获」的标准做法。
  function onGlobalMove(e: FederatedPointerEvent) {
    pointer.x = e.global.x;
    pointer.y = e.global.y;
    if (current.moveEvent !== 'global' || !card) {
      emitSnapshot();
      return;
    }
    if (dragging) {
      card.x = e.global.x - offset.x;
      card.y = e.global.y - offset.y;
    }
    emitSnapshot();
  }

  // 局部移动：pointermove 只在指针位于对象上方时触发。
  // 影响：快速拖动时指针一旦移出对象边界，事件立刻停止，对象「掉」在原地不再跟随。
  function onLocalMove(e: FederatedPointerEvent) {
    pointer.x = e.global.x;
    pointer.y = e.global.y;
    if (current.moveEvent !== 'local' || !card) {
      emitSnapshot();
      return;
    }
    if (dragging) {
      card.x = e.global.x - offset.x;
      card.y = e.global.y - offset.y;
    }
    emitSnapshot();
  }

  function onUp() {
    if (!dragging) {
      return;
    }
    dragging = false;
    if (card) {
      card.cursor = 'grab';
    }
    emitSnapshot();
  }

  // pointerupoutside：指针在对象外抬起时触发。
  // 仅在全局模式收尾：这样局部模式能完整暴露「在对象外抬手 → dragging 卡住」的 bug。
  function onUpOutside() {
    if (current.moveEvent !== 'global') {
      return;
    }
    onUp();
  }

  app
    .init({
      canvas,
      background: '#1a1a2e',
      antialias: true,
      resizeTo: canvas.parentElement ?? window,
    })
    .then(() => {
      if (disposed) {
        app.destroy();
        return;
      }
      ready = true;

      // 圆角卡片绘制在原点中心：card.x / card.y 即卡片中心，便于偏移与约束计算。
      card = new Graphics();
      card
        .roundRect(-70, -45, 140, 90, 14)
        .fill(0x4f7cff)
        .stroke({ width: 2, color: 0xf8fafc });
      // 顶部色条让方向可辨
      card.rect(-70, -45, 140, 14).fill({ color: 0xffffff, alpha: 0.18 });

      card.x = app.screen.width / 2;
      card.y = app.screen.height / 2;
      card.eventMode = 'static';
      card.cursor = 'grab';
      app.stage.addChild(card);

      card.on('pointerdown', onDown);
      card.on('pointermove', onLocalMove);
      card.on('globalpointermove', onGlobalMove);
      card.on('pointerup', onUp);
      card.on('pointerupoutside', onUpOutside);

      emitSnapshot();
    })
    .catch(() => {
      // 渲染器初始化失败时画布保持空白。
    });

  // 离屏时暂停渲染循环以省 GPU。
  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      if (!ready) {
        return;
      }
      const visible = entries.at(-1)?.isIntersecting ?? false;
      if (visible) {
        app.start();
      } else {
        app.stop();
      }
    },
    { rootMargin: '200px 0px' },
  );
  visibilityObserver.observe(canvas.parentElement ?? canvas);

  return {
    update(args) {
      current = args;
      emitSnapshot();
    },
    dispose() {
      disposed = true;
      visibilityObserver.disconnect();
      if (ready) {
        app.destroy();
      }
    },
  };
}
