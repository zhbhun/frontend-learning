/*
演示 gltf.scene 加载后的节点结构与释放。

mode 参数：
- list：traverse 整棵子树，按深度把每个节点的 name + 类型显示成读数行；
- dispose：traverse 收集 geometry / material / texture 并真正调用 dispose，
  把释放计数显示成读数行，让 scene.remove 不释放显存这件事可见。

dispose 会真的销毁当前模型；切回 list 时如果模型已经没了，会自动重新加载一份。
*/

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

import {
  buildSampleGroup,
  collectResources,
  createGLTFStage,
  disposeCollected,
  placeOnGround
} from './gltf-example-utils.js';

async function makeSampleGltfUrl() {
  const exporter = new GLTFExporter();
  const arrayBuffer = await exporter.parseAsync(buildSampleGroup(), {
    binary: true
  });
  const blob = new Blob([arrayBuffer], { type: 'model/gltf-binary' });
  return URL.createObjectURL(blob);
}

// 计算从 root 到 target 的深度（root 自身为 0）。
function depthOf(root, target) {
  let depth = 0;
  let node = target;

  while (node && node.parent && node !== root) {
    depth += 1;
    node = node.parent;
  }

  return depth;
}

function describeType(node) {
  if (node.isMesh) {
    return 'Mesh';
  }
  if (node.isCamera) {
    return 'Camera';
  }
  if (node.isLight) {
    return 'Light';
  }
  return node.type;
}

export const gltfTraverseExample = {
  create(canvas, emitSnapshot) {
    const sceneRoot = new THREE.Group();
    const state = {
      modeLabel: '—',
      rows: [],
      disposed: '—',
      error: '—'
    };

    const stage = createGLTFStage(canvas, () => state);
    stage.scene.add(sceneRoot);
    stage.setSnapshotEmitter(emitSnapshot);
    stage.render();

    const api = {
      stage,
      sceneRoot,
      currentModel: null,
      currentMode: 'list',
      busy: false
    };

    async function setup() {
      if (api.busy) {
        return;
      }
      api.busy = true;

      if (api.currentModel) {
        sceneRoot.remove(api.currentModel);
        disposeCollected(collectResources(api.currentModel));
        api.currentModel = null;
      }

      state.error = '—';
      state.modeLabel = '加载中…';
      state.rows = [];
      state.disposed = '—';
      stage.render();

      let url = null;
      try {
        url = await makeSampleGltfUrl();
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(url);

        api.currentModel = gltf.scene;
        placeOnGround(gltf.scene);
        sceneRoot.add(gltf.scene);

        applyMode('list');
      } catch (err) {
        state.error = err.message;
        stage.render();
      } finally {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
        api.busy = false;
      }
    }

    function applyMode(mode) {
      api.currentMode = mode;
      state.rows = [];
      state.disposed = '—';
      state.error = '—';

      if (!api.currentModel) {
        state.modeLabel = mode === 'list' ? '节点列表（无模型）' : '释放计数（无模型）';
        stage.render();
        return;
      }

      if (mode === 'list') {
        state.modeLabel = '节点列表（traverse）';

        const rows = [];
        api.currentModel.traverse((node) => {
          const depth = depthOf(api.currentModel, node);
          // 用 · 字符做缩进，避免 HTML 折叠普通空格导致层级看不见。
          const indent = '·'.repeat(depth);
          const name = node.name || node.type;
          const label = indent ? `${indent} ${name}` : name;
          rows.push([label, describeType(node)]);
        });
        state.rows = rows;
      } else if (mode === 'dispose') {
        state.modeLabel = '释放计数（dispose）';

        const collected = collectResources(api.currentModel);
        disposeCollected(collected);
        state.disposed = `geometry ${collected.geometries.size} · material ${collected.materials.size} · texture ${collected.textures.size}`;

        sceneRoot.remove(api.currentModel);
        api.currentModel = null;
      }

      stage.render();
    }

    api.setup = setup;
    api.applyMode = applyMode;
    setup();

    return api;
  },

  apply(instance, args) {
    const next = args && args.mode ? args.mode : 'list';

    // dispose 之后模型没了；切回 list 时先重新加载，再展示节点列表。
    if (next === 'list' && !instance.currentModel && !instance.busy) {
      instance.setup();
      return;
    }

    instance.applyMode(next);
  },

  readout(snapshot) {
    const header = [['模式', snapshot.modeLabel]];

    if (snapshot.rows.length > 0) {
      return header.concat(snapshot.rows);
    }

    return header.concat([
      ['释放', snapshot.disposed],
      ['错误', snapshot.error]
    ]);
  }
};
