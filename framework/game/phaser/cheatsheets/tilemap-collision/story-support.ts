/*
 * 本课范例的支撑(与 arcade-collision 一课同款策略):
 * - 统一的游戏尺寸与配色,与 story-canvas 外壳的 16:9 舞台一致;
 *   地图为 16×9 格 × 45px,正好铺满画布。
 * - createGameLoopSuspender:Phaser 自带 requestAnimationFrame 主循环,
 *   用 IntersectionObserver 提供"离屏暂停"——stage 滚出视口或页面隐藏时
 *   让 game.loop 休眠,回到视口时唤醒,避免多个 Phaser 实例同时全速渲染。
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
