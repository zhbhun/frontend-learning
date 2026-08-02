/*
演示 Raycaster 拾取的最小可观察闭环：hover 高亮、click 选中、选中态与 hover 态视觉区分，
并覆盖普通 Mesh 与 InstancedMesh 两种命中结果。

输入是鼠标位置（直接挂在 canvas 上的 pointer 事件）和 recursive 开关；操作后命中对象的
hover / 选中状态变化，读数显示当前命中对象、最近一次 click 的距离、命中点世界坐标和 instanceId。
读文件时先看 updateRaycast()：pointer → setFromCamera → intersectObjects([group], recursive)，
命中数组的第 0 项就是离射线起点最近的对象；再看 refreshHighlight()：每帧重置所有对象到 base，
再依次叠加 selected 与 hovered，让"选中"和"悬停"在视觉上能分开。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

const HOVER_EMISSIVE = new THREE.Color('#ffd23f');
const HOVER_INTENSITY = 0.5;
const SELECT_EMISSIVE = new THREE.Color('#e8443a');
const SELECT_INTENSITY = 0.95;
const INSTANCE_HOVER = new THREE.Color('#ffd23f');
const INSTANCE_SELECT = new THREE.Color('#e8443a');

// 点击判定阈值：按下到松开的位移和时间小于这两个值才算 click，
// 用于过滤"按下后拖动再松开"造成的误触发。本场景没有相机控制器抢输入，
// 阈值只是为了让 click 行为符合直觉。
const CLICK_MAX_MOVE = 5; // CSS 像素
const CLICK_MAX_TIME = 500; // 毫秒

export function describeTarget(object, instanceId) {
  if (!object) return '—';
  if (object.isInstancedMesh && instanceId != null) {
    return `${object.name} #${instanceId}`;
  }
  return object.name || object.type;
}

function isSameTarget(a, b) {
  if (!a || !b) return false;
  if (a.object !== b.object) return false;
  return a.instanceId === b.instanceId;
}

export const raycasterExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 60);
    camera.position.set(6.2, 4.4, 8.2);
    camera.lookAt(0, 0.7, -0.4);

    scene.add(new THREE.GridHelper(16, 16, '#8ba096', '#d3ded7'));
    scene.add(new THREE.AxesHelper(2.2));
    scene.add(new THREE.HemisphereLight('#ffffff', '#78908a', 0.9));
    const key = new THREE.DirectionalLight('#ffffff', 1.7);
    key.position.set(5, 8, 6);
    scene.add(key);

    // 把所有可拾取对象放在同一个 Group 下，让 intersectObjects 的 recursive 参数有可见效果：
    // 对容器调用 intersectObjects([group], false) 不会下钻到子 Mesh，命中数为 0。
    const group = new THREE.Group();
    scene.add(group);

    const pickables = [];

    // 4 个普通 Mesh，userData 持有原始 emissive，每帧用来还原。
    const meshConfigs = [
      { name: 'Box',       geometry: new THREE.BoxGeometry(1.1, 1.1, 1.1),          color: '#3d73d9', position: [-3.4, 0.7, 1.2] },
      { name: 'Sphere',    geometry: new THREE.SphereGeometry(0.72, 32, 20),          color: '#d17832', position: [-1.15, 0.72, 1.2] },
      { name: 'Cone',      geometry: new THREE.ConeGeometry(0.72, 1.35, 28),          color: '#2f8b72', position: [1.15, 0.78, 1.2] },
      { name: 'TorusKnot', geometry: new THREE.TorusKnotGeometry(0.5, 0.18, 96, 16),  color: '#8f5ac7', position: [3.4, 0.85, 1.2] }
    ];
    meshConfigs.forEach((cfg, index) => {
      const material = new THREE.MeshStandardMaterial({
        color: cfg.color,
        roughness: 0.5,
        emissive: '#000000',
        emissiveIntensity: 0
      });
      const mesh = new THREE.Mesh(cfg.geometry, material);
      mesh.name = cfg.name;
      mesh.userData.baseEmissive = material.emissive.clone();
      mesh.position.set(...cfg.position);
      mesh.rotation.y = index * 0.4;
      group.add(mesh);
      pickables.push(mesh);
    });

    // 一组 InstancedMesh，演示命中结果里的 instanceId；每实例基础色保存在 userData 用于还原。
    const instanceGeometry = new THREE.IcosahedronGeometry(0.34, 0);
    const instanceMaterial = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.55,
      emissive: '#000000',
      emissiveIntensity: 0
    });
    const INSTANCE_COUNT = 16;
    const instancedMesh = new THREE.InstancedMesh(instanceGeometry, instanceMaterial, INSTANCE_COUNT);
    instancedMesh.name = 'Instances';
    const dummy = new THREE.Object3D();
    const baseInstanceColors = [];
    let instanceIndex = 0;
    for (let xi = 0; xi < 4; xi++) {
      for (let zi = 0; zi < 4; zi++) {
        dummy.position.set(-3 + xi * 2, 0.36, -2.4 + zi * 1.0);
        dummy.rotation.set(0, (xi + zi) * 0.3, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(instanceIndex, dummy.matrix);
        const color = new THREE.Color('#5aa0c4');
        baseInstanceColors[instanceIndex] = color.clone();
        instancedMesh.setColorAt(instanceIndex, color);
        instanceIndex++;
      }
    }
    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
    instancedMesh.computeBoundingSphere();
    instancedMesh.userData.baseInstanceColors = baseInstanceColors;
    group.add(instancedMesh);
    pickables.push(instancedMesh);

    // Raycaster 全程只创建一次，重复 setFromCamera + intersectObjects 即可。
    const raycaster = new THREE.Raycaster();
    // pointer 用 NDC（x、y 范围 [-1, 1]），初始放在屏幕外避免首帧误命中。
    const pointer = new THREE.Vector2(-2, -2);

    const state = {
      intersectRecursive: true,
      hovered: null,       // { object, instanceId? }
      selected: null,      // { object, instanceId? }
      pointerInView: false,
      lastClick: null,     // { objectName, distance, point, instanceId? }
      press: null          // pointerdown 时记录 { x, y, t }
    };

    function resetHighlight() {
      for (const obj of pickables) {
        if (obj.isInstancedMesh) {
          const colors = obj.userData.baseInstanceColors;
          for (let i = 0; i < colors.length; i++) {
            obj.setColorAt(i, colors[i]);
          }
          if (obj.instanceColor) obj.instanceColor.needsUpdate = true;
        } else {
          obj.material.emissive.copy(obj.userData.baseEmissive);
          obj.material.emissiveIntensity = 0;
        }
      }
    }

    function applyHighlight(target, type) {
      if (!target) return;
      const { object, instanceId } = target;
      if (object.isInstancedMesh && instanceId != null) {
        const color = type === 'select' ? INSTANCE_SELECT : INSTANCE_HOVER;
        object.setColorAt(instanceId, color);
        if (object.instanceColor) object.instanceColor.needsUpdate = true;
      } else {
        object.material.emissive.copy(type === 'select' ? SELECT_EMISSIVE : HOVER_EMISSIVE);
        object.material.emissiveIntensity =
          type === 'select' ? SELECT_INTENSITY : HOVER_INTENSITY;
      }
    }

    function refreshHighlight() {
      resetHighlight();
      applyHighlight(state.selected, 'select');
      // hovered 写在 selected 之后；如果两者指向同一对象就跳过，
      // 否则 hovered 会盖掉 selected 的红色，看不出"被选中"。
      if (state.hovered && !isSameTarget(state.hovered, state.selected)) {
        applyHighlight(state.hovered, 'hover');
      }
    }

    function updateRaycast() {
      if (!state.pointerInView) {
        if (state.hovered) state.hovered = null;
        refreshHighlight();
        return;
      }
      raycaster.setFromCamera(pointer, camera);
      // 把容器传给 intersectObjects，让 recursive 开关有可见效果。
      const hits = raycaster.intersectObjects([group], state.intersectRecursive);
      if (hits.length > 0) {
        const hit = hits[0];
        state.hovered = { object: hit.object, instanceId: hit.instanceId };
      } else {
        state.hovered = null;
      }
      refreshHighlight();
    }

    function setPointerFromEvent(event) {
      const rect = canvas.getBoundingClientRect();
      // clientX/Y 是 CSS 像素，rect 的尺寸也按 CSS 像素计算，
      // pixelRatio 由 renderer.setSize 处理，NDC 转换不需要再除一次。
      // Y 轴方向：DOM 是上为 0、下为正，NDC 是下为 -1、上为 1，所以取负。
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function onPointerMove(event) {
      setPointerFromEvent(event);
      state.pointerInView = true;
      updateRaycast();
    }

    function onPointerDown(event) {
      state.press = { x: event.clientX, y: event.clientY, t: performance.now() };
    }

    function onPointerUp(event) {
      const press = state.press;
      state.press = null;
      if (!press) return;
      const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y);
      const elapsed = performance.now() - press.t;
      // 位移过大或时间过长都判定为拖动，不触发 click。
      if (moved > CLICK_MAX_MOVE || elapsed > CLICK_MAX_TIME) return;
      setPointerFromEvent(event);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects([group], state.intersectRecursive);
      if (hits.length > 0) {
        const hit = hits[0];
        const target = { object: hit.object, instanceId: hit.instanceId };
        // 同一目标再点一次：取消选中；不同目标：切换选中。这是常见的"toggle"UX。
        if (isSameTarget(state.selected, target)) {
          state.selected = null;
        } else {
          state.selected = target;
        }
        state.lastClick = {
          objectName: describeTarget(target.object, target.instanceId),
          distance: hit.distance,
          point: hit.point.clone(),
          instanceId: hit.instanceId
        };
      } else {
        // 点空地：清空选中。读者最容易遇到的"为什么我点了一下选中消失了"就是这里。
        state.selected = null;
        state.lastClick = { objectName: '（无命中）', distance: null, point: null, instanceId: null };
      }
      refreshHighlight();
    }

    function onPointerLeave() {
      state.pointerInView = false;
      state.press = null;
      if (state.hovered) state.hovered = null;
      refreshHighlight();
    }

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);

    refreshHighlight();

    function frame(delta) {
      // 让画面有微动，让拾取读数有可见变化；转速慢到不会让命中点漂移过快。
      for (const obj of pickables) {
        if (!obj.isInstancedMesh) {
          obj.rotation.y += delta * 0.22;
        }
      }
      renderer.render(scene, camera);
      emitSnapshot({ state });
    }

    const loop = createRenderLoop(canvas, frame);
    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return {
      scene,
      group,
      pickables,
      state,
      loop,
      updateRaycast,
      cleanup() {
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointerleave', onPointerLeave);
      }
    };
  },

  apply(instance, args) {
    instance.state.intersectRecursive = args.intersectRecursive;
    // recursive 切换后立刻按当前 pointer 重算一次，否则要等下次 pointermove 才能看到差别。
    instance.updateRaycast();
    instance.loop.renderOnce();
  },

  readout({ state }) {
    const hovered = state.hovered
      ? describeTarget(state.hovered.object, state.hovered.instanceId)
      : '—';
    const selected = state.selected
      ? describeTarget(state.selected.object, state.selected.instanceId)
      : '—';
    const last = state.lastClick;
    const clickLabel = last
      ? `${last.objectName}${last.distance != null ? ` · d=${last.distance.toFixed(2)}` : ''}`
      : '—';
    const pointLabel =
      last && last.point
        ? `${last.point.x.toFixed(2)}, ${last.point.y.toFixed(2)}, ${last.point.z.toFixed(2)}`
        : '—';
    const instanceIdLabel =
      last && last.instanceId != null ? String(last.instanceId) : '—';
    return [
      ['当前 hover', hovered],
      ['当前选中', selected],
      ['最近 click', clickLabel],
      ['命中点 (world)', pointLabel],
      ['instanceId', instanceIdLabel]
    ];
  }
};
