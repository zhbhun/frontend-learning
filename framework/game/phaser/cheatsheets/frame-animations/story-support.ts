/*
 * 本课三个范例共用的支撑(与 sprites 一课同款策略):
 * - 统一的游戏尺寸与配色,与 story-canvas 外壳的 16:9 舞台一致;
 * - createGameLoopSuspender:Phaser 自带 requestAnimationFrame 主循环,
 *   用 IntersectionObserver 提供"离屏暂停"——stage 滚出视口或页面隐藏时
 *   让 game.loop 休眠,回到视口时唤醒,避免多个 Phaser 实例同时全速渲染。
 * - 本课素材常量:8 帧表盘雪碧图与配套图集的 key / 帧命名约定。
 */
import type Phaser from 'phaser';

export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 405;
export const BACKGROUND_COLOR = '#141a26';
export const FONT_FAMILY = 'ui-sans-serif, system-ui, sans-serif';

export const TEXT_STYLE = {
  fontFamily: FONT_FAMILY,
  fontSize: '13px',
  color: '#8fa3c8',
} as const;

export const TITLE_STYLE = {
  fontFamily: FONT_FAMILY,
  fontSize: '18px',
  color: '#e2e8f0',
} as const;

/** 雪碧图纹理 key:load.spritesheet 切帧,帧用序号 0–7 引用 */
export const SHEET_KEY = 'gauge-sheet';
/** 图集纹理 key:同一张 PNG 配 gauge-atlas.json,帧用名字 gauge_00–gauge_07 引用 */
export const ATLAS_KEY = 'gauge-atlas';
/** 图集帧名前缀与补零位数,与 generateFrameNames 的参数一一对应 */
export const FRAME_PREFIX = 'gauge_';
export const FRAME_ZERO_PAD = 2;
/** 表盘序列总帧数 */
export const FRAME_COUNT = 8;

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
