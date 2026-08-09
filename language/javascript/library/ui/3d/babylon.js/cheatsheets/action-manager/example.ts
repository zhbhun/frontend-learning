/**
 * 范例：Babylon.js Action Manager——声明式触发动作，对比 Observable 命令式回调。
 * 输入：
 *   - mode: 'actionManager' | 'observable'
 *     actionManager 模式给每个 mesh 挂自己的 ActionManager，注册 OnPickTrigger /
 *     OnPointerOverTrigger / OnPointerOutTrigger + ExecuteCodeAction；
 *     observable 模式用单个 scene.onPointerObservable 订阅实现相同视觉反馈。
 *     两种模式共用同一条拾取管线，只是 API 风格不同。
 * 主要操作：
 *   - setup 建 3 个 mesh（盒子/球/圆环），每个有独立材质和 state
 *     （kind/baseColor/colorIndex/spin/scaleTarget/hovered）。
 *   - applyMode(mode)：actionManager 模式给每个 mesh 挂 ActionManager；observable 模式
 *     挂单个 onPointerObservable 订阅。业务逻辑（改色/旋转/缩放）由 handlePick 统一处理，
 *     两种模式只是"事件怎么到达 handlePick"不同。
 *   - onBeforeRenderObservable 每帧应用 hover 高亮 + 旋转/缩放 + emit 派生读数。
 * 预期结果：
 *   - 点击盒子循环改色；点击球切换旋转；点击圆环切换放大。
 *   - 悬停 emissive 提亮 + 微放大；移出还原。
 *   - 切模式后视觉一致，但读数「最近触发器」在 ActionManager 模式显示 OnPickTrigger 等，
 *     在 Observable 模式显示 POINTERPICK/POINTERMOVE；「已注册动作数」9 → 1。
 * 阅读主线：createActionManagerExample（状态）→ setup（场景 + emit observer）
 *           → attachActionManagers / attachObservable（两种分发层）→ handlePick（共用业务逻辑）。
 */
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';
import {
  AbstractMesh,
  ActionEvent,
  ActionManager,
  ArcRotateCamera,
  Color3,
  Color4,
  ExecuteCodeAction,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Observer,
  PointerEventTypes,
  PointerInfo,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';

export type InteractionMode = 'actionManager' | 'observable';

export interface ActionExampleOptions {
  mode: InteractionMode;
}

export interface ActionExampleSnapshot {
  mode: string;
  lastTrigger: string;
  lastTarget: string;
  lastAction: string;
  registeredCount: number;
}

export interface ActionExampleInstance {
  update(options: ActionExampleOptions): void;
  dispose(): void;
}

type MeshKind = 'box' | 'sphere' | 'torus';

interface MeshState {
  kind: MeshKind;
  baseColor: Color3;
  colorIndex: number;   // 盒子调色板索引
  spin: boolean;        // 球是否自旋
  scaleTarget: number;  // 圆环目标缩放
  hovered: boolean;
}

// 盒子点击循环切换的自发光色。
const BOX_PALETTE: Color3[] = [
  new Color3(0.24, 0.45, 0.85),
  new Color3(0.92, 0.25, 0.2),
  new Color3(0.3, 0.7, 0.36),
  new Color3(0.95, 0.82, 0.2),
];
const SPHERE_BASE = new Color3(0.55, 0.35, 0.78);
const TORUS_BASE = new Color3(0.2, 0.65, 0.78);
const HOVER_BOOST = 1.6;    // 悬停时 emissive 乘数
const HOVER_SCALE = 1.12;   // 悬停时均匀放大
const TORUS_SCALE_BIG = 1.45;

export function createActionManagerExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ActionExampleSnapshot) => void,
): ActionExampleInstance {
  let current: ActionExampleOptions = { mode: 'actionManager' };

  const states = new Map<AbstractMesh, MeshState>();
  let meshes: Mesh[] = [];

  // 派生读数
  let lastTrigger = '（尚无事件）';
  let lastTarget = '—';
  let lastAction = '—';
  let registeredCount = 0;

  // Observable 模式的订阅句柄；emit observer 在 setup 里赋值，dispose 里 remove。
  let pointerObserver: Observer<PointerInfo> | null = null;
  let emitObs: Observer<Scene> | null = null;
  let activeScene!: Scene;

  function report(trigger: string, target: string, action: string) {
    lastTrigger = trigger;
    lastTarget = target;
    lastAction = action;
  }

  // 共用业务逻辑：两种模式都走这里，体现"分发层不同、行为一致"。
  function handlePick(target: AbstractMesh): string {
    const st = states.get(target);
    if (!st) return '—';
    switch (st.kind) {
      case 'box': {
        st.colorIndex = (st.colorIndex + 1) % BOX_PALETTE.length;
        st.baseColor = BOX_PALETTE[st.colorIndex];
        const c = st.baseColor;
        return `改色 → (${c.r.toFixed(2)}, ${c.g.toFixed(2)}, ${c.b.toFixed(2)})`;
      }
      case 'sphere':
        st.spin = !st.spin;
        return st.spin ? '开始旋转' : '停止旋转';
      case 'torus':
        st.scaleTarget = st.scaleTarget > 1 ? 1.0 : TORUS_SCALE_BIG;
        return `缩放目标 → ${st.scaleTarget.toFixed(2)}`;
    }
  }

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.93, 0.95, 0.94, 1);
    activeScene = scene;

    const camera = new ArcRotateCamera(
      'cam',
      -Math.PI / 2,
      Math.PI / 2.6,
      9,
      new Vector3(0, 0.3, 0),
      scene,
    );
    camera.minZ = 0.1;
    camera.lowerRadiusLimit = 5;
    camera.attachControl(canvas, true);

    new HemisphericLight('hemi', new Vector3(0.4, 1, 0.3), scene);

    // 地面只做视觉参照，isPickable=false 让默认拾取直接跳过，不挡交互。
    const ground = MeshBuilder.CreateGround('ground', { width: 14, height: 8 }, scene);
    const groundMat = new StandardMaterial('groundMat', scene);
    groundMat.diffuseColor = new Color3(0.82, 0.83, 0.8);
    groundMat.emissiveColor = new Color3(0.18, 0.19, 0.18);
    ground.material = groundMat;
    ground.isPickable = false;

    meshes = [
      makeMesh('box', new Vector3(-3, 0.6, 0), BOX_PALETTE[0], scene, states),
      makeMesh('sphere', new Vector3(0, 0.7, 0), SPHERE_BASE, scene, states),
      makeMesh('torus', new Vector3(3, 0.5, 0), TORUS_BASE, scene, states),
    ];

    // 每帧应用 hover 高亮 + 旋转/缩放 + emit 读数。
    // ActionManager 只声明"事件改了什么状态"，每帧由这里把状态应用回材质/变换。
    emitObs = scene.onBeforeRenderObservable.add(() => {
      const dt = engine.getDeltaTime() / 1000;
      for (const m of meshes) {
        const st = states.get(m)!;
        const mat = m.material as StandardMaterial;
        mat.emissiveColor.copyFrom(st.baseColor.scale(st.hovered ? HOVER_BOOST : 1.0));

        if (st.spin) m.rotation.y += 1.5 * dt;

        // 目标缩放 = 悬停微放大 × 圆环点击放大；用指数趋近平滑插值。
        const targetScale =
          (st.hovered ? HOVER_SCALE : 1.0) * (st.kind === 'torus' ? st.scaleTarget : 1.0);
        const next = m.scaling.x + (targetScale - m.scaling.x) * Math.min(1, dt * 8);
        m.scaling.setAll(next);
      }

      emit({
        mode: current.mode === 'actionManager' ? 'ActionManager' : 'Observable',
        lastTrigger,
        lastTarget,
        lastAction,
        registeredCount,
      });
    });

    return scene;
  });

  // —— ActionManager 模式：每个 mesh 挂自己的 ActionManager，声明式注册触发器 → 动作 ——
  function attachActionManagers() {
    registeredCount = 0;
    for (const m of meshes) {
      const am = new ActionManager(activeScene);
      m.actionManager = am;

      // OnPickTrigger：点击触发。evt.source 是触发的 mesh，evt.sourceEvent 是 DOM 事件。
      am.registerAction(
        new ExecuteCodeAction(ActionManager.OnPickTrigger, (evt: ActionEvent) => {
          report('OnPickTrigger', evt.source.name, handlePick(evt.source as AbstractMesh));
        }),
      );
      // OnPointerOverTrigger：指针进入 mesh 包围，引擎用同一套拾取判定。
      am.registerAction(
        new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, (evt: ActionEvent) => {
          const t = evt.source as AbstractMesh;
          states.get(t)!.hovered = true;
          report('OnPointerOverTrigger', t.name, '悬停高亮');
        }),
      );
      // OnPointerOutTrigger：指针离开 mesh。
      am.registerAction(
        new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, (evt: ActionEvent) => {
          const t = evt.source as AbstractMesh;
          states.get(t)!.hovered = false;
          report('OnPointerOutTrigger', t.name, '移出还原');
        }),
      );
      registeredCount += 3;
    }
  }

  function detachActionManagers() {
    for (const m of meshes) {
      m.actionManager = null; // 置 null 后引擎不再为该 mesh 处理触发器
    }
    registeredCount = 0;
  }

  // —— Observable 模式：单个 scene.onPointerObservable 订阅，命令式分发 ——
  function attachObservable() {
    pointerObserver = activeScene.onPointerObservable.add((pi) => {
      const info = pi.pickInfo;
      const picked = info?.hit ? info.pickedMesh : null;
      switch (pi.type) {
        case PointerEventTypes.POINTERMOVE:
          // 命令式维护 hover：命中的置 hovered=true，其余 false。
          // 与 ActionManager 的 OnPointerOver/Out 不同，这里只有 POINTERMOVE，
          // over/out 要自己从"上一帧谁被 hover"推出来——这是声明式与命令式的核心差别。
          for (const m of meshes) {
            const st = states.get(m)!;
            if (m === picked) {
              if (!st.hovered) {
                st.hovered = true;
                report('POINTERMOVE', m.name, '悬停高亮（推断 over）');
              }
            } else if (st.hovered) {
              st.hovered = false;
              report('POINTERMOVE', m.name, '移出（推断 out）');
            }
          }
          break;
        case PointerEventTypes.POINTERPICK:
          if (picked) {
            report('POINTERPICK', picked.name, handlePick(picked));
          }
          break;
      }
    }, PointerEventTypes.POINTERMOVE | PointerEventTypes.POINTERPICK);
    registeredCount = 1; // 单个订阅实现全部 hover/click
  }

  function detachObservable() {
    if (pointerObserver) {
      activeScene.onPointerObservable.remove(pointerObserver);
      pointerObserver = null;
    }
    registeredCount = 0;
  }

  function applyMode(mode: InteractionMode) {
    detachActionManagers();
    detachObservable();
    // 切模式时清空 hover，避免上一模式的状态残留。
    for (const m of meshes) states.get(m)!.hovered = false;
    if (mode === 'actionManager') attachActionManagers();
    else attachObservable();
  }

  applyMode(current.mode);

  return {
    update(options) {
      if (options.mode !== current.mode) {
        current = options;
        applyMode(current.mode);
      }
    },
    dispose() {
      detachActionManagers();
      detachObservable();
      emitObs?.remove();
      emitObs = null;
      activeScene?.onBeforeRenderObservable.clear();
      runtime.dispose();
    },
  };
}

function makeMesh(
  kind: MeshKind,
  pos: Vector3,
  baseColor: Color3,
  scene: Scene,
  states: Map<AbstractMesh, MeshState>,
): Mesh {
  const m =
    kind === 'box'
      ? MeshBuilder.CreateBox(kind, { size: 1.1 }, scene)
      : kind === 'sphere'
        ? MeshBuilder.CreateSphere(kind, { diameter: 1.2 }, scene)
        : MeshBuilder.CreateTorus(kind, { diameter: 1.3, thickness: 0.4, tessellation: 32 }, scene);
  const mat = new StandardMaterial(`${kind}Mat`, scene);
  mat.diffuseColor.copyFrom(baseColor);
  mat.emissiveColor.copyFrom(baseColor);
  m.material = mat;
  m.position.copyFrom(pos);
  states.set(m, {
    kind,
    baseColor: baseColor.clone(),
    colorIndex: 0,
    spin: false,
    scaleTarget: 1.0,
    hovered: false,
  });
  return m;
}
