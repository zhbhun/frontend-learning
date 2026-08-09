/**
 * 范例：演示 Node 父子层级的"父动子动"与启用状态沿链传播。
 * 输入：
 *   - parentRotationY：父节点 TransformNode 绕 Y 轴旋转的角度（度）。
 *   - parentEnabled：父节点 setEnabled 的开关。
 * 主要操作：
 *   - 父节点绕 Y 旋转，子立方体挂在父节点下、局部 position 恒为 (3, 0, 0)；世界坐标随父级改变。
 *   - 切换父节点 setEnabled：OFF 时父节点下的整棵子树（arm、子立方体、nose）从画面消失——
 *     禁用沿父子链传播，子节点自身并未单独 setEnabled。
 * 预期结果：readout 显示子节点局部位置恒定、世界位置随父级旋转变化；enabled OFF 时整组不可见。
 * 阅读主线：createBabylonRuntime 的 setup 里看对象创建与父子挂载（均用 parent =）→ onBeforeRenderObservable 里看矩阵刷新与 emit。
 */
import {
  ArcRotateCamera,
  AxesViewer,
  Color3,
  Color4,
  HemisphericLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';

export interface NodeOptions {
  parentRotationY: number; // 度
  parentEnabled: boolean;
}

export interface NodeSnapshot {
  parentRotationY: number;
  parentEnabled: string;
  childLocal: string;
  childWorld: string;
}

export interface NodeInstance {
  update(options: NodeOptions): void;
  dispose(): void;
}

// 把 Vector3 格式化成 (x, y, z) 两位小数，便于 readout 阅读。
function formatVector(v: Vector3): string {
  return `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;
}

export function createNodeExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: NodeSnapshot) => void,
): NodeInstance {
  let current: NodeOptions = {
    parentRotationY: 0,
    parentEnabled: true,
  };

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.93, 0.95, 0.94, 1);

    // ArcRotateCamera：绕原点的轨道相机，鼠标/触摸可拖动调整观察方向。
    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2.2,
      Math.PI / 2.7,
      9,
      Vector3.Zero(),
      scene,
    );
    camera.minZ = 0.1;
    camera.attachControl(canvas, true);

    new HemisphericLight('light', new Vector3(0.4, 1, 0.3), scene);

    // 世界原点参考：灰色小球挂在场景根下（parent=null），不随父级旋转。
    const origin = MeshBuilder.CreateSphere('origin', { diameter: 0.4 }, scene);
    const originMat = new StandardMaterial('originMat', scene);
    originMat.diffuseColor = new Color3(0.6, 0.6, 0.6);
    originMat.backFaceCulling = false;
    origin.material = originMat;

    // 父节点：TransformNode 只承担变换、不参与渲染。绕 Y 旋转展示"父动子动"。
    const parent = new TransformNode('parent', scene);

    // 父级 +X 臂：薄长方体挂在父节点下，从原点延伸到子节点，可视化父级的局部 +X 方向。
    const arm = MeshBuilder.CreateBox(
      'arm',
      { width: 3, height: 0.04, depth: 0.04 },
      scene,
    );
    const armMat = new StandardMaterial('armMat', scene);
    armMat.diffuseColor = new Color3(0.75, 0.72, 0.68);
    armMat.backFaceCulling = false;
    arm.material = armMat;
    arm.parent = parent;
    arm.position.set(1.5, 0, 0); // 局部 (1.5, 0, 0)：从原点延伸到子节点 (3, 0, 0)

    // 子节点：蓝色立方体挂在父节点下，局部位置恒为 (3, 0, 0)。
    const child = MeshBuilder.CreateBox('child', { size: 0.9 }, scene);
    const childMat = new StandardMaterial('childMat', scene);
    childMat.diffuseColor = new Color3(0.24, 0.45, 0.85);
    childMat.backFaceCulling = false;
    child.material = childMat;
    child.parent = parent;
    child.position.set(3, 0, 0);

    // nose：红色小块挂在子节点 +Z 面，标识子节点的朝向（随父级旋转而转向）。
    const nose = MeshBuilder.CreateBox('nose', { size: 0.3 }, scene);
    const noseMat = new StandardMaterial('noseMat', scene);
    noseMat.diffuseColor = new Color3(0.92, 0.32, 0.28);
    noseMat.backFaceCulling = false;
    nose.material = noseMat;
    nose.parent = child;
    nose.position.set(0, 0, 0.6);

    // 世界轴：在原点显示长度为 2.5 的三色轴（红 X / 绿 Y / 蓝 Z），便于核对朝向。
    new AxesViewer(scene, 2.5);

    scene.onBeforeRenderObservable.add(() => {
      // rotation.y 单位是弧度：度数先乘以 Math.PI / 180。
      parent.rotation.y = (current.parentRotationY * Math.PI) / 180;

      // setEnabled 的禁用状态沿父子链传播：父节点 OFF 时，arm/子立方体/nose 整组从渲染中跳过。
      parent.setEnabled(current.parentEnabled);

      // 读取世界坐标前强制刷新世界矩阵（内部会递归刷新父级链），避免读到上一帧旧值。
      child.computeWorldMatrix(true);
      const world = child.getAbsolutePosition();

      emit({
        parentRotationY: current.parentRotationY,
        parentEnabled: current.parentEnabled ? 'ON' : 'OFF',
        childLocal: formatVector(child.position),
        childWorld: formatVector(world),
      });
    });

    return scene;
  });

  return {
    update(options) {
      current = options;
    },
    dispose() {
      runtime.dispose();
    },
  };
}
