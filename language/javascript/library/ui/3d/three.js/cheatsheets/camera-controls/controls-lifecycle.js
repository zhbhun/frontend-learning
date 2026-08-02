import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import {
  createControllerStage,
  formatVector
} from './controller-stage.js';

/*
演示 Controls 公共生命周期：enabled 只暂停响应，disconnect() 移除 DOM 监听，
connect() 可以连接到指定元素，dispose() 用于终止使用并释放监听。

依次点击停用、断开、重新连接和销毁，再拖动画布；状态与 change 计数能证明每一步是否生效。
销毁是终态，本实例不会偷偷重建控制器。读文件时先看四个操作按钮的处理函数。
*/
export function createControlsLifecycleExample() {
  const lifecycle = {
    enabled: true,
    connected: true,
    disposed: false
  };

  const example = createControllerStage({
    title: 'Controls 生命周期',
    hint: '按顺序尝试停用、断开、重新连接与销毁，再拖动画布核对事件计数。',
    cameraPosition: [6.5, 4.5, 7.5],
    activation: 'manual',
    createControls({ camera, canvas, target }) {
      const controls = new OrbitControls(camera, canvas);
      controls.target.copy(target);
      controls.enableDamping = true;
      controls.update();
      return controls;
    },
    onFrame({ controls }, delta) {
      if (!lifecycle.disposed) {
        controls.update(delta);
      }
    },
    onVisibilityChange({ controls }, isNear) {
      if (!lifecycle.disposed) {
        controls.enabled = isNear && lifecycle.enabled && lifecycle.connected;
      }
    },
    readout({ controls, state }) {
      return [
        ['生命周期', lifecycle.disposed ? '已销毁' : lifecycle.connected ? '已连接' : '已断开'],
        ['enabled', String(!lifecycle.disposed && controls.enabled)],
        ['domElement', lifecycle.connected ? 'canvas' : '无监听'],
        ['target', formatVector(controls.target)],
        ['change 事件', state.eventCounts.change]
      ];
    }
  });

  const enabledButton = example.addAction('停用输入', () => {
    if (lifecycle.disposed) return;
    lifecycle.enabled = !lifecycle.enabled;
    example.context.controls.enabled =
      lifecycle.enabled && lifecycle.connected && example.context.state.nearViewport;
    enabledButton.textContent = lifecycle.enabled ? '停用输入' : '启用输入';
    example.renderOnce();
  });

  const disconnectButton = example.addAction('断开监听', () => {
    if (lifecycle.disposed || !lifecycle.connected) return;
    example.context.controls.disconnect();
    example.context.controls.enabled = false;
    lifecycle.connected = false;
    disconnectButton.disabled = true;
    connectButton.disabled = false;
    example.renderOnce();
  });

  const connectButton = example.addAction('重新连接', () => {
    if (lifecycle.disposed || lifecycle.connected) return;
    example.context.controls.connect(example.context.canvas);
    lifecycle.connected = true;
    example.context.controls.enabled = lifecycle.enabled && example.context.state.nearViewport;
    disconnectButton.disabled = false;
    connectButton.disabled = true;
    example.renderOnce();
  });
  connectButton.disabled = true;

  const disposeButton = example.addAction(
    '销毁控制器',
    () => {
      if (lifecycle.disposed) return;
      example.context.controls.dispose();
      example.context.controls.enabled = false;
      lifecycle.connected = false;
      lifecycle.disposed = true;
      enabledButton.disabled = true;
      disconnectButton.disabled = true;
      connectButton.disabled = true;
      disposeButton.disabled = true;
      example.renderOnce();
    },
    { primary: true }
  );

  return example;
}
