import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import * as THREE from 'three';

const lessonRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = resolve(lessonRoot, '../..');

function readWorkspaceFile(relativePath) {
  return readFileSync(resolve(workspaceRoot, relativePath), 'utf8');
}

function readLessonFile(relativePath) {
  return readFileSync(resolve(lessonRoot, relativePath), 'utf8');
}

test('把 TransformControls 课程接入交互路线和官方资源', () => {
  const roadmap = readWorkspaceFile('CHEATSHEET.md');
  const resources = readWorkspaceFile('RESOURCES.md');
  const knowledgeMap = readWorkspaceFile('cheatsheets/threejs-knowledge-map/README.md');

  assert.match(
    roadmap,
    /\[4\.2\.2 TransformControls\]\(cheatsheets\/transform-controls\/README\.md\)/
  );
  assert.match(
    roadmap,
    /\[4\.2\.3 调试\]\(cheatsheets\/debug-gui-and-stats\/README\.md\)/
  );
  assert.match(resources, /@官方@TransformControls docs/);
  assert.match(resources, /@官方@TransformControls example/);
  assert.match(resources, /@官方@TransformControls source/);
  assert.match(knowledgeMap, /4\.2\.3 调试/);
  assert.doesNotMatch(knowledgeMap, /4\.2\.2 调试/);
});

test('提供两个独立入口和可构建的 Vite 外壳', () => {
  for (const relativePath of [
    'index.html',
    'transform-controls.html',
    'select-and-transform.html',
    '.gitignore',
    'package.json',
    'vite.config.js',
    'src/styles.css',
    'src/shared-ui.js'
  ]) {
    assert.ok(existsSync(resolve(lessonRoot, relativePath)), `${relativePath} should exist`);
  }

  const index = readLessonFile('index.html');
  const packageJson = JSON.parse(readLessonFile('package.json'));
  const viteConfig = readLessonFile('vite.config.js');
  const styles = readLessonFile('src/styles.css');
  const gitignore = readLessonFile('.gitignore');

  assert.match(index, /href="\.\/transform-controls\.html"/);
  assert.match(index, /href="\.\/select-and-transform\.html"/);
  assert.equal(packageJson.dependencies.three, '0.185.1');
  assert.equal(packageJson.devDependencies.vite, '8.1.3');
  assert.equal(packageJson.scripts.test, 'node --test');
  assert.match(viteConfig, /transform-controls\.html/);
  assert.match(viteConfig, /select-and-transform\.html/);
  assert.match(viteConfig, /chunkSizeWarningLimit: 650/);
  assert.match(styles, /@media \(max-width: 820px\)/);
  assert.match(gitignore, /^node_modules\/$/m);
  assert.match(gitignore, /^dist\/$/m);
});

test('单对象入口覆盖 TransformControls 的核心模式、状态和生命周期', () => {
  for (const relativePath of [
    'src/shared-stage.js',
    'src/transform-controls-main.js',
    'src/scenes/transform-controls-scene.js'
  ]) {
    assert.ok(existsSync(resolve(lessonRoot, relativePath)), `${relativePath} should exist`);
  }

  const source = readLessonFile('src/scenes/transform-controls-scene.js');
  const entry = readLessonFile('src/transform-controls-main.js');

  assert.match(source, /three\/addons\/controls\/TransformControls\.js/);
  assert.match(source, /new TransformControls\(camera, renderer\.domElement\)/);
  assert.match(source, /transformControls\.attach\(mesh\)/);
  assert.match(source, /transformControls\.getHelper\(\)/);
  assert.match(source, /scene\.add\(helper\)/);

  for (const method of [
    'setMode',
    'setSpace',
    'setTranslationSnap',
    'setRotationSnap',
    'setScaleSnap',
    'setSize'
  ]) {
    assert.match(source, new RegExp(`transformControls\\.${method}\\(`));
  }

  for (const property of ['showX', 'showY', 'showZ']) {
    assert.match(source, new RegExp(`transformControls\\.${property}`));
  }

  assert.match(source, /addEventListener\('dragging-changed', handleDraggingChanged\)/);
  assert.match(source, /addEventListener\('objectChange', publishSnapshot\)/);
  assert.match(source, /orbitControls\.enabled = !event\.value/);
  assert.match(source, /const effectiveSpace = transformControls\.mode === 'scale' \? 'local' : transformControls\.space/);
  assert.match(source, /transformControls\.detach\(\)/);
  assert.match(source, /transformControls\.dispose\(\)/);
  assert.match(source, /orbitControls\.dispose\(\)/);

  assert.match(entry, /bindSelect\('mode-control'/);
  assert.match(entry, /bindSelect\('space-control'/);
  assert.match(entry, /bindCheckbox\('snap-control'/);
  assert.match(entry, /bindRange\('size-control'/);
  assert.match(entry, /spaceControl\.disabled = snapshot\.spaceLocked/);
  assert.match(entry, /spaceControl\.value = snapshot\.effectiveSpace/);
});

test('选择入口用 Raycaster 切换 attach 目标并避开 gizmo 手势', () => {
  for (const relativePath of [
    'src/select-and-transform-main.js',
    'src/scenes/select-and-transform-scene.js'
  ]) {
    assert.ok(existsSync(resolve(lessonRoot, relativePath)), `${relativePath} should exist`);
  }

  const source = readLessonFile('src/scenes/select-and-transform-scene.js');
  const entry = readLessonFile('src/select-and-transform-main.js');

  assert.match(source, /const raycaster = new THREE\.Raycaster\(\)/);
  assert.match(source, /const selectableObjects = createSelectableObjects\(\)/);
  assert.match(source, /getPointerNdc\(event, canvas, pointer\)/);
  assert.match(source, /if \(transformControls\.axis !== null\) return/);
  assert.match(source, /raycaster\.intersectObjects\(selectableObjects, false\)/);
  assert.match(source, /transformControls\.attach\(nextObject\)/);
  assert.match(source, /transformControls\.detach\(\)/);
  assert.match(source, /applySelectionState\(object, object === selectedObject\)/);
  assert.match(source, /addEventListener\('dragging-changed', handleDraggingChanged\)/);
  assert.match(source, /orbitControls\.enabled = !event\.value/);
  assert.match(source, /canvas\.addEventListener\('pointerdown', handlePointerDown\)/);
  assert.match(source, /canvas\.removeEventListener\('pointerdown', handlePointerDown\)/);

  assert.match(entry, /bindSelect\('mode-control'/);
  assert.match(entry, /bindButton\('clear-selection'/);
  assert.match(entry, /writeText\('selected-state'/);
});

test('两个场景都启用 gizmo 可见性保护和相机换边', () => {
  const sharedStage = readLessonFile('src/shared-stage.js');
  const singleObjectScene = readLessonFile('src/scenes/transform-controls-scene.js');
  const selectionScene = readLessonFile('src/scenes/select-and-transform-scene.js');

  assert.match(sharedStage, /export function keepTransformControlsVisible\(helper\)/);
  assert.match(sharedStage, /object\.renderOrder = Infinity/);
  assert.match(sharedStage, /material\.depthTest = false/);
  assert.match(sharedStage, /material\.depthWrite = false/);
  assert.match(sharedStage, /material\.toneMapped = false/);
  assert.match(singleObjectScene, /keepTransformControlsVisible\(helper\)/);
  assert.match(selectionScene, /keepTransformControlsVisible\(helper\)/);
  assert.match(singleObjectScene, /enableViewportAwarePlaneHandles\(transformControls\)/);
  assert.match(selectionScene, /enableViewportAwarePlaneHandles\(transformControls\)/);
});

test('可见性保护会覆盖 gizmo 整棵对象树的渲染状态', async () => {
  const { keepTransformControlsVisible } = await import('../src/shared-stage.js');
  const root = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ toneMapped: true });
  const child = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  root.add(child);

  keepTransformControlsVisible(root);

  assert.equal(root.renderOrder, Infinity);
  assert.equal(child.renderOrder, Infinity);
  assert.equal(material.depthTest, false);
  assert.equal(material.depthWrite, false);
  assert.equal(material.toneMapped, false);

  child.geometry.dispose();
  material.dispose();
});

test('相机绕到物体另一侧时平面手柄和 picker 会一起换到相机侧', async () => {
  const adapterPath = resolve(lessonRoot, 'src/viewport-aware-transform-controls.js');
  assert.ok(existsSync(adapterPath), 'viewport-aware adapter should exist');

  const { enableViewportAwarePlaneHandles } = await import('../src/viewport-aware-transform-controls.js');
  const domElement = {
    style: {},
    ownerDocument: { pointerLockElement: null },
    addEventListener() {},
    removeEventListener() {},
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 800, height: 600 };
    }
  };
  const { TransformControls } = await import('three/addons/controls/TransformControls.js');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  const controls = new TransformControls(camera, domElement);
  const helper = controls.getHelper();
  scene.add(object, helper);
  controls.attach(object);
  const disableViewportAware = enableViewportAwarePlaneHandles(controls);

  function activePlaneCenters(kind) {
    return controls._gizmo[kind].translate.children
      .filter((child) => child.userData.viewportAwarePlane && child.visible)
      .map((child) => {
        child.geometry.computeBoundingBox();
        return {
          name: child.name,
          center: child.geometry.boundingBox.getCenter(new THREE.Vector3())
        };
      });
  }

  camera.position.set(5, 5, 5);
  helper.updateMatrixWorld(true);

  for (const kind of ['gizmo', 'picker']) {
    const centers = activePlaneCenters(kind);
    assert.equal(centers.length, 3, `${kind} should expose one handle per plane`);
    assert.ok(centers.find(({ name }) => name === 'XY').center.x > 0);
    assert.ok(centers.find(({ name }) => name === 'YZ').center.z > 0);
    assert.ok(centers.find(({ name }) => name === 'XZ').center.x > 0);
  }

  camera.position.set(-5, 5, -5);
  helper.updateMatrixWorld(true);

  for (const kind of ['gizmo', 'picker']) {
    const centers = activePlaneCenters(kind);
    assert.equal(centers.length, 3, `${kind} should still expose one handle per plane`);
    assert.ok(centers.find(({ name }) => name === 'XY').center.x < 0);
    assert.ok(centers.find(({ name }) => name === 'YZ').center.z < 0);
    const xz = centers.find(({ name }) => name === 'XZ').center;
    assert.ok(xz.x < 0 && xz.z < 0);
  }

  disableViewportAware();
  controls.dispose();
  object.geometry.dispose();
  object.material.dispose();
});

test('课程正文能作为 TransformControls 的结构化教程和速查入口', () => {
  assert.ok(existsSync(resolve(lessonRoot, 'README.md')), 'README.md should exist');
  const lesson = readLessonFile('README.md');

  for (const heading of [
    '对象关系',
    '创建与挂载',
    '模式与坐标空间',
    '吸附',
    '事件与渲染',
    '与 OrbitControls 协调',
    '选择并切换对象',
    '生命周期',
    '常见判断',
    '参考示例',
    '参考资料'
  ]) {
    assert.match(lesson, new RegExp(`## ${heading}`));
  }

  for (const api of [
    'getHelper',
    'attach',
    'detach',
    'translate',
    'rotate',
    'scale',
    'local',
    'world',
    'translationSnap',
    'rotationSnap',
    'scaleSnap',
    'objectChange',
    'dragging-changed',
    'dispose'
  ]) {
    assert.match(lesson, new RegExp(`\\b${api}\\b`), `${api} should be documented`);
  }

  assert.match(lesson, /\[TransformControls\]\(src\/scenes\/transform-controls-scene\.js\)/);
  assert.match(lesson, /\[Select and Transform\]\(src\/scenes\/select-and-transform-scene\.js\)/);
  assert.match(lesson, /https:\/\/threejs\.org\/docs\/pages\/TransformControls\.html/);
  assert.match(lesson, /scale[^\n]*固定[^\n]*local/);
});
