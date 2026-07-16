import { bindButton, bindCheckbox, readElement, writeText } from './shared-ui.js';
import { createLifecycleMountController } from './scenes/lifecycle-mount-scene.js';

const controller = createLifecycleMountController({
  host: readElement('mount-host'),
  onSnapshot: updateSnapshot
});

bindButton('mount-button', controller.mount);
bindButton('unmount-button', controller.unmount);
bindButton('remount-button', controller.remount);
bindCheckbox('use-texture', controller.setUseTexture);

controller.mount();
window.addEventListener('beforeunload', controller.unmount);

function updateSnapshot(snapshot) {
  writeText('mount-state', snapshot.mounted ? '已挂载' : '未挂载');
  writeText('mount-count', snapshot.mounts);
  writeText('dispose-count', snapshot.disposals);
  writeText(
    'disposed-resources',
    `geometry ${snapshot.disposed.geometries} / material ${snapshot.disposed.materials} / texture ${snapshot.disposed.textures}`
  );
  writeText('listener-state', snapshot.listeners);
  writeText('lifecycle-action', snapshot.action);
}
