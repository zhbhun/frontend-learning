import { readElement, writeText } from './shared-ui.js';
import { createAssetPathsDeployScene } from './scenes/asset-paths-deploy-scene.js';

const lesson = createAssetPathsDeployScene({
  canvas: readElement('scene-canvas'),
  onSnapshot: updateSnapshot
});

window.addEventListener('beforeunload', lesson.dispose);

function updateSnapshot(snapshot) {
  writeText('base-url', snapshot.baseUrl);
  writeText('module-asset-url', snapshot.moduleAssetUrl);
  writeText('public-asset-url', snapshot.publicAssetUrl);
  writeText('page-url', snapshot.pageUrl);
  writeText('asset-load-state', snapshot.loadState);
}
