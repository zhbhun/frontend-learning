/*
 * 本课范例的支撑(与 camera-effects 一课同款策略):
 * - 统一的游戏尺寸与配色,与 story-canvas 外壳的 16:9 舞台一致;
 * - createGameLoopSuspender:Phaser 自带 requestAnimationFrame 主循环,
 *   用 IntersectionObserver 提供“离屏暂停”——stage 滚出视口或页面隐藏时
 *   让 game.loop 休眠,回到视口时唤醒,避免多个 Phaser 实例同时全速渲染。
 * 注意:渲染事件计数实验台依赖事件持续触发,离屏暂停时计数停走是预期行为。
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

/** 范例通用的等宽字体样式(readout 内文案与画布内标签一致风格)。 */
export const LABEL_STYLE = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '11px',
  color: '#64789c',
};

export const HUD_STYLE = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '12px',
  color: '#e7edf7',
};

/** '#rrggbb' → 0xrrggbb 数值,喂给 Glow.color 等滤镜参数。 */
export function hexColor(color: string): number {
  return parseInt(color.slice(1), 16);
}
