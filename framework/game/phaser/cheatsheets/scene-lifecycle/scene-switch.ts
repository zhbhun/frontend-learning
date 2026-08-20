/**
 * 范例:多场景的启动、切换与销毁。
 * 输入:「场景操作」下拉:无 / start / launch / switch / stop / remove。
 * 主要操作:对静态的 Menu 场景与运动的 Game 场景执行 this.scene 上的
 * start/launch/switch/stop/remove,两个场景各自统计 update 帧号。
 * 预期结果:读数同时给出两个场景的状态与帧号——start 后 Menu 变 SHUTDOWN,
 * switch 后 Menu 变 SLEEPING,stop 可再启动,remove 后 DESTROYED 且 start 无效。
 * 快照由工厂轮询派生(单一数据源),场景类只维护自己的状态。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';
import { STATUS_LABELS } from './lifecycle-order';

export type SceneSwitchAction =
  | 'none'
  | 'start'
  | 'launch'
  | 'switch'
  | 'stop'
  | 'remove';

export interface SceneSwitchSnapshot {
  action: string;
  menuStatus: string;
  menuFrames: number;
  gameStatus: string;
  gameFrames: number;
}

export interface SceneSwitchInstance {
  perform(action: SceneSwitchAction): void;
  dispose(): void;
}

function labelStatus(status: number): string {
  return STATUS_LABELS[status] ?? String(status);
}

class MenuScene extends Phaser.Scene {
  frames = 0;

  constructor() {
    super({ key: 'Menu' });
  }

  create() {
    this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x1c2a44,
    );
    this.add.text(24, 20, 'Menu 场景(静态,没有 update 方法)', {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '18px',
      color: '#e2e8f0',
    });
    this.add.text(24, 48, 'start 会清空我;switch 让我睡眠保留现场', {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '13px',
      color: '#8fa3c8',
    });
    this.add.text(24, 96, '开始游戏', {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '16px',
      color: '#141a26',
      backgroundColor: '#e2e8f0',
      padding: { x: 10, y: 6 },
    });
  }
}

class GameScene extends Phaser.Scene {
  frames = 0;

  private block?: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: 'Game' });
  }

  create() {
    this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x22314e,
    );
    this.add.text(24, 20, 'Game 场景:方块往返移动,帧号自增', {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '18px',
      color: '#e2e8f0',
    });
    this.block = this.add.rectangle(
      80,
      GAME_HEIGHT / 2 + 20,
      32,
      32,
      0xf08228,
    );
  }

  override update(time: number) {
    this.frames += 1;

    if (this.block) {
      const span = GAME_WIDTH - 160;
      const phase = ((time / 4000) % 2 + 2) % 2;
      const forward = phase < 1 ? phase : 2 - phase;
      this.block.x = 80 + forward * span;
    }
  }
}

export function createSceneSwitch(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SceneSwitchSnapshot) => void,
): SceneSwitchInstance {
  let lastAction = '初始';

  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    // 数组中第一个场景自动启动;第二个只注册,等 start/launch 唤起
    scene: [MenuScene, GameScene],
  });

  function report() {
    const menu = game.scene.getScene('Menu');
    const target = game.scene.getScene('Game');
    emit({
      action: lastAction,
      menuStatus: menu
        ? labelStatus(menu.sys.settings.status)
        : '已从管理器移除',
      menuFrames: menu ? (menu as MenuScene).frames : 0,
      gameStatus: target
        ? labelStatus(target.sys.settings.status)
        : 'DESTROYED (9)',
      gameFrames: target ? (target as GameScene).frames : 0,
    });
  }

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  // 场景自身不持有快照出口,读数由这里定时轮询派生,readout 侧自带节流
  const timer = window.setInterval(report, 150);

  return {
    perform(action: SceneSwitchAction) {
      const menu = game.scene.getScene('Menu');
      if (!menu) {
        return;
      }

      if (action === 'start') {
        menu.scene.start('Game');
      } else if (action === 'launch') {
        menu.scene.launch('Game');
      } else if (action === 'switch') {
        menu.scene.switch('Game');
      } else if (action === 'stop') {
        menu.scene.stop('Game');
      } else if (action === 'remove') {
        menu.scene.remove('Game');
      }

      lastAction = action === 'none' ? '初始' : action;
      report();
    },
    dispose() {
      window.clearInterval(timer);
      suspender.dispose();
      game.destroy(true);
    },
  };
}
