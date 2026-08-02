/*
最小查看器范例：把 renderer / scene / camera / OrbitControls / Light / GLTFLoader /
LoadingManager / resize 组合成一个可运行闭环。

输入参数（args）：
- source：加载源
  - sample：用 GLTFExporter 在内存里把示例模型导出成 GLB blob URL，再喂给 GLTFLoader
  - missing：指向不存在的相对路径，触发 LoadingManager.onError 的 404 路径
  - corrupt：给一段不像 glTF 的字节，触发解析失败路径
- lighting：光照预设
  - studio：HemisphereLight + DirectionalLight（默认），适合 PBR 模型调试
  - flat：只剩环境光，模型会偏暗、失去方向感，用于观察"光照决定画面"这条链路
- damping：OrbitControls.enableDamping 开关，演示阻尼开启后必须逐帧 update
- autoRotate：OrbitControls.autoRotate 开关，演示自动旋转依赖逐帧 update

读数显示加载源、状态、进度百分比、mesh 数、模型包围盒尺寸和相机到 target 距离，
让"加载完成 → 取景 → 渲染"这条生命周期里的每一步可观察。
*/

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

import {
  buildSampleModel,
  collectResources,
  createViewerStage,
  disposeCollected,
  fitCameraToBox,
  formatVector
} from './viewer-stage.js';

const SOURCE_LABELS = {
  sample: '内存生成 GLB',
  missing: '不存在的 URL（404）',
  corrupt: '损坏的字节（解析失败）'
};

// binary: true 让 GLTFExporter 输出单文件 GLB（ArrayBuffer），
// 不再附带外部 .bin 或贴图，部署和加载最简单。
async function makeSampleGlbUrl() {
  const exporter = new GLTFExporter();
  const arrayBuffer = await exporter.parseAsync(buildSampleModel(), {
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

  return message;
}

export const viewerCanvasExample = {
  create(canvas, emitSnapshot) {
    const state = {
      sourceLabel: '—',
      status: '等待加载',
      progress: '—',
      meshes: '—',
      boxSize: '—',
      cameraDistance: '—',
      error: '—'
    };

    const stage = createViewerStage(canvas, () => state);
    stage.setSnapshotEmitter(() => {
      // 每次推快照时同步读出相机到 target 的距离，让"取景后距离"成为可观察证据。
      if (stage.controls) {
        state.cameraDistance = stage.camera.position.distanceTo(stage.controls.target).toFixed(2);
      }
      emitSnapshot(state);
    });

    const ambientFill = new THREE.AmbientLight('#ffffff', 0.3);
    stage.scene.add(ambientFill);

    const api = {
      stage,
      currentModel: null,
      boxHelper: null,
      currentSource: null,
      currentLighting: null,
      busy: false,
      // 故意不阻塞 create 的初始加载：如果 apply 在初始 load 还在跑时就到了，
      // 把想要的 source 存到这里，load 完成后再补一次。
      pendingSource: null
    };

    function clearCurrent() {
      if (api.boxHelper) {
        stage.scene.remove(api.boxHelper);
        api.boxHelper.geometry.dispose();
        api.boxHelper.material.dispose();
        api.boxHelper = null;
      }

      if (api.currentModel) {
        stage.modelRoot.remove(api.currentModel);
        disposeCollected(collectResources(api.currentModel));
        api.currentModel = null;
      }
    }

    function applyLighting(lighting) {
      // studio：主光 + 半球填充；flat：只剩环境光。
      // 直接切换可见性，比重建光源更便宜，也方便读者对照两种预设下的画面。
      stage.hemi.visible = lighting === 'studio';
      stage.key.visible = lighting === 'studio';
      ambientFill.intensity = lighting === 'studio' ? 0.0 : 0.45;
    }

    async function load(source) {
      if (api.busy) {
        // 初始 load 还在跑时，apply 又送来了新的 source：先记下，等当前 load 完成再补。
        api.pendingSource = source;
        return;
      }
      api.busy = true;

      clearCurrent();
      api.currentSource = source;
      api.pendingSource = null;
      state.sourceLabel = SOURCE_LABELS[source] || source;
      state.status = '加载中…';
      state.progress = '0%';
      state.meshes = '—';
      state.boxSize = '—';
      state.error = '—';
      stage.renderOnce();

      let url = null;
      try {
        if (source === 'sample') {
          url = await makeSampleGlbUrl();
        } else if (source === 'missing') {
          url = '/nonexistent/viewer-sample.glb';
        } else if (source === 'corrupt') {
          url = makeCorruptUrl();
        }
      } catch (err) {
        state.status = '构造 URL 失败';
        state.error = err.message;
        api.busy = false;
        stage.renderOnce();
        return;
      }

      // LoadingManager 是 loader 与进度回调之间的纽带：构造时传入 manager，
      // GLTFLoader 内部的 TextureLoader 等子加载器都会向它汇报进度。
      const manager = new THREE.LoadingManager();
      manager.onProgress = (itemUrl, loaded, total) => {
        // loaded/total 是字节数；onProgress 不一定每帧都触发，但每次都反映真实下载进度。
        const ratio = total > 0 ? loaded / total : 0;
        state.progress = `${Math.round(ratio * 100)}%`;
        stage.renderOnce();
      };
      manager.onError = (itemUrl) => {
        // 单个依赖文件失败时触发；主 URL 失败由 loadAsync 的 catch 捕获。
        state.error = `依赖加载失败：${itemUrl}`;
      };

      const loader = new GLTFLoader(manager);

      try {
        const gltf = await loader.loadAsync(url);
        api.currentModel = gltf.scene;
        stage.modelRoot.add(gltf.scene);

        // 加载完成后用 Box3 重新取景：模型可能偏离原点、单位过大或过小，
        // 不先算包围盒就直接渲染，相机很可能看不到任何东西。
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const fit = fitCameraToBox(stage.camera, stage.controls, box);

        let meshCount = 0;
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            meshCount += 1;
          }
        });

        state.status = '加载成功';
        state.progress = '100%';
        state.meshes = String(meshCount);
        state.boxSize = formatVector(fit.size);
        state.cameraDistance = fit.distance.toFixed(2);
        state.error = '—';
      } catch (err) {
        // 进度不重置：保留最后一次 onProgress 写入的下载比例，
        // 让读者看到"下载完成但解析失败"（corrupt 走到 100%）与"根本下载不到"（missing 可能停在低百分比）的差别。
        state.status = '加载失败';
        state.error = describeError(err);
      } finally {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
        api.busy = false;

        // 如果在这次 load 跑的过程中 apply 又送来了不同的 source，现在补上。
        const pending = api.pendingSource;
        api.pendingSource = null;
        if (pending && pending !== api.currentSource) {
          load(pending);
        } else {
          stage.renderOnce();
        }
      }
    }

    function applyArgs(args) {
      const nextLighting = args && args.lighting ? args.lighting : 'studio';
      if (nextLighting !== api.currentLighting) {
        api.currentLighting = nextLighting;
        applyLighting(nextLighting);
      }

      // 阻尼与自动旋转都依赖 controls.update 每帧推进；舞台的渲染循环已经调用，
      // 这里只切换开关，让读者在交互中观察阻尼是否生效。
      stage.controls.enableDamping = !!(args && args.damping !== undefined ? args.damping : true);
      stage.controls.autoRotate = !!(args && args.autoRotate !== undefined ? args.autoRotate : false);
      stage.controls.autoRotateSpeed = 1.4;

      const nextSource = args && args.source ? args.source : 'sample';
      if (nextSource !== api.currentSource) {
        load(nextSource);
        return;
      }

      stage.renderOnce();
    }

    api.applyArgs = applyArgs;
    // currentLighting 故意留 null，让首次 applyArgs 一定触发 applyLighting，
    // 把 ambientFill 的强度和 hemi/key 的可见性切到 studio 默认值。
    applyArgs({ source: 'sample', lighting: 'studio', damping: true, autoRotate: false });

    return api;
  },

  apply(instance, args) {
    instance.applyArgs(args);
  },

  readout(snapshot) {
    return [
      ['加载源', snapshot.sourceLabel],
      ['状态', snapshot.status],
      ['进度', snapshot.progress],
      ['Mesh 数', snapshot.meshes],
      ['包围盒尺寸', snapshot.boxSize],
      ['相机到 target', snapshot.cameraDistance],
      ['错误', snapshot.error]
    ];
  }
};
