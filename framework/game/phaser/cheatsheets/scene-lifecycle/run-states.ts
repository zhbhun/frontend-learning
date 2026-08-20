/**
 * 范例:RUNNING / PAUSED / SLEEPING 三种运行状态。
 * 输入:「状态操作」下拉:保持运行、暂停、恢复、休眠、唤醒。
 * 主要操作:apply 把选项映射为 this.scene.pause()/resume()/sleep()/wake()。
 * 预期结果:update 帧号证明 update 是否执行(pause/sleep 冻结),
 * 画面是否消失证明是否仍在渲染(pause 定格、sleep 消失);
 * 休眠后选「恢复」无效果,区分 resume 与 wake 的适用状态。
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

export type RunStateAction = 'none' | 'pause' | 'resume' | 'sleep' | 'wake';

export interface RunStatesSnapshot {
  action: string;
  updateFrame: number;
  status: string;
  active: boolean;
  visible: boolean;
}

export interface RunStatesInstance {
  perform(action: RunStateAction): void;
  dispose(): void;
}

class RunStateScene extends Phaser.Scene {
  private updateFrame = 0;
  private block?: Phaser.GameObjects.Rectangle;
  private lastAction: RunStateAction = 'none';

  emitSnapshot: (snapshot: RunStatesSnapshot) => void = () => {};

  constructor() {
    super({ key: 'RunState' });
  }

  create() {
    this.add.text(24, 20, 'RunState 场景:方块匀速移动,帧号每帧自增', {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '18px',
      color: '#e2e8f0',
    });
    this.add.text(24, 48, 'pause 定格仍渲染 / sleep 消失不渲染', {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '13px',
      color: '#8fa3c8',
    });
    this.block = this.add.rectangle(
      80,
      GAME_HEIGHT / 2 + 20,
      32,
      32,
      0xf08228,
    );
    this.report();
  }

  setAction(action: RunStateAction) {
    this.lastAction = action;
    this.report();
  }

  override update(time: number) {
    this.updateFrame += 1;

    if (this.block) {
      const span = GAME_WIDTH - 160;
      const phase = ((time / 4000) % 2 + 2) % 2;
      const forward = phase < 1 ? phase : 2 - phase;
      this.block.x = 80 + forward * span;
    }

    if (this.updateFrame % 6 === 0 || this.updateFrame < 6) {
      this.report();
    }
  }

  private report() {
    this.emitSnapshot({
      action: this.lastAction === 'none' ? '保持运行' : this.lastAction,
      updateFrame: this.updateFrame,
      status:
        STATUS_LABELS[this.sys.settings.status] ??
        String(this.sys.settings.status),
      active: this.sys.settings.active,
      visible: this.sys.settings.visible,
    });
  }
}

export function createRunStates(
  canvas: HTMLCanvasElement,
  emit: (snapshot: RunStatesSnapshot) => void,
): RunStatesInstance {
  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    scene: [RunStateScene],
  });

  const scene = game.scene.getScene('RunState') as RunStateScene | undefined;
  if (scene) {
    scene.emitSnapshot = emit;
  }

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  return {
    perform(action: RunStateAction) {
      const target = game.scene.getScene('RunState');
      if (!target) {
        return;
      }

      if (action === 'pause') {
        target.scene.pause();
      } else if (action === 'resume') {
        target.scene.resume();
      } else if (action === 'sleep') {
        target.scene.sleep();
      } else if (action === 'wake') {
        target.scene.wake();
      }

      (target as RunStateScene).setAction(action);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
