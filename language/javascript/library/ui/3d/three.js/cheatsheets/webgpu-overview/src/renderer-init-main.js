import { bindButton, bindCheckbox, writeStatus, writeText } from './shared-ui.js';
import { mountRendererInitLesson } from './scenes/renderer-init-scene.js';

const canvas = document.getElementById('scene-canvas');
let forceWebGL = false;
let disposeCurrent = null;
let bootId = 0;

bindCheckbox('force-webgl', (value) => {
  forceWebGL = value;
  boot();
}, { immediate: false });

bindButton('restart-renderer', boot);

boot();

async function boot() {
  const currentBoot = ++bootId;

  disposeCurrent?.();
  disposeCurrent = null;
  writeText('active-renderer', '-');
  writeText('init-state', '-');
  writeText('size-state', '-');
  writeStatus('renderer-state', '准备初始化 renderer...');

  const cleanup = await mountRendererInitLesson(canvas, {
    forceWebGL,
    onStatus: (text, tone) => writeStatus('renderer-state', text, tone),
    onMetric: writeMetric
  });

  if (currentBoot !== bootId) {
    cleanup();
    return;
  }

  disposeCurrent = cleanup;
}

function writeMetric(name, value) {
  const targets = {
    support: 'support-state',
    renderer: 'active-renderer',
    init: 'init-state',
    size: 'size-state'
  };

  writeText(targets[name], value);
}
