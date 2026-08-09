/**
 * 范例：Babylon.js 指针事件与拾取。
 * 输入：
 *   - pickFilter：'all' | 'boxes' | 'spheres' —— 作为 MeshPredicate，在 scene.pick 与
 *     onPointerObservable 的 pickInfo 读出后双层过滤可拾取对象，演示 predicate 的作用。
 *   - selectOn：'pick' | 'tap' —— 选中事件分别绑到 PointerEventTypes.POINTERPICK（mesh 被按下再松开）
 *     或 PointerEventTypes.POINTERTAP（同一对象上 tap，无拖动）。两者默认都会带 pickInfo。
 * 主要操作：
 *   - buildStage 搭 5 个盒子 + 5 个球，每个对象单独克隆材质才能单独换 emissive 高亮。
 *   - scene.onPointerObservable.add((pi) => ...) 监听 POINTERMOVE / POINTERPICK / POINTERTAP：
 *     POINTERMOVE 更新 hover；POINTERPICK / POINTERTAP 按 selectOn 更新 selected。
 *     pi.pickInfo 在 POINTERMOVE/PICK/TAP 上已带 hit/pickedMesh/pickedPoint。
 *   - onBeforeRenderObservable 里按固定顺序应用高亮：重置 emissive → 选中 → hover
 *     （hover 与选中重合时跳过 hover，让选中色保持可见），并 emit 派生读数。
 * 预期结果：
 *   - 鼠标悬停时被命中对象 emissive 变黄；点击后变红（持续）；点空地清空选中。
 *   - 切到 pickFilter=boxes 后，球类不再响应 hover/click（predicate 过滤掉）。
 *   - 切到 selectOn=tap 后，选中改由 POINTERTAP 触发（按下不松开不选中，松开才触发）。
 *   - ArcRotateCamera 已 attachControl：在画布上拖拽会旋转相机，松开时不再触发 POINTERPICK
 *     （pickedDownMesh 与 pickedUpMesh 已不一致），这正是相机消费指针的副作用。
 * 阅读主线：buildStage（场景与可拾取对象）→ onPointerObservable（事件分发）
 *           → applyHighlight（每帧高亮顺序）→ emit（readout 字段）。
 */
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';
import {
  AbstractMesh,
  ArcRotateCamera,
  Color3,
  Color4,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Observer,
  PickingInfo,
  PointerEventTypes,
  PointerInfo,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';

export type PickFilter = 'all' | 'boxes' | 'spheres';
export type SelectOn = 'pick' | 'tap';

export interface PickExampleOptions {
  pickFilter: PickFilter;
  selectOn: SelectOn;
}

export interface PickExampleSnapshot {
  lastEvent: string;
  pointerX: number;
  pointerY: number;
  hitName: string;
  hitPoint: string;
  hitDistance: number;
  hoverName: string;
  selectedName: string;
}

export interface PickExampleInstance {
  update(options: PickExampleOptions): void;
  dispose(): void;
}

const BOX_BASE = new Color3(0.24, 0.45, 0.85);
const SPHERE_BASE = new Color3(0.3, 0.7, 0.36);
const HOVER_COLOR = new Color3(1.0, 0.82, 0.2);
const SELECT_COLOR = new Color3(0.92, 0.25, 0.2);

// 用 Map 而不是 mesh.metadata，避免 any 类型在重置 emissive 时丢失类型保护。
const baseColorOf = new Map<Mesh, Color3>();

function buildRow(
  prefix: 'box' | 'sphere',
  count: number,
  baseColor: Color3,
  scene: Scene,
  posAt: (i: number) => Vector3,
  isBox: boolean,
): Mesh[] {
  const meshes: Mesh[] = [];
  for (let i = 0; i < count; i++) {
    const m = isBox
      ? MeshBuilder.CreateBox(`${prefix}${i}`, { size: 1 }, scene)
      : MeshBuilder.CreateSphere(`${prefix}${i}`, { diameter: 1.1 }, scene);
    // 单独克隆材质：hover/选中要单独换 emissive，共享 material 会一并染色。
    const mat = new StandardMaterial(`${prefix}Mat${i}`, scene);
    mat.diffuseColor.copyFrom(baseColor);
    mat.emissiveColor.copyFrom(baseColor);
    m.material = mat;
    m.position.copyFrom(posAt(i));
    baseColorOf.set(m, baseColor.clone());
    meshes.push(m);
  }
  return meshes;
}

export function createPointerPickExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PickExampleSnapshot) => void,
): PickExampleInstance {
  let current: PickExampleOptions = { pickFilter: 'all', selectOn: 'pick' };

  // hover 跟随指针移动；selected 持久保留到下一次点击其他对象或点空地。
  // 用 AbstractMesh（pickedMesh 的声明类型）避免不必要的下转；本课只挂 Mesh，
  // 运行时类型必然是 Mesh，但读写 material / name / position 等只需 AbstractMesh。
  let hoverMesh: AbstractMesh | null = null;
  let selectedMesh: AbstractMesh | null = null;

  // 最近一次事件的派生读数。POINTERMOVE 在每帧更新；POINTERPICK/TAP 在事件回调里更新。
  let lastEventLabel = '（尚无事件）';
  let lastHitName = '—';
  let lastHitPoint = '—';
  let lastHitDistance = 0;

  // 在 setup 期间赋值（createBabylonRuntime 同步执行 setup）。
  let pointerObserver: Observer<PointerInfo> | null = null;
  let activeScene!: Scene;

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.93, 0.95, 0.94, 1);
    activeScene = scene;

    // attachControl 后相机也会消费指针：左键拖拽旋转、滚轮缩放、右键/Ctrl+左键平移。
    // 拖拽时 pickedDownMesh 与 pickedUpMesh 不一致，POINTERPICK 不会被触发——
    // 这是相机控制与点击选中天然共存的机制，不需要手动区分点击与拖动。
    const camera = new ArcRotateCamera(
      'cam',
      -Math.PI / 2.2,
      Math.PI / 2.6,
      13,
      new Vector3(0, 0.4, 0),
      scene,
    );
    camera.minZ = 0.1;
    camera.lowerRadiusLimit = 5;
    camera.attachControl(canvas, true);

    new HemisphericLight('hemi', new Vector3(0.4, 1, 0.3), scene);

    // 地面仅作视觉参照，isPickable=false 让默认 predicate 直接跳过它。
    const ground = MeshBuilder.CreateGround('ground', { width: 16, height: 10 }, scene);
    const groundMat = new StandardMaterial('groundMat', scene);
    groundMat.diffuseColor = new Color3(0.82, 0.83, 0.8);
    groundMat.emissiveColor = new Color3(0.18, 0.19, 0.18);
    ground.material = groundMat;
    ground.isPickable = false;

    const boxes = buildRow(
      'box',
      5,
      BOX_BASE,
      scene,
      (i) => new Vector3(-4 + i * 2, 0.5, -1.6),
      true,
    );
    const spheres = buildRow(
      'sphere',
      5,
      SPHERE_BASE,
      scene,
      (i) => new Vector3(-4 + i * 2, 0.6, 1.6),
      false,
    );

    // MeshPredicate 签名 (mesh, thinInstanceIndex) => boolean。
    // scene.pick 的默认 predicate 还要求 mesh.isEnabled() && isVisible && isPickable；
    // 这里在默认之外再加名字过滤，让读者切 pickFilter 后直接看到 predicate 生效。
    function matchesFilter(mesh: AbstractMesh): boolean {
      if (current.pickFilter === 'boxes' && !mesh.name.startsWith('box')) return false;
      if (current.pickFilter === 'spheres' && !mesh.name.startsWith('sphere')) return false;
      return true;
    }

    // onPointerObservable 是 5.1 Observable 在指针上的应用：add 返回 Observer，
    // 用它显式 remove 才能保证切场景或 dispose 时不再回调。
    pointerObserver = scene.onPointerObservable.add((pi) => {
      // pi.type 是 PointerEventTypes 的位常量；pickInfo 在 MOVE/PICK/TAP 上已带命中信息。
      const pickInfo = pi.pickInfo;
      switch (pi.type) {
        case PointerEventTypes.POINTERMOVE:
          lastEventLabel = 'POINTERMOVE';
          if (pickInfo?.hit && pickInfo.pickedMesh && matchesFilter(pickInfo.pickedMesh)) {
            hoverMesh = pickInfo.pickedMesh;
          } else {
            hoverMesh = null;
          }
          break;
        case PointerEventTypes.POINTERPICK:
          // POINTERPICK：在 mesh 上按下并松开（无拖动）时触发，pickInfo 必命中。
          lastEventLabel = 'POINTERPICK';
          recordHit(pickInfo);
          if (current.selectOn === 'pick') {
            applySelection(pickInfo);
          }
          break;
        case PointerEventTypes.POINTERTAP:
          // POINTERTAP：与 PICK 同源（同对象 down+up），分发时机由内部 click 检测决定。
          lastEventLabel = 'POINTERTAP';
          recordHit(pickInfo);
          if (current.selectOn === 'tap') {
            applySelection(pickInfo);
          }
          break;
        // POINTERDOWN/UP/WHEEL 不改变 hover/selected；POINTERDOWN 触发相机拖拽起点，
        // 此时 pickedDownMesh 已记录，但用户是否松开于同一对象决定 PICK/TAP 是否后续触发。
      }
    });

    function applySelection(pickInfo: PickingInfo | null) {
      if (pickInfo?.hit && pickInfo.pickedMesh && matchesFilter(pickInfo.pickedMesh)) {
        selectedMesh = pickInfo.pickedMesh;
      } else {
        selectedMesh = null; // 点空地（被 predicate 排除也算"未命中"）取消选中
      }
    }

    function recordHit(pickInfo: PickingInfo | null) {
      if (pickInfo?.hit && pickInfo.pickedMesh && matchesFilter(pickInfo.pickedMesh)) {
        lastHitName = pickInfo.pickedMesh.name;
        const p = pickInfo.pickedPoint;
        lastHitPoint = p ? `(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})` : '—';
        lastHitDistance = Math.round(pickInfo.distance * 100) / 100;
      } else {
        lastHitName = '—';
        lastHitPoint = '—';
        lastHitDistance = 0;
      }
    }

    // 每帧把 hover/选中状态应用到材质上：重置 → 选中 → hover。
    // 同一对象同时被 hover 和选中时跳过 hover，让选中色保持可见。
    scene.onBeforeRenderObservable.add(() => {
      for (const mesh of [...boxes, ...spheres]) {
        const mat = mesh.material as StandardMaterial;
        const base = baseColorOf.get(mesh)!;
        mat.emissiveColor.copyFrom(base);
      }
      if (selectedMesh) {
        (selectedMesh.material as StandardMaterial).emissiveColor.copyFrom(SELECT_COLOR);
      }
      if (hoverMesh && hoverMesh !== selectedMesh) {
        (hoverMesh.material as StandardMaterial).emissiveColor.copyFrom(HOVER_COLOR);
      }

      emit({
        lastEvent: lastEventLabel,
        pointerX: Math.round(scene.pointerX),
        pointerY: Math.round(scene.pointerY),
        hitName: lastHitName,
        hitPoint: lastHitPoint,
        hitDistance: lastHitDistance,
        hoverName: hoverMesh?.name ?? '—',
        selectedName: selectedMesh?.name ?? '—',
      });
    });

    return scene;
  });

  return {
    update(options) {
      current = options;
      // 切 filter 后，被新 predicate 排除的对象立即清出 hover/selected，避免读数与画面不一致。
      if (hoverMesh && !passesFilter(options.pickFilter, hoverMesh)) hoverMesh = null;
      if (selectedMesh && !passesFilter(options.pickFilter, selectedMesh)) selectedMesh = null;
    },
    dispose() {
      // 显式 remove 指针 observer：scene.dispose 会清空所有 observable，这里单独 remove
      // 是为了演示 5.1 Observable 课讲的"每个 add 都对应一次 remove"——
      // 在不 dispose 整个 scene 时（例如热替换场景）必须手动清理。
      pointerObserver?.remove();
      pointerObserver = null;
      activeScene?.onBeforeRenderObservable.clear();
      runtime.dispose();
    },
  };
}

function passesFilter(filter: PickFilter, mesh: AbstractMesh): boolean {
  if (filter === 'boxes') return mesh.name.startsWith('box');
  if (filter === 'spheres') return mesh.name.startsWith('sphere');
  return true;
}
