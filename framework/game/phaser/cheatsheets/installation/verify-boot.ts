/**
 * 范例介绍:验证安装——用最小 Phaser.Game config 引导本工作区安装的 phaser@4.2.1,
 * 挂载到已插入 DOM 的共享 canvas,渲染验证画面并读出引擎版本与实际渲染器。
 * 输入:无(安装验证不需要参数)。
 * 操作:观察画面渲染;读数来自 create 回调 emit 的一次性快照。
 * 预期结果:深色背景 + 居中文本;读数显示 VERSION 与 WEBGL/CANVAS。
 * 阅读主线:createVerifyBoot(canvas) → config.canvas 挂载 → scene.create 渲染并 emit。
 */
import Phaser from 'phaser';

export interface BootSnapshot {
  version: string;
  renderer: 'WEBGL' | 'CANVAS';
}

export interface BootInstance {
  dispose(): void;
}

export function createVerifyBoot(
  canvas: HTMLCanvasElement,
  emit: (snapshot: BootSnapshot) => void,
): BootInstance {
  const game = new Phaser.Game({
    // AUTO:优先 WebGL,浏览器不支持时回退 Canvas,两种结果都算安装成功
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    backgroundColor: '#1d2a44',
    // 关键点:把 Phaser 挂到外部传入的 canvas,而不是让它自建并插入 body
    canvas,
    scale: {
      // 画布跟随父容器尺寸,让实例适应 Storybook 画布宽度
      mode: Phaser.Scale.RESIZE,
      parent: canvas.parentElement as HTMLElement,
      width: '100%',
      height: '100%',
    },
    scene: {
      create() {
        const label = this.add
          .text(0, 0, `Phaser ${Phaser.VERSION} 已启动`, {
            color: '#e2e8f0',
            fontSize: '22px',
          })
          .setOrigin(0.5);

        const center = () => {
          label.setPosition(this.scale.gameSize.width / 2, this.scale.gameSize.height / 2);
        };
        center();
        this.scale.on(Phaser.Scale.Events.RESIZE, center);

        emit({
          version: Phaser.VERSION,
          renderer: this.game.renderer.type === Phaser.WEBGL ? 'WEBGL' : 'CANVAS',
        });
      },
    },
  });

  return {
    dispose() {
      game.destroy(true);
    },
  };
}
