/*
 * 本课范例的共用支撑(与其他课程一致的外壳策略):
 * - 统一的游戏尺寸与配色,与 story-canvas 外壳的 16:9 舞台一致;
 * - createGameLoopSuspender:用 IntersectionObserver 提供"离屏暂停"——
 *   stage 滚出视口或页面隐藏时让 game.loop 休眠,回到视口时唤醒,
 *   避免多个 Phaser 实例同时全速渲染。
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

/** 画布内按钮的默认样式;按下的按钮会短暂换成 ACTIVE_COLOR。 */
export const BUTTON_STYLE = {
  fontFamily: FONT_FAMILY,
  fontSize: '13px',
  color: '#cbd5e1',
  backgroundColor: '#1f2937',
  padding: { x: 8, y: 4 },
} as const;

export const BUTTON_ACTIVE_COLOR = '#4ade80';

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

/**
 * 做一个画布内文本按钮:点击触发 onClick,按下时短暂高亮。
 * 返回按钮文本对象,便于统一释放。
 */
export function makeTextButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  originX = 0.5,
): Phaser.GameObjects.Text {
  const text = scene.add.text(x, y, label, BUTTON_STYLE).setOrigin(originX, 0.5);
  text.setInteractive({ useHandCursor: true });
  text.on('pointerdown', () => {
    text.setColor(BUTTON_ACTIVE_COLOR);
    onClick();
  });
  text.on('pointerup', () => text.setColor(BUTTON_STYLE.color));
  text.on('pointerout', () => text.setColor(BUTTON_STYLE.color));
  return text;
}
