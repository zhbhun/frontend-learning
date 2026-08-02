/*
演示 GLTFLoader 的真实加载闭环。

输入是 source 参数：
- generated-glb：用 GLTFExporter 在内存里把示例模型导出成 GLB blob URL，再喂给 GLTFLoader；
- missing：指向一个不存在的相对路径，触发 HTTP 404；
- corrupt：给一段不像 glTF 的字节，触发解码 / 解析错误。

读数显示加载源、状态、解析出的 gltf 字段（mesh 数、animations 数）和最终错误信息。
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

const SOURCE_LABELS = {
  'generated-glb': '内存生成 GLB',
  missing: '不存在的 URL（404）',
  corrupt: '损坏的字节（解码失败）'
};

// binary: true 让 GLTFExporter 输出单文件 GLB（ArrayBuffer），
// 不再附带外部 .bin 或贴图，部署和加载最简单。
async function makeGeneratedGlbUrl() {
  const exporter = new GLTFExporter();
  const arrayBuffer = await exporter.parseAsync(buildSampleGroup(), {
    binary: true
  });
  const blob = new Blob([arrayBuffer], { type: 'model/gltf-binary' });
  return URL.createObjectURL(blob);
}

// 给一段不像 glTF 的字节，让 GLTFLoader 在二进制头或 JSON 解析阶段抛错。
function makeCorruptUrl() {
  const bytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0xff, 0xee]);
  const blob = new Blob([bytes], { type: 'model/gltf-binary' });
  return URL.createObjectURL(blob);
}

function describeError(err) {
  const message = (err && err.message) || String(err);

  if (/404|Not Found/i.test(message)) {
    return 'HTTP 404：找不到资源';
  }

  if (/Unsupported glTF-Binary header|JSON content not found|Unexpected token/i.test(message)) {
    return '解析失败：不是合法的 glTF 数据';
  }

  if (/Unsupported asset/i.test(message)) {
    return '解析失败：缺少合法的 asset.version';
  }

  return message;
}

export const gltfLoadingExample = {
  create(canvas, emitSnapshot) {
    const sceneRoot = new THREE.Group();
    const state = {
      sourceLabel: '—',
      status: '等待加载',
      meshes: '—',
      animations: '—',
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
      currentSource: null,
      busy: false
    };

    function clearCurrent() {
      if (api.currentModel) {
        sceneRoot.remove(api.currentModel);
        disposeCollected(collectResources(api.currentModel));
        api.currentModel = null;
      }
    }

    async function load(source) {
      if (api.busy) {
        return;
      }
      api.busy = true;

      clearCurrent();
      api.currentSource = source;
      state.sourceLabel = SOURCE_LABELS[source] || source;
      state.status = '加载中…';
      state.meshes = '—';
      state.animations = '—';
      state.error = '—';
      stage.render();

      let url = null;
      try {
        if (source === 'generated-glb') {
          url = await makeGeneratedGlbUrl();
        } else if (source === 'missing') {
          url = '/nonexistent/sample-model.glb';
        } else if (source === 'corrupt') {
          url = makeCorruptUrl();
        }
      } catch (err) {
        state.status = '构造 URL 失败';
        state.error = err.message;
        api.busy = false;
        stage.render();
        return;
      }

      const loader = new GLTFLoader();

      try {
        const gltf = await loader.loadAsync(url);
        api.currentModel = gltf.scene;

        placeOnGround(gltf.scene);
        sceneRoot.add(gltf.scene);

        let meshCount = 0;
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            meshCount += 1;
          }
        });

        state.status = '加载成功';
        state.meshes = String(meshCount);
        // gltf.animations 是 AnimationClip[]，静态模型返回空数组；播放留给动画课。
        state.animations = String(gltf.animations.length);
        state.error = '—';
      } catch (err) {
        state.status = '加载失败';
        state.error = describeError(err);
      } finally {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
        api.busy = false;
        stage.render();
      }
    }

    api.load = load;
    load('generated-glb');

    return api;
  },

  apply(instance, args) {
    const next = args && args.source ? args.source : 'generated-glb';

    if (next !== instance.currentSource) {
      instance.load(next);
      return;
    }

    instance.stage.render();
  },

  readout(snapshot) {
    return [
      ['加载源', snapshot.sourceLabel],
      ['状态', snapshot.status],
      ['Mesh 数', snapshot.meshes],
      ['animations', snapshot.animations],
      ['错误', snapshot.error]
    ];
  }
};
