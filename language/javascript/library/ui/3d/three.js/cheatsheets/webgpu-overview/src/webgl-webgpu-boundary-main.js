import { bindButton, bindCheckbox, writeText } from './shared-ui.js';
import { mountBoundaryLesson } from './scenes/webgl-webgpu-boundary-scene.js';

let forceWebGLBackend = false;
let disposeCurrent = null;
let bootId = 0;

bindCheckbox('force-webgpu-webgl', (value) => {
  forceWebGLBackend = value;
  boot();
}, { immediate: false });

bindButton('restart-boundary', boot);

boot();

async function boot() {
  const currentBoot = ++bootId;

  disposeCurrent?.();
  disposeCurrent = null;
  writeText('webgl-state', '-');
  writeText('webgpu-state', '等待初始化...');
  writeText('shared-api-state', '-');
  writeText('boundary-state', '-');

  const cleanup = await mountBoundaryLesson({
    webglCanvas: document.getElementById('webgl-canvas'),
    webgpuCanvas: document.getElementById('webgpu-canvas'),
    forceWebGLBackend,
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
    webgl: 'webgl-state',
    webgpu: 'webgpu-state',
    shared: 'shared-api-state',
    boundary: 'boundary-state'
  };

  writeText(targets[name], value);
}
