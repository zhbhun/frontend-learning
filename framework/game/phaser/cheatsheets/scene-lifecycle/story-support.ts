/*
 * 本课三个范例共用的支撑:
 * - 统一的游戏尺寸与配色,与 story-canvas 外壳的 16:9 舞台一致;
 * - createGameLoopSuspender:Phaser 自带 requestAnimationFrame 主循环,
 *   无法复用命令式 canvas-runtime 的渲染循环,这里用 IntersectionObserver
 *   提供等价的"离屏暂停"策略——stage 滚出视口或页面隐藏时让 game.loop
 *   休眠,回到视口时唤醒,避免多个 Phaser 实例同时全速渲染。
 */
import type Phaser from 'phaser';

export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 405;
export const BACKGROUND_COLOR = '#141a26';

export interface LoopSuspender {
  dispose(): void;
}

export function createGameLoopSuspender(
  game: Phaser.Game,
  element: Element,
): LoopSuspender {
  let nearViewport = false;

  function sync() {
    if (nearViewport && document.visibilityState !== 'hidden') {
      game.loop.wake();
    } else {
      game.loop.sleep();
    }
  }

  const observer = new IntersectionObserver(
    (entries) => {
      nearViewport = entries.at(-1)?.isIntersecting ?? false;
      sync();
    },
    { rootMargin: '200px 0px' },
  );

  observer.observe(element);
  document.addEventListener('visibilitychange', sync);

  return {
    dispose() {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
    },
  };
}
