/*
取景对照范例：演示"模型加载完后必须用 Box3 给相机和 controls.target 取景"。

framing 参数：
- fit：用 Box3 包围模型，把 controls.target 放到包围盒中心，按尺寸和 FOV 反算距离
- no-fit：故意不调用 fit，相机停在构造时的默认位置，模型落在哪里算哪里
- fit-no-target：取景时只动相机，故意不更新 controls.target，
  暴露"相机看的点和控制器旋转中心不是同一个"这条常见错配

读数显示模型包围盒中心、当前 target、target 是否落在模型上、相机到 target 距离，
让"漏掉 fit 或漏掉 target 同步"造成的偏差可观察。
*/

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

import {
  buildSampleModel,
  collectResources,
  createBoxHelper,
  createViewerStage,
  disposeCollected,
  fitCameraToBox,
  formatVector
} from './viewer-stage.js';

async function makeSampleGlbUrl() {
  const exporter = new GLTFExporter();
  const arrayBuffer = await exporter.parseAsync(buildSampleModel(), {
    binary: true
  });
  const blob = new Blob([arrayBuffer], { type: 'model/gltf-binary' });
  return URL.createObjectURL(blob);
}

const FRAMING_LABELS = {
  fit: '完整取景（Box3 → camera + target）',
  'no-fit': '不取景（停在默认位置）',
  'fit-no-target': '只动相机，不更新 target'
};

export const viewerFramingExample = {
  create(canvas, emitSnapshot) {
    const state = {
      framingLabel: '—',
      boxCenter: '—',
      target: '—',
      targetOnModel: '—',
      cameraDistance: '—',
      meshes: '—'
    };

    const stage = createViewerStage(canvas, () => state);
    stage.setSnapshotEmitter(() => {
      // controls.update() 总会让相机重新指向 target，所以"相机是否看向 target"恒为"是"，
      // 无法暴露 fit-no-target 的失败。这里改读"target 是否在模型中心"，
      // 把 controls.target 和模型包围盒中心的偏差作为可观察证据。
      state.target = formatVector(stage.controls.target);
      state.cameraDistance = stage.camera.position.distanceTo(stage.controls.target).toFixed(2);
      if (api.currentModel) {
        const box = new THREE.Box3().setFromObject(api.currentModel);
        const center = box.getCenter(new THREE.Vector3());
        const drift = center.distanceTo(stage.controls.target);
        state.targetOnModel = drift < 0.01 ? '是' : `偏 ${drift.toFixed(2)}`;
      } else {
        state.targetOnModel = '—';
      }
      emitSnapshot(state);
    });

    const api = {
      stage,
      currentModel: null,
      boxHelper: null,
      currentFraming: null,
      busy: false
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

    async function setup() {
      if (api.busy) {
        return;
      }
      api.busy = true;

      clearCurrent();
      state.framingLabel = '加载中…';
      state.boxCenter = '—';
      state.meshes = '—';
      stage.renderOnce();

      let url = null;
      try {
        url = await makeSampleGlbUrl();
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(url);
        api.currentModel = gltf.scene;
        stage.modelRoot.add(gltf.scene);

        const box = new THREE.Box3().setFromObject(gltf.scene);
        state.boxCenter = formatVector(box.getCenter(new THREE.Vector3()));

        let meshCount = 0;
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            meshCount += 1;
          }
        });
        state.meshes = String(meshCount);

        // 包围盒线框作为视觉证据：fit 时相机看向中心，no-fit 时相机可能根本看不到模型。
        api.boxHelper = createBoxHelper(box);
        stage.scene.add(api.boxHelper);
      } finally {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
        api.busy = false;
        applyFraming(api.currentFraming || 'fit');
      }
    }

    function applyFraming(framing) {
      api.currentFraming = framing;
      state.framingLabel = FRAMING_LABELS[framing] || framing;

      if (!api.currentModel) {
        stage.renderOnce();
        return;
      }

      const box = new THREE.Box3().setFromObject(api.currentModel);

      if (framing === 'fit') {
        // 正确做法：相机和 target 一起取景，控制器旋转中心就是模型中心。
        fitCameraToBox(stage.camera, stage.controls, box);
      } else if (framing === 'no-fit') {
        // 故意不动相机和 target：模型加载到偏离原点的位置，相机停在默认距离，
        // 模型可能完全不在视锥里，或只是远处的一个小点。
        stage.controls.target.set(0, 1, 0);
        stage.camera.position.set(4.4, 2.6, 4.4);
        stage.camera.lookAt(stage.controls.target);
        stage.camera.updateProjectionMatrix();
        stage.controls.update();
      } else if (framing === 'fit-no-target') {
        // 取景时只动相机，不更新 target：相机挪到模型附近，但控制器仍绕原点 (0,1,0) 旋转，
        // 拖动时模型会"滑出画面"，因为旋转中心不在模型上。
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const extent = Math.max(size.x, size.y, size.z);
        const halfFov = THREE.MathUtils.degToRad(stage.camera.fov) / 2;
        const distance = (extent / 2 / Math.tan(halfFov)) * 1.6;

        stage.camera.position.copy(center).addScaledVector(
          new THREE.Vector3(1, 0.55, 1).normalize(),
          distance
        );
        stage.camera.lookAt(center);
        stage.camera.updateProjectionMatrix();
        // 故意不调用 controls.target.copy(center) —— 这就是要暴露的失败路径。
        stage.controls.target.set(0, 1, 0);
        stage.controls.update();
      }

      stage.renderOnce();
    }

    api.setup = setup;
    api.applyFraming = applyFraming;
    setup();

    return api;
  },

  apply(instance, args) {
    const next = args && args.framing ? args.framing : 'fit';
    instance.applyFraming(next);
  },

  readout(snapshot) {
    return [
      ['取景策略', snapshot.framingLabel],
      ['模型中心', snapshot.boxCenter],
      ['controls.target', snapshot.target],
      ['target 在模型上', snapshot.targetOnModel],
      ['相机到 target', snapshot.cameraDistance],
      ['Mesh 数', snapshot.meshes]
    ];
  }
};
